import type { DataFormat } from "@/src/dataFormat";
import scrapeAwsData from "./scrapers/aws";
import scrapeMistralData from "./scrapers/mistral";
import scrapeGcpData from "./scrapers/gcp";
import scrapeAlibabaData from "./scrapers/alibaba";
import scrapeAnthropicData from "./scrapers/anthropic";
import scrapeIbmData from "./scrapers/ibm";
import scrapeOpenaiData from "./scrapers/openai";
import scrapeDeepseekData from "./scrapers/deepseek";
import scrapeForexData from "./scrapers/forex";
import scrapeAwsImageData from "./scrapers/aws-image";
import scrapeOpenaiImageData from "./scrapers/openai-image";
import scrapeGcpImageData from "./scrapers/gcp-image";
import scrapeAzureData from "./scrapers/azure";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const PRICE_CHANGE_THRESHOLD = 0.05; // 5% change triggers a warning

function detectPriceChanges(oldData: DataFormat, newData: DataFormat): void {
    let changesFound = false;

    for (const [modelId, newModel] of Object.entries(newData.models)) {
        const oldModel = oldData.models?.[modelId];
        if (!oldModel) continue;

        for (const newVendor of newModel.vendors) {
            const oldVendor = oldModel.vendors.find((v) => v.vendorRef === newVendor.vendorRef);
            if (!oldVendor) continue;

            for (const [region, [newInput, newOutput]] of Object.entries(newVendor.regionPricing)) {
                const oldPricing = oldVendor.regionPricing[region];
                if (!oldPricing) continue;
                const [oldInput, oldOutput] = oldPricing;

                const inputChange = Math.abs((newInput - oldInput) / oldInput);
                const outputChange = Math.abs((newOutput - oldOutput) / oldOutput);

                if (inputChange > PRICE_CHANGE_THRESHOLD || outputChange > PRICE_CHANGE_THRESHOLD) {
                    if (!changesFound) {
                        console.warn("\n⚠️  Price changes detected:");
                        changesFound = true;
                    }
                    if (inputChange > PRICE_CHANGE_THRESHOLD) {
                        console.warn(
                            `  ${modelId} @ ${newVendor.vendorRef}/${region}: input $${(oldInput * 1e6).toFixed(4)} → $${(newInput * 1e6).toFixed(4)} per 1M tokens (${(inputChange * 100).toFixed(1)}% change)`
                        );
                    }
                    if (outputChange > PRICE_CHANGE_THRESHOLD) {
                        console.warn(
                            `  ${modelId} @ ${newVendor.vendorRef}/${region}: output $${(oldOutput * 1e6).toFixed(4)} → $${(newOutput * 1e6).toFixed(4)} per 1M tokens (${(outputChange * 100).toFixed(1)}% change)`
                        );
                    }
                }
            }
        }
    }

    for (const [modelId, newModel] of Object.entries(newData.imageModels ?? {})) {
        const oldModel = oldData.imageModels?.[modelId];
        if (!oldModel) continue;

        for (const newVendor of newModel.vendors) {
            const oldVendor = oldModel.vendors.find((v) => v.vendorRef === newVendor.vendorRef);
            if (!oldVendor) continue;

            for (const [region, newTiers] of Object.entries(newVendor.regionPricing)) {
                const oldTiers = oldVendor.regionPricing[region];
                if (!oldTiers) continue;

                for (const newTier of newTiers) {
                    const oldTier = oldTiers.find((t) => t.resolution === newTier.resolution);
                    if (!oldTier) continue;

                    const change = Math.abs(
                        (newTier.pricePerImage - oldTier.pricePerImage) / oldTier.pricePerImage
                    );
                    if (change > PRICE_CHANGE_THRESHOLD) {
                        if (!changesFound) {
                            console.warn("\n⚠️  Price changes detected:");
                            changesFound = true;
                        }
                        console.warn(
                            `  ${modelId} @ ${newVendor.vendorRef}/${region} (${newTier.resolution}): $${oldTier.pricePerImage} → $${newTier.pricePerImage} per image (${(change * 100).toFixed(1)}% change)`
                        );
                    }
                }
            }
        }
    }

    if (!changesFound) {
        console.log("✓ No significant price changes detected.");
    }
}

async function main() {
    const selfPath = dirname(fileURLToPath(import.meta.url));
    const dataJsonPath = join(selfPath, "..", "public", "data.json");

    // Load existing data for diff comparison
    let previousData: DataFormat | null = null;
    if (existsSync(dataJsonPath)) {
        try {
            previousData = JSON.parse(readFileSync(dataJsonPath, "utf-8")) as DataFormat;
        } catch {
            // Ignore parse errors — first run or corrupted file
        }
    }

    // Invoke all scrapers to build the data format
    const fmt: DataFormat = {
        scrapedAt: new Date().toISOString(),
        vendors: {},
        models: {},
        imageModels: {},
    };
    await Promise.all([
        scrapeAwsData(fmt),
        scrapeMistralData(fmt),
        scrapeGcpData(fmt),
        scrapeAlibabaData(fmt),
        scrapeAnthropicData(fmt),
        scrapeIbmData(fmt),
        scrapeOpenaiData(fmt),
        scrapeDeepseekData(fmt),
        scrapeForexData(),
        scrapeAzureData(fmt),
        // Image generation scrapers
        scrapeAwsImageData(fmt),
        scrapeOpenaiImageData(fmt),
        scrapeGcpImageData(fmt),
    ]);

    // Detect price changes vs previous run
    if (previousData) {
        detectPriceChanges(previousData, fmt);
    }

    // Output the data as JSON
    writeFileSync(dataJsonPath, JSON.stringify(fmt, null, 4), "utf-8");
    console.log(`Wrote data to ${dataJsonPath}`);
    // Note: tiktoken BPE files are fetched at build time via src/pages/tiktoken/[encoding].tiktoken.ts
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
