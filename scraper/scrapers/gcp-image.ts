import type { DataFormat, ImageResolution } from "@/src/dataFormat";
import { addImageModelToFormat, type ImageModelDefinition } from "../shared";
import { fetchLiteLLMPricing } from "../litellm";

// Non-pricing metadata keyed by LiteLLM model ID (vertex_ai/* prefix stripped)
const MODEL_META: Record<
    string,
    { name: string; supportsNegativePrompts: boolean; supportedResolutions: ImageResolution[] }
> = {
    "imagegeneration@006": {
        name: "Imagen 2",
        supportsNegativePrompts: true,
        supportedResolutions: ["1024x1024"],
    },
    "imagen-3.0-generate-001": {
        name: "Imagen 3",
        supportsNegativePrompts: false,
        supportedResolutions: ["1024x1024"],
    },
    "imagen-3.0-fast-generate-001": {
        name: "Imagen 3 Fast",
        supportsNegativePrompts: false,
        supportedResolutions: ["1024x1024"],
    },
    "imagen-4.0-generate-001": {
        name: "Imagen 4",
        supportsNegativePrompts: false,
        supportedResolutions: ["1024x1024"],
    },
    "imagen-4.0-fast-generate-001": {
        name: "Imagen 4 Fast",
        supportsNegativePrompts: false,
        supportedResolutions: ["1024x1024"],
    },
    "imagen-4.0-ultra-generate-001": {
        name: "Imagen 4 Ultra",
        supportsNegativePrompts: false,
        supportedResolutions: ["1024x1024"],
    },
};

export default async function scrapeGcpImageData(fmt: DataFormat) {
    if (!fmt.imageModels) {
        fmt.imageModels = {};
    }

    const pricing = await fetchLiteLLMPricing();
    let modelsAdded = 0;

    for (const [modelId, model] of Object.entries(pricing)) {
        if (model.litellm_provider !== "vertex_ai-image-models") continue;
        if (model.mode !== "image_generation") continue;
        if (!model.output_cost_per_image) continue;

        // Skip deprecated models
        if (model.deprecation_date && new Date(model.deprecation_date) < new Date()) continue;

        // Strip "vertex_ai/" prefix to get the bare model ID
        const bareId = modelId.replace(/^vertex_ai\//, "");
        const meta = MODEL_META[bareId];
        if (!meta) continue;

        const modelDef: ImageModelDefinition = {
            name: meta.name,
            provider: "Google",
            supportsNegativePrompts: meta.supportsNegativePrompts,
            supportedResolutions: meta.supportedResolutions,
            pricing: meta.supportedResolutions.map((resolution) => ({
                resolution,
                pricePerImage: model.output_cost_per_image!,
            })),
        };

        await addImageModelToFormat(fmt, "gcp", "us-central1", modelDef, "scraped");
        modelsAdded++;
    }

    console.log(`Finished scraping GCP Vertex AI image generation data (${modelsAdded} models)`);
}
