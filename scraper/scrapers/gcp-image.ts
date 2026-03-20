import type { DataFormat } from "@/src/dataFormat";
import { addImageModelToFormat, type ImageModelDefinition } from "../shared";

// GCP Vertex AI image generation model pricing
// Prices are per image
// Source: https://cloud.google.com/vertex-ai/generative-ai/pricing
const GCP_IMAGE_MODELS: Record<string, ImageModelDefinition> = {
    "imagen-3.0-generate": {
        name: "Imagen 3",
        provider: "Google",
        supportedResolutions: ["1024x1024"],
        supportsNegativePrompts: false,
        pricing: [{ resolution: "1024x1024", pricePerImage: 0.04 }],
    },
    "imagen-3.0-fast-generate": {
        name: "Imagen 3 Fast",
        provider: "Google",
        supportedResolutions: ["1024x1024"],
        supportsNegativePrompts: false,
        pricing: [{ resolution: "1024x1024", pricePerImage: 0.02 }],
    },
    "imagegeneration@006": {
        name: "Imagen 2",
        provider: "Google",
        supportedResolutions: ["1024x1024"],
        supportsNegativePrompts: true,
        pricing: [{ resolution: "1024x1024", pricePerImage: 0.02 }],
    },
};

export default async function scrapeGcpImageData(fmt: DataFormat) {
    if (!fmt.imageModels) {
        fmt.imageModels = {};
    }

    for (const [_modelId, model] of Object.entries(GCP_IMAGE_MODELS)) {
        await addImageModelToFormat(fmt, "gcp", "us-central1", model, "hardcoded", "2026-03-20");
    }

    console.log(
        `Finished scraping GCP Vertex AI image generation data (${Object.keys(GCP_IMAGE_MODELS).length} models)`
    );
}
