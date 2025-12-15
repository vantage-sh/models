import type { DataFormat } from "@/src/dataFormat";
import { addModelToFormat, type ModelDefinition } from "../shared";
import { getModelsForProvider, getCachedInputCost, type LiteLLMModel } from "../litellm";

// Model name overrides for cleaner display names
const MODEL_NAME_OVERRIDES: Record<string, string> = {
    "mistral/mistral-large-latest": "Mistral Large",
    "mistral/mistral-large-2411": "Mistral Large",
    "mistral/mistral-medium-latest": "Mistral Medium",
    "mistral/mistral-small-latest": "Mistral Small",
    "mistral/mistral-small-3.2-2503": "Mistral Small 3.2",
    "mistral/ministral-8b-latest": "Ministral 8B",
    "mistral/ministral-3b-latest": "Ministral 3B",
    "mistral/pixtral-large-latest": "Pixtral Large",
    "mistral/pixtral-12b-2409": "Pixtral 12B",
    "mistral/codestral-latest": "Codestral",
    "mistral/codestral-2508": "Codestral",
    "mistral/magistral-medium-2506": "Magistral Medium",
    "mistral/magistral-small-2506": "Magistral Small",
    "mistral/devstral-2512": "Devstral",
    "mistral/devstral-small-2505": "Devstral Small",
};

// Models to include
const INCLUDED_MODEL_PATTERNS = [
    "mistral-large",
    "mistral-medium",
    "mistral-small",
    "ministral",
    "pixtral",
    "codestral",
    "magistral",
    "devstral",
];

function shouldIncludeModel(modelId: string): boolean {
    const lowerModelId = modelId.toLowerCase();

    // Skip mamba and embedding models
    if (lowerModelId.includes("mamba")) return false;
    if (lowerModelId.includes("embed")) return false;

    // Check if it matches any included pattern
    return INCLUDED_MODEL_PATTERNS.some(pattern => lowerModelId.includes(pattern));
}

function getModelName(modelId: string): string {
    // Check for exact override
    if (MODEL_NAME_OVERRIDES[modelId]) {
        return MODEL_NAME_OVERRIDES[modelId];
    }

    // Remove mistral/ prefix and generate name
    let name = modelId.replace(/^mistral\//, "");

    // Remove date suffixes
    name = name.replace(/-\d{4}$/, "").replace(/-latest$/, "");

    return name
        .split("-")
        .map(part => {
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
        provider: "Mistral",
        pricing: {
            input: model.input_cost_per_token,
            output: model.output_cost_per_token,
            cachedInput: getCachedInputCost(model),
        },
    };
}

export default async function scrapeMistralData(fmt: DataFormat) {
    const models = await getModelsForProvider("mistral", "chat");
    const addedModels = new Set<string>();

    for (const [modelId, model] of models) {
        if (!shouldIncludeModel(modelId)) continue;

        const definition = litellmModelToDefinition(modelId, model);
        if (!definition) continue;

        // Deduplicate by model name
        const normalizedName = definition.name;
        if (addedModels.has(normalizedName)) continue;
        addedModels.add(normalizedName);

        await addModelToFormat(fmt, "mistral", "global", definition);
    }

    fmt.vendors["mistral"] = {
        cleanName: "Mistral AI",
        learnMoreUrl: "https://mistral.ai",
        euOrUKRegions: ["global"], // Mistral is EU-based (France)
        regionCleanNames: {
            "": {
                "global": "Global",
            },
        },
    };

    console.log(`Finished scraping Mistral data (${addedModels.size} models from LiteLLM)`);
}
