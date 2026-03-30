import type { DataFormat, ImageResolution } from "@/src/dataFormat";
import { addImageModelToFormat, type ImageModelDefinition } from "../shared";
import { fetchLiteLLMPricing } from "../litellm";

// Which quality tier to use per model (LiteLLM key prefix, or null for no prefix)
type ModelSpec = {
    name: string;
    litellmId: string;
    quality: string | null; // e.g. "standard", "hd", "low", or null for DALL-E 2
    supportsNegativePrompts: boolean;
};

const MODELS: ModelSpec[] = [
    { name: "DALL-E 2", litellmId: "dall-e-2", quality: null, supportsNegativePrompts: false },
    { name: "DALL-E 3", litellmId: "dall-e-3", quality: "standard", supportsNegativePrompts: false },
    { name: "DALL-E 3 HD", litellmId: "dall-e-3", quality: "hd", supportsNegativePrompts: false },
    { name: "GPT Image 1", litellmId: "gpt-image-1", quality: "low", supportsNegativePrompts: false },
    { name: "GPT Image 1 Mini", litellmId: "gpt-image-1-mini", quality: "low", supportsNegativePrompts: false },
];

// Convert LiteLLM resolution string "1024-x-1024" → "1024x1024"
function parseResolution(resStr: string): ImageResolution | null {
    const res = resStr.replace(/-x-/, "x");
    const valid: ImageResolution[] = [
        "256x256", "512x512", "1024x1024",
        "1024x1536", "1536x1024",
        "1024x1792", "1792x1024",
        "2048x2048",
    ];
    return valid.includes(res as ImageResolution) ? (res as ImageResolution) : null;
}

// Compute price per image from LiteLLM's pixel-based pricing
function pixelPrice(resStr: string, costPerPixel: number): number {
    const [w, h] = resStr.replace(/-x-/, "x").split("x").map(Number);
    return w * h * costPerPixel;
}

export default async function scrapeOpenaiImageData(fmt: DataFormat) {
    if (!fmt.imageModels) {
        fmt.imageModels = {};
    }

    const litellm = await fetchLiteLLMPricing();
    let modelsAdded = 0;

    for (const spec of MODELS) {
        // Collect resolution → price from matching LiteLLM entries
        const pricing: Record<string, number> = {};

        for (const [modelId, model] of Object.entries(litellm)) {
            if (model.litellm_provider !== "openai") continue;
            if (model.mode !== "image_generation") continue;

            // Match key pattern: [quality/]resolution/modelId
            let resStr: string | null = null;

            if (spec.quality === null) {
                // DALL-E 2: key is "{resolution}/dall-e-2"
                const match = modelId.match(/^([\d]+-x-[\d]+)\/dall-e-2$/);
                if (match) resStr = match[1];
            } else {
                // e.g. "standard/1024-x-1024/dall-e-3" or "low/1024-x-1024/gpt-image-1"
                const prefix = `${spec.quality}/`;
                const suffix = `/${spec.litellmId}`;
                if (modelId.startsWith(prefix) && modelId.endsWith(suffix)) {
                    resStr = modelId.slice(prefix.length, modelId.length - suffix.length);
                }
            }

            if (!resStr) continue;
            const resolution = parseResolution(resStr);
            if (!resolution) continue;

            let price: number | null = null;
            if (model.input_cost_per_image != null) {
                price = model.input_cost_per_image;
            } else if (model.input_cost_per_pixel != null) {
                price = pixelPrice(resStr, model.input_cost_per_pixel);
                price = Math.round(price * 10000) / 10000; // Round to 4 decimal places
            }

            if (price != null) pricing[resolution] = price;
        }

        if (Object.keys(pricing).length === 0) {
            console.warn(`No pricing found in LiteLLM for OpenAI image model: ${spec.name}`);
            continue;
        }

        const supportedResolutions = Object.keys(pricing) as ImageResolution[];

        const modelDef: ImageModelDefinition = {
            name: spec.name,
            provider: "OpenAI",
            supportsNegativePrompts: spec.supportsNegativePrompts,
            supportedResolutions,
            pricing: supportedResolutions.map((resolution) => ({
                resolution,
                pricePerImage: pricing[resolution],
            })),
        };

        await addImageModelToFormat(fmt, "openai", "global", modelDef, "scraped");
        modelsAdded++;
    }

    console.log(`Finished scraping OpenAI image generation data (${modelsAdded} models)`);
}
