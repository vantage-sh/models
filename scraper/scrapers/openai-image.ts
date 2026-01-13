import type { DataFormat } from "@/src/dataFormat";
import { addImageModelToFormat, type ImageModelDefinition } from "../shared";

// OpenAI DALL-E image generation model pricing
// Prices are per image, varying by resolution and quality
// Source: https://openai.com/pricing
const OPENAI_IMAGE_MODELS: Record<string, ImageModelDefinition> = {
    "dall-e-3": {
        name: "DALL-E 3",
        provider: "OpenAI",
        supportedResolutions: ["1024x1024", "1024x1792", "1792x1024"],
        supportsNegativePrompts: false,
        pricing: [
            { resolution: "1024x1024", pricePerImage: 0.040, generationSpeedMs: 15000 },
            { resolution: "1024x1792", pricePerImage: 0.080, generationSpeedMs: 20000 },
            { resolution: "1792x1024", pricePerImage: 0.080, generationSpeedMs: 20000 },
        ],
    },
    "dall-e-3-hd": {
        name: "DALL-E 3 HD",
        provider: "OpenAI",
        supportedResolutions: ["1024x1024", "1024x1792", "1792x1024"],
        supportsNegativePrompts: false,
        pricing: [
            { resolution: "1024x1024", pricePerImage: 0.080, generationSpeedMs: 25000 },
            { resolution: "1024x1792", pricePerImage: 0.120, generationSpeedMs: 30000 },
            { resolution: "1792x1024", pricePerImage: 0.120, generationSpeedMs: 30000 },
        ],
    },
    "dall-e-2": {
        name: "DALL-E 2",
        provider: "OpenAI",
        supportedResolutions: ["256x256", "512x512", "1024x1024"],
        supportsNegativePrompts: false,
        pricing: [
            { resolution: "256x256", pricePerImage: 0.016 },
            { resolution: "512x512", pricePerImage: 0.018 },
            { resolution: "1024x1024", pricePerImage: 0.020 },
        ],
    },
    "gpt-image-1": {
        name: "GPT Image 1",
        provider: "OpenAI",
        supportedResolutions: ["1024x1024", "1024x1792", "1792x1024"],
        supportsNegativePrompts: false,
        pricing: [
            { resolution: "1024x1024", pricePerImage: 0.011 },
            { resolution: "1024x1792", pricePerImage: 0.016 },
            { resolution: "1792x1024", pricePerImage: 0.016 },
        ],
    },
};

export default async function scrapeOpenaiImageData(fmt: DataFormat) {
    // Initialize imageModels if not present
    if (!fmt.imageModels) {
        fmt.imageModels = {};
    }

    for (const [_modelId, model] of Object.entries(OPENAI_IMAGE_MODELS)) {
        await addImageModelToFormat(fmt, "openai", "global", model);
    }

    console.log(`Finished scraping OpenAI image generation data (${Object.keys(OPENAI_IMAGE_MODELS).length} models)`);
}
