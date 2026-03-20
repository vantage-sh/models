import type { DataFormat } from "@/src/dataFormat";
import {
    getTokenizerForModel,
    isReasoningModel,
    isSelfHostableModel,
    addBenchmarkDataForModel,
} from "../constants";
import { getPerformanceMetrics } from "./artificialanalysis";

type PriceDimension = {
    pricePerUnit?: {
        USD?: string;
    };
    description?: string;
    unit?: string;
};

function slugify(name: string, provider: string): string {
    const n = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (provider === "DeepSeek" && !n.startsWith("deepseek-")) {
        return `deepseek-${n}`;
    }
    if (provider === "Nvidia" && !n.startsWith("nvidia-")) {
        return `nvidia-${n}`;
    }
    return n;
}

const PROVIDERS = {
    Meta: "US",
    Anthropic: "US",
    OpenAI: "US",
    Qwen: "CN",
    DeepSeek: "CN",
    Mistral: "FR",
    "Mistral AI": "FR",
    Google: "US",
    "Kimi AI": "CN",
    Nvidia: "US",
    "Minimax AI": "CN",
    "Moonshot AI": "CN",
    "Z AI": "CN",
} as const;

function providerToCountryCode(provider: string): string {
    const res = PROVIDERS[provider as keyof typeof PROVIDERS];
    if (!res)
        throw new Error(
            `Unknown provider: ${provider}. You probably need to add it to the PROVIDERS map in scraper/scrapers/aws.ts.`
        );
    return res;
}

const ONE_THOUSAND_MIDDLE_BIT_FOR = /1K (.+?) for/g;

async function processPriceDimension(
    fmt: DataFormat,
    priceDimension: PriceDimension,
    attributes: Record<string, string>
) {
    // No provider or model is things not overly useful to us
    if (!attributes.provider || !attributes.model) return;

    const slugifiedModel = slugify(attributes.model, attributes.provider);
    let modelEntry = fmt.models[slugifiedModel];
    if (!modelEntry) {
        modelEntry = {
            cleanName: attributes.model,
            company: attributes.provider,
            companyCountryCode: providerToCountryCode(attributes.provider),
            vendors: [],
            reasoning: isReasoningModel(slugifiedModel),
            selfhostable: isSelfHostableModel(slugifiedModel, attributes.provider),
            tokenizer: getTokenizerForModel(slugifiedModel, attributes.provider),
            ...(await addBenchmarkDataForModel(slugifiedModel)),
        };
        fmt.models[slugifiedModel] = modelEntry;
    }

    let vendor = modelEntry.vendors.find((v) => v.vendorRef === "aws");
    if (!vendor) {
        // Look up performance metrics from Artificial Analysis data
        const perfMetrics = getPerformanceMetrics(slugifiedModel, "aws");

        vendor = {
            vendorRef: "aws",
            regionPricing: {},
            latencyMs: perfMetrics?.latencyMs ?? 0,
            tokensPerSecond: perfMetrics?.tokensPerSecond ?? 0,
            lowCapacity: false,
            priceSource: "scraped",
        };
        modelEntry.vendors.push(vendor);
    }

    if (priceDimension.unit === "1K tokens") {
        const result = ONE_THOUSAND_MIDDLE_BIT_FOR.exec(priceDimension.description || "");
        ONE_THOUSAND_MIDDLE_BIT_FOR.lastIndex = 0; // Reset regex state
        if (!result || result.length < 2) {
            throw new Error(`Could not parse data from description: ${attributes.description}`);
        }
        const middleBit = result[1];

        let usdPrice = priceDimension.pricePerUnit?.USD;
        if (!usdPrice) {
            throw new Error(`No USD price found for model: ${attributes.model}`);
        }
        let price = parseFloat(usdPrice);
        price = price / 1000; // Convert from per 1K tokens to per token

        let inputTokens: number | null = null;
        let outputTokens: number | null = null;
        switch (middleBit) {
            case "input tokens":
                inputTokens = price;
                break;
            case "output tokens":
                outputTokens = price;
                break;
        }
        if (inputTokens === null && outputTokens === null) {
            return;
        }

        let region = vendor.regionPricing[attributes.regionCode];
        if (!region) {
            region = [0, 0, null, null];
            vendor.regionPricing[attributes.regionCode] = region;
        }

        if (inputTokens !== null) {
            region[0] = inputTokens;
        }
        if (outputTokens !== null) {
            region[1] = outputTokens;
        }
    }
}

type Term = {
    priceDimensions?: Record<string, PriceDimension>;
};

type PricingFile = {
    products: Record<
        string,
        {
            attributes: Record<string, string>;
        }
    >;
    terms: Record<string, Record<string, Record<string, Term>>>;
};

async function getBedrockPricingFile(): Promise<PricingFile> {
    const response = await fetch(
        "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/index.json"
    );
    if (!response.ok) {
        throw new Error(`Failed to fetch pricing file: ${response.statusText}`);
    }
    const data: PricingFile = await response.json();
    return data;
}

export default async function scrapeAwsData(fmt: DataFormat) {
    const pricingFile = await getBedrockPricingFile();

    const regions: Record<string, string> = {};
    for (const [sku, product] of Object.entries(pricingFile.products)) {
        // Add the region if it isn't present already
        if (
            product.attributes.location &&
            product.attributes.locationType === "AWS Region" &&
            product.attributes.regionCode
        ) {
            regions[product.attributes.regionCode] = product.attributes.location;
        }

        // Find the pricing terms
        const termHolder = pricingFile.terms.OnDemand[sku as any];
        if (!termHolder) {
            throw new Error(`No OnDemand terms found for SKU: ${sku}`);
        }
        const keys = Object.keys(termHolder);
        if (keys.length === 0) {
            throw new Error(`No terms found for SKU: ${sku}`);
        }
        if (keys.length > 1) {
            throw new Error(`Multiple terms found for SKU: ${sku}`);
        }
        const term = termHolder[keys[0]];

        // Process each pricing term
        if (term.priceDimensions) {
            for (const priceDimension of Object.values<PriceDimension>(term.priceDimensions)) {
                await processPriceDimension(fmt, priceDimension, product.attributes);
            }
        }
    }

    fmt.vendors["aws"] = {
        cleanName: "AWS Bedrock",
        learnMoreUrl: "https://aws.amazon.com/bedrock",
        euOrUKRegions: Object.keys(regions).filter((code) => code.startsWith("eu-")),
        usaRegions: Object.keys(regions).filter((code) => code.startsWith("us-")),
        regionCleanNames: {
            "": regions,
        },
    };
    console.log("Finished scraping AWS Bedrock data");
}
