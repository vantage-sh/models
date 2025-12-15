import type { DataFormat } from "@/src/dataFormat";
import { addModelToFormat, type ModelDefinition } from "../shared";
import { getModelsForProvider, getCachedInputCost, type LiteLLMModel } from "../litellm";

// Model name overrides for cleaner display names
const MODEL_NAME_OVERRIDES: Record<string, string> = {
    "deepseek-chat": "DeepSeek Chat",
    "deepseek-reasoner": "DeepSeek Reasoner",
    "deepseek/deepseek-chat": "DeepSeek Chat",
    "deepseek/deepseek-reasoner": "DeepSeek Reasoner",
    "deepseek/deepseek-r1": "DeepSeek R1",
    "deepseek/deepseek-v3": "DeepSeek V3",
    "deepseek/deepseek-v3.2": "DeepSeek V3.2",
    "deepseek/deepseek-coder": "DeepSeek Coder",
};

// Models to include
const INCLUDED_MODEL_PATTERNS = [
    "deepseek-chat",
    "deepseek-reasoner",
    "deepseek-r1",
    "deepseek-v3",
    "deepseek-coder",
];

function shouldIncludeModel(modelId: string): boolean {
    const lowerModelId = modelId.toLowerCase();
    return INCLUDED_MODEL_PATTERNS.some(pattern => lowerModelId.includes(pattern));
}

function getModelName(modelId: string): string {
    // Check for exact override
    if (MODEL_NAME_OVERRIDES[modelId]) {
        return MODEL_NAME_OVERRIDES[modelId];
    }

    // Remove deepseek/ prefix and generate name
    let name = modelId.replace(/^deepseek\//, "");

    return name
        .split("-")
        .map(part => {
            if (part === "deepseek") return "DeepSeek";
            if (/^\d/.test(part) || /^v\d/.test(part)) return part.toUpperCase();
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
        provider: "DeepSeek",
        pricing: {
            input: model.input_cost_per_token,
            output: model.output_cost_per_token,
            cachedInput: getCachedInputCost(model),
        },
    };
}

export default async function scrapeDeepseekData(fmt: DataFormat) {
    const models = await getModelsForProvider("deepseek", "chat");
    const addedModels = new Set<string>();

    for (const [modelId, model] of models) {
        if (!shouldIncludeModel(modelId)) continue;

        const definition = litellmModelToDefinition(modelId, model);
        if (!definition) continue;

        // Deduplicate by model name
        const normalizedName = definition.name;
        if (addedModels.has(normalizedName)) continue;
        addedModels.add(normalizedName);

        await addModelToFormat(fmt, "deepseek", "global", definition);
    }

    fmt.vendors["deepseek"] = {
        cleanName: "DeepSeek API",
        learnMoreUrl: "https://www.deepseek.com",
        euOrUKRegions: [],
        regionCleanNames: {
            "": {
                "global": "Global",
            },
        },
    };

    console.log(`Finished scraping DeepSeek data (${addedModels.size} models from LiteLLM)`);
}
