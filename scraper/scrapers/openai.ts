import type { DataFormat } from "@/src/dataFormat";
import { addModelToFormat, type ModelDefinition } from "../shared";
import {
    getModelsForProvider,
    getCachedInputCost,
    cleanModelName,
    type LiteLLMModel,
} from "../litellm";

// Model name overrides for cleaner display names
const MODEL_NAME_OVERRIDES: Record<string, string> = {
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-4-turbo": "GPT-4 Turbo",
    "gpt-4": "GPT-4",
    "gpt-3.5-turbo": "GPT-3.5 Turbo",
    o1: "GPT-o1",
    "o1-mini": "GPT-o1 Mini",
    "o1-preview": "GPT-o1 Preview",
    o3: "GPT-o3",
    "o3-mini": "GPT-o3 Mini",
    "o4-mini": "GPT-o4 Mini",
    "gpt-4.1": "GPT-4.1",
    "gpt-4.1-mini": "GPT-4.1 Mini",
    "gpt-4.1-nano": "GPT-4.1 Nano",
    "gpt-5": "GPT-5",
    "gpt-5-mini": "GPT-5 Mini",
    "gpt-5.1": "GPT-5.1",
    "gpt-5.1-mini": "GPT-5.1 Mini",
    "gpt-5.2": "GPT-5.2",
    "gpt-5.2-mini": "GPT-5.2 Mini",
    "gpt-5.3": "GPT-5.3",
    "gpt-5.3-mini": "GPT-5.3 Mini",
    "gpt-5.4": "GPT-5.4",
    "gpt-5.4-mini": "GPT-5.4 Mini",
    "chatgpt-4o-latest": "GPT-4o",
};

// Models to include (filter out fine-tuned, deprecated, and irrelevant models)
const INCLUDED_MODEL_PREFIXES = [
    "gpt-oss",
    "gpt-4o",
    "gpt-4-turbo",
    "gpt-4.1",
    "gpt-5",
    "gpt-5.1",
    "gpt-5.2",
    "gpt-5.3",
    "gpt-5.4",
    "o1",
    "o3",
    "o4",
    "chatgpt-4o",
];

function shouldIncludeModel(modelId: string): boolean {
    // Skip fine-tuned models
    if (modelId.startsWith("ft:")) return false;

    // Skip audio/realtime models
    if (modelId.includes("audio") || modelId.includes("realtime")) return false;

    // Skip embedding models
    if (modelId.includes("embedding")) return false;

    // Check if it matches any included prefix
    return INCLUDED_MODEL_PREFIXES.some((prefix) => modelId.startsWith(prefix));
}

function getModelName(modelId: string): string | null {
    // Check for exact override
    if (MODEL_NAME_OVERRIDES[modelId]) {
        return MODEL_NAME_OVERRIDES[modelId];
    }

    // Check for prefix match in overrides
    for (const [key, name] of Object.entries(MODEL_NAME_OVERRIDES)) {
        if (modelId.startsWith(key) && !modelId.includes("-preview")) {
            return name;
        }
    }

    return cleanModelName(modelId, "openai");
}

function litellmModelToDefinition(modelId: string, model: LiteLLMModel): ModelDefinition | null {
    if (!model.input_cost_per_token || !model.output_cost_per_token) {
        return null;
    }

    const name = getModelName(modelId);
    if (!name) return null;

    return {
        name,
        provider: "OpenAI",
        pricing: {
            input: model.input_cost_per_token,
            output: model.output_cost_per_token,
            cachedInput: getCachedInputCost(model),
        },
        maxInputTokens: model.max_input_tokens,
        maxOutputTokens: model.max_output_tokens ?? model.max_tokens,
    };
}

export default async function scrapeOpenaiData(fmt: DataFormat) {
    const models = await getModelsForProvider("openai", "chat");
    const addedModels = new Set<string>();

    for (const [modelId, model] of models) {
        if (!shouldIncludeModel(modelId)) continue;

        const definition = litellmModelToDefinition(modelId, model);
        if (!definition) continue;

        // Deduplicate by model name (prefer non-dated versions)
        const normalizedName = definition.name;
        if (addedModels.has(normalizedName)) continue;
        addedModels.add(normalizedName);

        await addModelToFormat(fmt, "openai", "global", definition);
    }

    fmt.vendors["openai"] = {
        cleanName: "OpenAI API",
        learnMoreUrl: "https://openai.com",
        euOrUKRegions: [],
        usaRegions: [],
        regionCleanNames: {
            "": {
                global: "Global",
            },
        },
    };

    console.log(`Finished scraping OpenAI data (${addedModels.size} models from LiteLLM)`);
}
