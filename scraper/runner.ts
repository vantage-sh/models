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
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

async function main() {
    const selfPath = dirname(fileURLToPath(import.meta.url));
    const dataJsonPath = join(selfPath, "..", "public", "data.json");

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

    // Output the data as JSON
    writeFileSync(dataJsonPath, JSON.stringify(fmt, null, 4), "utf-8");
    console.log(`Wrote data to ${dataJsonPath}`);
    // Note: tiktoken BPE files are fetched at build time via src/pages/tiktoken/[encoding].tiktoken.ts
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
