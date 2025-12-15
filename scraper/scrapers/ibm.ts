import type { DataFormat } from "@/src/dataFormat";
import { addModelToFormat, type ModelDefinition } from "../shared";
import { getModelsForProvider, getCachedInputCost, type LiteLLMModel } from "../litellm";

// Model name overrides for cleaner display names
const MODEL_NAME_OVERRIDES: Record<string, string> = {
    "watsonx/ibm/granite-3-8b-instruct": "Granite 3 8B Instruct",
    "watsonx/ibm/granite-3-2b-instruct": "Granite 3 2B Instruct",
    "watsonx/ibm/granite-3.1-8b-instruct": "Granite 3.1 8B Instruct",
    "watsonx/ibm/granite-3.1-2b-instruct": "Granite 3.1 2B Instruct",
    "watsonx/ibm/granite-3.2-8b-instruct": "Granite 3.2 8B Instruct",
    "watsonx/ibm/granite-3.3-8b-instruct": "Granite 3.3 8B Instruct",
    "watsonx/meta-llama/llama-3-1-70b-instruct": "Llama 3.1 70B Instruct",
    "watsonx/meta-llama/llama-3-1-8b-instruct": "Llama 3.1 8B Instruct",
    "watsonx/meta-llama/llama-3-3-70b-instruct": "Llama 3.3 70B Instruct",
    "watsonx/mistralai/mistral-large": "Mistral Large",
};

// Models to include (Granite and popular third-party models)
const INCLUDED_MODEL_PATTERNS = [
    "granite-3",
    "llama-3-1",
    "llama-3-3",
    "mistral-large",
];

function shouldIncludeModel(modelId: string): boolean {
    const lowerModelId = modelId.toLowerCase();

    // Skip embedding models
    if (lowerModelId.includes("embed")) return false;

    return INCLUDED_MODEL_PATTERNS.some(pattern => lowerModelId.includes(pattern));
}

function getProviderFromModelId(modelId: string): string {
    if (modelId.includes("/ibm/")) return "IBM";
    if (modelId.includes("/meta-llama/")) return "Meta";
    if (modelId.includes("/mistralai/")) return "Mistral";
    return "IBM";
}

function getModelName(modelId: string): string {
    // Check for exact override
    if (MODEL_NAME_OVERRIDES[modelId]) {
        return MODEL_NAME_OVERRIDES[modelId];
    }

    // Remove watsonx/ prefix and provider prefix, then generate name
    let name = modelId
        .replace(/^watsonx\//, "")
        .replace(/^ibm\//, "")
        .replace(/^meta-llama\//, "")
        .replace(/^mistralai\//, "");

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
        provider: getProviderFromModelId(modelId),
        pricing: {
            input: model.input_cost_per_token,
            output: model.output_cost_per_token,
            cachedInput: getCachedInputCost(model),
        },
    };
}

export default async function scrapeIbmData(fmt: DataFormat) {
    const models = await getModelsForProvider("watsonx", "chat");
    const addedModels = new Set<string>();

    for (const [modelId, model] of models) {
        if (!shouldIncludeModel(modelId)) continue;

        const definition = litellmModelToDefinition(modelId, model);
        if (!definition) continue;

        // Deduplicate by model name
        const normalizedName = definition.name;
        if (addedModels.has(normalizedName)) continue;
        addedModels.add(normalizedName);

        await addModelToFormat(fmt, "ibm", "us-south", definition);
    }

    fmt.vendors["ibm"] = {
        cleanName: "IBM watsonx.ai",
        learnMoreUrl: "https://www.ibm.com/products/watsonx-ai",
        euOrUKRegions: ["eu-de", "eu-gb"],
        regionCleanNames: {
            "": {
                "us-south": "US South (Dallas)",
                "us-east": "US East (Washington DC)",
                "eu-de": "Europe (Frankfurt)",
                "eu-gb": "Europe (London)",
                "jp-tok": "Asia Pacific (Tokyo)",
            },
        },
    };

    console.log(`Finished scraping IBM watsonx.ai data (${addedModels.size} models from LiteLLM)`);
}
