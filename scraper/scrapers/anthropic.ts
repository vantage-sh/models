import type { DataFormat } from "@/src/dataFormat";
import { addModelToFormat, type ModelDefinition } from "../shared";
import { getModelsForProvider, getCachedInputCost, type LiteLLMModel } from "../litellm";

// Model name overrides for cleaner display names
const MODEL_NAME_OVERRIDES: Record<string, string> = {
    "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
    "claude-3-5-sonnet-latest": "Claude 3.5 Sonnet",
    "claude-3-5-haiku-20241022": "Claude 3.5 Haiku",
    "claude-3-5-haiku-latest": "Claude 3.5 Haiku",
    "claude-3-7-sonnet-20250219": "Claude 3.7 Sonnet",
    "claude-3-7-sonnet-latest": "Claude 3.7 Sonnet",
    "claude-3-opus-20240229": "Claude 3 Opus",
    "claude-3-opus-latest": "Claude 3 Opus",
    "claude-3-sonnet-20240229": "Claude 3 Sonnet",
    "claude-3-haiku-20240307": "Claude 3 Haiku",
    "claude-sonnet-4-20250514": "Claude Sonnet 4",
    "claude-sonnet-4-5-20250620": "Claude Sonnet 4.5",
    "claude-opus-4-1-20250515": "Claude Opus 4.1",
    "claude-opus-4-5-20251101": "Claude Opus 4.5",
    "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
    // Version naming patterns
    "claude-sonnet-4-5": "Claude Sonnet 4.5",
    "claude-opus-4-5": "Claude Opus 4.5",
    "claude-opus-4-1": "Claude Opus 4.1",
    "claude-haiku-4-5": "Claude Haiku 4.5",
};

// Models to include (filter out deprecated and irrelevant models)
const INCLUDED_MODEL_PREFIXES = [
    "claude-3-5-sonnet",
    "claude-3-5-haiku",
    "claude-3-7-sonnet",
    "claude-3-opus",
    "claude-3-sonnet",
    "claude-3-haiku",
    "claude-sonnet-4",
    "claude-opus-4",
    "claude-haiku-4",
];

function shouldIncludeModel(modelId: string): boolean {
    // Check if it matches any included prefix
    return INCLUDED_MODEL_PREFIXES.some(prefix => modelId.startsWith(prefix));
}

function getModelName(modelId: string): string {
    // Check for exact override
    if (MODEL_NAME_OVERRIDES[modelId]) {
        return MODEL_NAME_OVERRIDES[modelId];
    }

    // Remove date suffix first
    const cleanId = modelId.replace(/-\d{8}$/, "");

    // Check override for cleaned ID
    if (MODEL_NAME_OVERRIDES[cleanId]) {
        return MODEL_NAME_OVERRIDES[cleanId];
    }

    // Generate name from model ID, handling version numbers like 4-5 -> 4.5
    return cleanId
        .split("-")
        .map((part, index, arr) => {
            if (part === "claude") return "Claude";
            // Handle version numbers (e.g., "4" followed by "5" becomes "4.5")
            if (/^\d$/.test(part) && index > 0 && /^\d$/.test(arr[index - 1])) {
                return null; // Skip, will be combined with previous
            }
            if (/^\d$/.test(part) && index < arr.length - 1 && /^\d$/.test(arr[index + 1])) {
                return `${part}.${arr[index + 1]}`;
            }
            if (/^\d/.test(part)) return part;
            return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .filter(Boolean)
        .join(" ");
}

function litellmModelToDefinition(modelId: string, model: LiteLLMModel): ModelDefinition | null {
    if (!model.input_cost_per_token || !model.output_cost_per_token) {
        return null;
    }

    return {
        name: getModelName(modelId),
        provider: "Anthropic",
        pricing: {
            input: model.input_cost_per_token,
            output: model.output_cost_per_token,
            cachedInput: getCachedInputCost(model),
        },
    };
}

export default async function scrapeAnthropicData(fmt: DataFormat) {
    const models = await getModelsForProvider("anthropic", "chat");
    const addedModels = new Set<string>();

    for (const [modelId, model] of models) {
        if (!shouldIncludeModel(modelId)) continue;

        const definition = litellmModelToDefinition(modelId, model);
        if (!definition) continue;

        // Deduplicate by model name (prefer dated versions for specificity)
        const normalizedName = definition.name;
        if (addedModels.has(normalizedName)) continue;
        addedModels.add(normalizedName);

        await addModelToFormat(fmt, "anthropic", "global", definition);
    }

    fmt.vendors["anthropic"] = {
        cleanName: "Anthropic API",
        learnMoreUrl: "https://www.anthropic.com",
        euOrUKRegions: [],
        regionCleanNames: {
            "": {
                "global": "Global",
            },
        },
    };

    console.log(`Finished scraping Anthropic data (${addedModels.size} models from LiteLLM)`);
}
