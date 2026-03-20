import type { DataFormat } from "@/src/dataFormat";
import { addModelToFormat, type ModelDefinition } from "../shared";
import {
    getModelsForProvider,
    getCachedInputCost,
    cleanModelName,
    type LiteLLMModel,
} from "../litellm";

// Reuse the same display name overrides as the OpenAI scraper for GPT/o-series models
const OPENAI_MODEL_NAME_OVERRIDES: Record<string, string> = {
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-4-turbo": "GPT-4 Turbo",
    "gpt-4": "GPT-4",
    "gpt-3.5-turbo": "GPT-3.5 Turbo",
    o1: "GPT-o1",
    "o1-mini": "GPT-o1 Mini",
    o3: "GPT-o3",
    "o3-mini": "GPT-o3 Mini",
    "o4-mini": "GPT-o4 Mini",
    "gpt-4.1": "GPT-4.1",
    "gpt-4.1-mini": "GPT-4.1 Mini",
    "gpt-4.1-nano": "GPT-4.1 Nano",
    "gpt-5": "GPT-5",
};

const MICROSOFT_MODEL_NAME_OVERRIDES: Record<string, string> = {
    "phi-4": "Phi-4",
    "phi-4-mini": "Phi-4 Mini",
    "phi-4-mini-instruct": "Phi-4 Mini",
};

// Prefixes of models to include from Azure
const INCLUDED_MODEL_PREFIXES = [
    "gpt-4o",
    "gpt-4-turbo",
    "gpt-4.1",
    "gpt-4",
    "gpt-5",
    "o1",
    "o3",
    "o4",
    "phi-4",
];

function shouldIncludeModel(baseId: string): boolean {
    if (baseId.includes("audio") || baseId.includes("realtime")) return false;
    if (baseId.includes("embedding")) return false;
    if (baseId.includes("preview")) return false;
    return INCLUDED_MODEL_PREFIXES.some((prefix) => baseId.startsWith(prefix));
}

function getProvider(baseId: string): "OpenAI" | "Microsoft" {
    if (baseId.startsWith("phi-")) return "Microsoft";
    return "OpenAI";
}

function getModelName(baseId: string): string | null {
    const provider = getProvider(baseId);

    if (provider === "Microsoft") {
        // Exact match first
        if (MICROSOFT_MODEL_NAME_OVERRIDES[baseId]) {
            return MICROSOFT_MODEL_NAME_OVERRIDES[baseId];
        }
        // Prefix match
        for (const [key, name] of Object.entries(MICROSOFT_MODEL_NAME_OVERRIDES)) {
            if (baseId.startsWith(key)) return name;
        }
        return cleanModelName(baseId, "azure");
    }

    // OpenAI-hosted models on Azure
    if (OPENAI_MODEL_NAME_OVERRIDES[baseId]) {
        return OPENAI_MODEL_NAME_OVERRIDES[baseId];
    }
    for (const [key, name] of Object.entries(OPENAI_MODEL_NAME_OVERRIDES)) {
        if (baseId.startsWith(key)) return name;
    }
    return cleanModelName(baseId, "azure");
}

function litellmModelToDefinition(modelId: string, model: LiteLLMModel): ModelDefinition | null {
    if (!model.input_cost_per_token || !model.output_cost_per_token) {
        return null;
    }

    // Strip the azure/ prefix to get the base model ID
    const baseId = modelId.replace(/^azure\//, "");

    const name = getModelName(baseId);
    if (!name) return null;

    return {
        name,
        provider: getProvider(baseId),
        pricing: {
            input: model.input_cost_per_token,
            output: model.output_cost_per_token,
            cachedInput: getCachedInputCost(model),
        },
        maxInputTokens: model.max_input_tokens,
        maxOutputTokens: model.max_output_tokens ?? model.max_tokens,
    };
}

export default async function scrapeAzureData(fmt: DataFormat) {
    const models = await getModelsForProvider("azure", "chat");
    const addedModels = new Set<string>();

    for (const [modelId, model] of models) {
        const baseId = modelId.replace(/^azure\//, "");
        if (!shouldIncludeModel(baseId)) continue;

        const definition = litellmModelToDefinition(modelId, model);
        if (!definition) continue;

        // Deduplicate by model name
        if (addedModels.has(definition.name)) continue;
        addedModels.add(definition.name);

        await addModelToFormat(fmt, "azure", "eastus", definition);
    }

    fmt.vendors["azure"] = {
        cleanName: "Azure AI",
        learnMoreUrl: "https://azure.microsoft.com/en-us/products/ai-services/openai-service",
        euOrUKRegions: ["westeurope", "northeurope", "uksouth", "swedencentral"],
        usaRegions: ["eastus", "eastus2", "westus", "westus3", "northcentralus", "southcentralus"],
        regionCleanNames: {
            "": {
                eastus: "East US (Virginia)",
                eastus2: "East US 2 (Virginia)",
                westus: "West US (California)",
                westus3: "West US 3 (Arizona)",
                northcentralus: "North Central US (Illinois)",
                southcentralus: "South Central US (Texas)",
                westeurope: "West Europe (Netherlands)",
                northeurope: "North Europe (Ireland)",
                uksouth: "UK South (London)",
                swedencentral: "Sweden Central",
                australiaeast: "Australia East (New South Wales)",
                japaneast: "Japan East (Tokyo)",
            },
        },
    };

    console.log(`Finished scraping Azure AI data (${addedModels.size} models from LiteLLM)`);
}
