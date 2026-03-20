import type { DataFormat } from "@/src/dataFormat";
import { addImageModelToFormat, type ImageModelDefinition } from "../shared";

// AWS Bedrock image generation model pricing
// Prices are per image, varying by resolution
// Source: https://aws.amazon.com/bedrock/pricing/
const AWS_IMAGE_MODELS: Record<string, ImageModelDefinition> = {
    "stability.stable-diffusion-xl-v1": {
        name: "Stable Diffusion XL 1.0",
        provider: "Stability AI",
        supportedResolutions: ["512x512", "1024x1024"],
        supportsNegativePrompts: true,
        pricing: [
            { resolution: "512x512", pricePerImage: 0.018 },
            { resolution: "1024x1024", pricePerImage: 0.036 },
        ],
    },
    "stability.sd3-large-v1:0": {
        name: "Stable Diffusion 3 Large",
        provider: "Stability AI",
        supportedResolutions: ["1024x1024"],
        supportsNegativePrompts: true,
        pricing: [{ resolution: "1024x1024", pricePerImage: 0.08 }],
    },
    "stability.stable-image-ultra-v1:0": {
        name: "Stable Image Ultra",
        provider: "Stability AI",
        supportedResolutions: ["1024x1024"],
        supportsNegativePrompts: true,
        pricing: [{ resolution: "1024x1024", pricePerImage: 0.14 }],
    },
    "stability.stable-image-core-v1:0": {
        name: "Stable Image Core",
        provider: "Stability AI",
        supportedResolutions: ["1024x1024"],
        supportsNegativePrompts: true,
        pricing: [{ resolution: "1024x1024", pricePerImage: 0.04 }],
    },
    "amazon.titan-image-generator-v1": {
        name: "Amazon Titan Image Generator",
        provider: "Amazon",
        supportedResolutions: ["512x512", "1024x1024"],
        supportsNegativePrompts: true,
        pricing: [
            { resolution: "512x512", pricePerImage: 0.008 },
            { resolution: "1024x1024", pricePerImage: 0.01 },
        ],
    },
    "amazon.titan-image-generator-v2:0": {
        name: "Amazon Titan Image Generator v2",
        provider: "Amazon",
        supportedResolutions: ["512x512", "1024x1024"],
        supportsNegativePrompts: true,
        pricing: [
            { resolution: "512x512", pricePerImage: 0.008 },
            { resolution: "1024x1024", pricePerImage: 0.01 },
        ],
    },
};

export default async function scrapeAwsImageData(fmt: DataFormat) {
    // Initialize imageModels if not present
    if (!fmt.imageModels) {
        fmt.imageModels = {};
    }

    for (const [_modelId, model] of Object.entries(AWS_IMAGE_MODELS)) {
        await addImageModelToFormat(fmt, "aws", "us-east-1", model, "hardcoded", "2026-03-20");
    }

    console.log(
        `Finished scraping AWS image generation data (${Object.keys(AWS_IMAGE_MODELS).length} models)`
    );
}
