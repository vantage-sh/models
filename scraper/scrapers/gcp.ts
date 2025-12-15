import type { DataFormat } from "@/src/dataFormat";
import { addModelToFormat, type ModelDefinition } from "../shared";
import { getModelsForProvider, getCachedInputCost, type LiteLLMModel } from "../litellm";

// Model name overrides for cleaner display names
const MODEL_NAME_OVERRIDES: Record<string, string> = {
    "gemini/gemini-1.5-flash": "Gemini 1.5 Flash",
    "gemini/gemini-1.5-flash-latest": "Gemini 1.5 Flash",
    "gemini/gemini-1.5-pro": "Gemini 1.5 Pro",
    "gemini/gemini-1.5-pro-latest": "Gemini 1.5 Pro",
    "gemini/gemini-2.0-flash": "Gemini 2.0 Flash",
    "gemini/gemini-2.0-flash-lite": "Gemini 2.0 Flash Lite",
    "gemini/gemini-2.5-flash": "Gemini 2.5 Flash",
    "gemini/gemini-2.5-flash-preview-05-20": "Gemini 2.5 Flash",
    "gemini/gemini-2.5-pro": "Gemini 2.5 Pro",
    "gemini/gemini-2.5-pro-preview-05-06": "Gemini 2.5 Pro",
    "gemini/gemini-3-pro-preview": "Gemini 3 Pro Preview",
};

// Models to include
const INCLUDED_MODEL_PATTERNS = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-3-pro",
];

function shouldIncludeModel(modelId: string): boolean {
    const lowerModelId = modelId.toLowerCase();

    // Skip experimental, 8b, thinking, and live models
    if (lowerModelId.includes("exp-")) return false;
    if (lowerModelId.includes("-8b")) return false;
    if (lowerModelId.includes("thinking")) return false;
    if (lowerModelId.includes("live")) return false;
    if (lowerModelId.includes("audio")) return false;

    return INCLUDED_MODEL_PATTERNS.some(pattern => lowerModelId.includes(pattern));
}

function getModelName(modelId: string): string {
    // Check for exact override
    if (MODEL_NAME_OVERRIDES[modelId]) {
        return MODEL_NAME_OVERRIDES[modelId];
    }

    // Remove gemini/ prefix and generate name
    let name = modelId.replace(/^gemini\//, "");

    // Remove date suffixes and version numbers
    name = name.replace(/-\d{3,}$/, "").replace(/-preview-\d{2}-\d{2}$/, "");

    return name
        .split("-")
        .map(part => {
            if (part === "gemini") return "Gemini";
            if (/^\d/.test(part)) return part;
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join(" ");
}

function litellmModelToDefinition(modelId: string, model: LiteLLMModel): ModelDefinition | null {
    if (!model.input_cost_per_token || !model.output_cost_per_token) {
        return null;
    }

    return {
        name: getModelName(modelId),
        provider: "Google",
        pricing: {
            input: model.input_cost_per_token,
            output: model.output_cost_per_token,
            cachedInput: getCachedInputCost(model),
        },
    };
}

export default async function scrapeGcpData(fmt: DataFormat) {
    const models = await getModelsForProvider("gemini", "chat");
    const addedModels = new Set<string>();

    for (const [modelId, model] of models) {
        if (!shouldIncludeModel(modelId)) continue;

        const definition = litellmModelToDefinition(modelId, model);
        if (!definition) continue;

        // Deduplicate by model name
        const normalizedName = definition.name;
        if (addedModels.has(normalizedName)) continue;
        addedModels.add(normalizedName);

        await addModelToFormat(fmt, "gcp", "us-central1", definition);
    }

    fmt.vendors["gcp"] = {
        cleanName: "Google Cloud Vertex AI",
        learnMoreUrl: "https://cloud.google.com/vertex-ai",
        euOrUKRegions: ["europe-west1", "europe-west4"],
        regionCleanNames: {
            "": {
                "us-central1": "US Central (Iowa)",
                "us-east4": "US East (N. Virginia)",
                "europe-west1": "Europe West (Belgium)",
                "europe-west4": "Europe West (Netherlands)",
                "asia-northeast1": "Asia Northeast (Tokyo)",
            },
        },
    };

    console.log(`Finished scraping GCP Vertex AI data (${addedModels.size} models from LiteLLM)`);
}
