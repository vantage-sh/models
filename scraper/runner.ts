import type { DataFormat } from "@/src/dataFormat";
import scrapeAwsData from "./scrapers/aws";
import scrapeMistralData from "./scrapers/mistral";
import scrapeGcpData from "./scrapers/gcp";
import scrapeAlibabaData from "./scrapers/alibaba";
import scrapeAnthropicData from "./scrapers/anthropic";
import scrapeIbmData from "./scrapers/ibm";
import scrapeOpenaiData from "./scrapers/openai";
import scrapeDeepseekData from "./scrapers/deepseek";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

async function main() {
    // Invoke all scrapers to build the data format
    const fmt: DataFormat = {
        vendors: {},
        models: {},
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
    ]);

    // Output the data as JSON
    const selfPath = dirname(fileURLToPath(import.meta.url));
    const dataJsonPath = join(selfPath, "..", "public", "data.json");
    writeFileSync(dataJsonPath, JSON.stringify(fmt, null, 4), "utf-8");
    console.log(`Wrote data to ${dataJsonPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
