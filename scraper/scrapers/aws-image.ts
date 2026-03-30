import type { DataFormat, ImageResolution } from "@/src/dataFormat";
import { addImageModelToFormat, type ImageModelDefinition } from "../shared";

// Non-pricing metadata that can't be derived from the AWS pricing API.
// Keys are the attribute values from the pricing file (titanModel or model field).
const MODEL_META: Record<
    string,
    { name: string; provider: string; supportsNegativePrompts: boolean }
> = {
    "Titan Image Generator G1": {
        name: "Amazon Titan Image Generator",
        provider: "Amazon",
        supportsNegativePrompts: true,
    },
    "Titan Image Generator V2": {
        name: "Amazon Titan Image Generator v2",
        provider: "Amazon",
        supportsNegativePrompts: true,
    },
    "Nova Canvas": {
        name: "Nova Canvas",
        provider: "Amazon",
        supportsNegativePrompts: true,
    },
};

// Maps resolution number from inferenceType (e.g. "T2I 1024 Standard") to ImageResolution
const RESOLUTION_MAP: Record<string, ImageResolution> = {
    "512": "512x512",
    "1024": "1024x1024",
    "2048": "2048x2048",
};

type PriceDimension = {
    pricePerUnit?: { USD?: string };
    description?: string;
    unit?: string;
};

type Term = {
    priceDimensions?: Record<string, PriceDimension>;
};

type PricingFile = {
    products: Record<string, { attributes: Record<string, string> }>;
    terms: Record<string, Record<string, Record<string, Term>>>;
};

async function getBedrockPricingFile(): Promise<PricingFile> {
    const response = await fetch(
        "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/us-east-1/index.json"
    );
    if (!response.ok) {
        throw new Error(`Failed to fetch Bedrock pricing file: ${response.statusText}`);
    }
    return response.json();
}

// Parse inferenceType like "T2I 1024 Standard" → { mode: "T2I", resolution: "1024x1024", quality: "Standard" }
function parseInferenceType(
    inferenceType: string
): { mode: string; resolution: ImageResolution; quality: string } | null {
    // Strip optional "Custom " prefix
    const normalized = inferenceType.replace(/^Custom\s+/, "");
    const parts = normalized.split(" ");
    if (parts.length !== 3) return null;
    const [mode, resNum, quality] = parts;
    const resolution = RESOLUTION_MAP[resNum];
    if (!resolution) return null;
    return { mode, resolution, quality };
}

export default async function scrapeAwsImageData(fmt: DataFormat) {
    if (!fmt.imageModels) {
        fmt.imageModels = {};
    }

    const pricingFile = await getBedrockPricingFile();

    // modelKey -> resolution -> lowest Standard T2I price
    const pricingByModel: Record<string, Record<string, number>> = {};

    for (const [sku, product] of Object.entries(pricingFile.products)) {
        const attrs = product.attributes;

        // Titan models use titanModel attr; others use model attr
        const modelKey = attrs.titanModel ?? attrs.model;
        if (!modelKey || !MODEL_META[modelKey]) continue;

        const inferenceType = attrs.inferenceType;
        if (!inferenceType) continue;

        const parsed = parseInferenceType(inferenceType);
        if (!parsed) continue;

        // Only include text-to-image Standard pricing (the base on-demand price)
        if (parsed.mode !== "T2I" || parsed.quality !== "Standard") continue;

        const termHolder = pricingFile.terms.OnDemand[sku as any];
        if (!termHolder) continue;
        const termKeys = Object.keys(termHolder);
        if (termKeys.length !== 1) continue;
        const term = termHolder[termKeys[0]];
        if (!term.priceDimensions) continue;

        for (const dim of Object.values(term.priceDimensions)) {
            if (dim.unit?.toLowerCase() !== "image") continue;
            const usd = dim.pricePerUnit?.USD;
            if (!usd) continue;

            if (!pricingByModel[modelKey]) pricingByModel[modelKey] = {};
            pricingByModel[modelKey][parsed.resolution] = parseFloat(usd);
        }
    }

    let modelsAdded = 0;
    for (const [modelKey, meta] of Object.entries(MODEL_META)) {
        const pricing = pricingByModel[modelKey];
        if (!pricing || Object.keys(pricing).length === 0) {
            console.warn(`No pricing found in Bedrock pricing file for image model: ${modelKey}`);
            continue;
        }

        const supportedResolutions = Object.keys(pricing) as ImageResolution[];

        const modelDef: ImageModelDefinition = {
            name: meta.name,
            provider: meta.provider,
            supportsNegativePrompts: meta.supportsNegativePrompts,
            supportedResolutions,
            pricing: supportedResolutions.map((resolution) => ({
                resolution,
                pricePerImage: pricing[resolution],
            })),
        };

        await addImageModelToFormat(fmt, "aws", "us-east-1", modelDef, "scraped");
        modelsAdded++;
    }

    console.log(`Finished scraping AWS image generation data (${modelsAdded} models)`);
}
