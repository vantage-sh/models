import type { DataFormat } from "@/src/dataFormat";
import { addModelToFormat, type ModelDefinition } from "../shared";
import { getModelsForProvider, getCachedInputCost, type LiteLLMModel } from "../litellm";

// Model name overrides for cleaner display names
const MODEL_NAME_OVERRIDES: Record<string, string> = {
    "dashscope/qwen-max": "Qwen Max",
    "dashscope/qwen-plus": "Qwen Plus",
    "dashscope/qwen-turbo": "Qwen Turbo",
    "dashscope/qwen-flash": "Qwen Flash",
    "dashscope/qwen-coder": "Qwen Coder",
    "dashscope/qwen-long": "Qwen Long",
    "dashscope/qwen-vl-max": "Qwen VL Max",
    "dashscope/qwen-vl-plus": "Qwen VL Plus",
};

// Models to include
const INCLUDED_MODEL_PATTERNS = [
    "qwen-max",
    "qwen-plus",
    "qwen-turbo",
    "qwen-flash",
    "qwen-coder",
    "qwen-long",
];

function shouldIncludeModel(modelId: string): boolean {
    const lowerModelId = modelId.toLowerCase();

    // Skip VL (vision-language) models and embedding models
    if (lowerModelId.includes("-vl")) return false;
    if (lowerModelId.includes("embed")) return false;

    return INCLUDED_MODEL_PATTERNS.some(pattern => lowerModelId.includes(pattern));
}

function getModelName(modelId: string): string {
    // Check for exact override
    if (MODEL_NAME_OVERRIDES[modelId]) {
        return MODEL_NAME_OVERRIDES[modelId];
    }

    // Remove dashscope/ prefix and generate name
    let name = modelId.replace(/^dashscope\//, "");

    // Remove date suffixes
    name = name.replace(/-\d{4}-\d{2}-\d{2}$/, "");

    return name
        .split("-")
        .map(part => {
            if (part === "qwen") return "Qwen";
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
        provider: "Qwen",
        pricing: {
            input: model.input_cost_per_token,
            output: model.output_cost_per_token,
            cachedInput: getCachedInputCost(model),
        },
    };
}

export default async function scrapeAlibabaData(fmt: DataFormat) {
    const models = await getModelsForProvider("dashscope", "chat");
    const addedModels = new Set<string>();

    for (const [modelId, model] of models) {
        if (!shouldIncludeModel(modelId)) continue;

        const definition = litellmModelToDefinition(modelId, model);
        if (!definition) continue;

        // Deduplicate by model name
        const normalizedName = definition.name;
        if (addedModels.has(normalizedName)) continue;
        addedModels.add(normalizedName);

        // Add to multiple regions
        await addModelToFormat(fmt, "alibaba", "cn-shanghai", definition);
        await addModelToFormat(fmt, "alibaba", "ap-southeast-1", definition);
    }

    fmt.vendors["alibaba"] = {
        cleanName: "Alibaba Cloud Model Studio",
        learnMoreUrl: "https://www.alibabacloud.com/product/model-studio",
        euOrUKRegions: [],
        regionCleanNames: {
            "": {
                "cn-shanghai": "China (Shanghai)",
                "ap-southeast-1": "Singapore",
            },
        },
    };

    console.log(`Finished scraping Alibaba Cloud data (${addedModels.size} models from LiteLLM)`);
}
