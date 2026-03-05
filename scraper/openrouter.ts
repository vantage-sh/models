/**
 * Fetches model metadata from OpenRouter API.
 * OpenRouter aggregates models from many providers and has useful metadata
 * like release dates (created timestamp) and context lengths.
 * https://openrouter.ai/api/v1/models
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models";

export type OpenRouterModel = {
    id: string;
    name: string;
    created: number; // Unix timestamp
    context_length: number;
    architecture?: {
        modality: string;
        tokenizer: string;
        instruct_type?: string;
    };
    top_provider?: {
        context_length: number;
        max_completion_tokens: number | null;
    };
    pricing: {
        prompt: string;
        completion: string;
    };
};

type OpenRouterResponse = {
    data: OpenRouterModel[];
};

let cachedData: Promise<Map<string, OpenRouterModel>> | null = null;

/**
 * Fetches model metadata from OpenRouter. Results are cached.
 */
async function fetchOpenRouterModels(): Promise<Map<string, OpenRouterModel>> {
    if (cachedData) {
        return cachedData;
    }

    cachedData = fetch(OPENROUTER_API_URL)
        .then((res) => {
            if (!res.ok) {
                throw new Error(
                    `Failed to fetch OpenRouter models: ${res.status} ${res.statusText}`
                );
            }
            return res.json() as Promise<OpenRouterResponse>;
        })
        .then((data) => {
            const modelMap = new Map<string, OpenRouterModel>();
            for (const model of data.data) {
                // Store by full ID and also by simplified ID
                modelMap.set(model.id, model);

                // Also store by the model name without provider prefix
                const simplifiedId = model.id.split("/").pop();
                if (simplifiedId && !modelMap.has(simplifiedId)) {
                    modelMap.set(simplifiedId, model);
                }
            }
            return modelMap;
        });

    return cachedData;
}

// Mapping from our model IDs to OpenRouter model IDs
const MODEL_ID_MAPPINGS: Record<string, string[]> = {
    // Anthropic
    "claude-4-6-opus": ["anthropic/claude-opus-4.6"],
    "claude-4-6-sonnet": ["anthropic/claude-sonnet-4.6"],
    "claude-4-5-opus": ["anthropic/claude-opus-4.5", "anthropic/claude-4-opus"],
    "claude-4-5-sonnet": ["anthropic/claude-sonnet-4.5"],
    "claude-4-5-haiku": ["anthropic/claude-haiku-4.5"],
    "claude-opus-4-6": ["anthropic/claude-opus-4.6"],
    "claude-sonnet-4-6": ["anthropic/claude-sonnet-4.6"],
    "claude-opus-4-5": ["anthropic/claude-opus-4.5", "anthropic/claude-4-opus"],
    "claude-opus-4-1": ["anthropic/claude-opus-4.1", "anthropic/claude-4.1-opus"],
    "claude-sonnet-4-5": ["anthropic/claude-sonnet-4.5"],
    "claude-sonnet-4": ["anthropic/claude-sonnet-4", "anthropic/claude-4-sonnet"],
    "claude-haiku-4-5": ["anthropic/claude-haiku-4.5"],
    "claude-3-7-sonnet": ["anthropic/claude-3.7-sonnet"],
    "claude-3-5-sonnet": ["anthropic/claude-3.5-sonnet"],
    "claude-3-5-haiku": ["anthropic/claude-3.5-haiku"],
    "claude-3-opus": ["anthropic/claude-3-opus"],
    "claude-3-sonnet": ["anthropic/claude-3-sonnet"],
    "claude-3-haiku": ["anthropic/claude-3-haiku"],
    // OpenAI
    "gpt-4o": ["openai/gpt-4o"],
    "gpt-4o-mini": ["openai/gpt-4o-mini"],
    "gpt-4-turbo": ["openai/gpt-4-turbo"],
    "gpt-4": ["openai/gpt-4"],
    "gpt-4-1": ["openai/gpt-4.1"],
    "gpt-5": ["openai/gpt-5"],
    "gpt-5.1": ["openai/gpt-5.1"],
    "gpt-5.2": ["openai/gpt-5.2"],
    "gpt-5.3": ["openai/gpt-5.3"],
    "gpt-5.4": ["openai/gpt-5.4"],
    o1: ["openai/o1"],
    "o1-mini": ["openai/o1-mini"],
    o3: ["openai/o3"],
    "o3-mini": ["openai/o3-mini"],
    // DeepSeek
    "deepseek-chat": ["deepseek/deepseek-chat"],
    "deepseek-reasoner": ["deepseek/deepseek-reasoner", "deepseek/deepseek-r1"],
    "deepseek-r1": ["deepseek/deepseek-r1"],
    "deepseek-v3": ["deepseek/deepseek-chat"], // V3 is the chat model
    // Google
    "gemini-2-5-pro": ["google/gemini-2.5-pro", "google/gemini-pro-2.5"],
    "gemini-2-5-flash": ["google/gemini-2.5-flash", "google/gemini-flash-2.5"],
    "gemini-2-0-flash": ["google/gemini-2.0-flash", "google/gemini-flash-2.0"],
    "gemini-1-5-pro": ["google/gemini-pro-1.5"],
    "gemini-1-5-flash": ["google/gemini-flash-1.5"],
    // Mistral
    "mistral-large": ["mistralai/mistral-large"],
    "mistral-medium": ["mistralai/mistral-medium"],
    "mistral-small": ["mistralai/mistral-small"],
    codestral: ["mistralai/codestral-latest", "mistralai/codestral"],
    magistral: ["mistralai/magistral-medium", "mistralai/magistral-small"],
    // Meta
    "llama-3-3": ["meta-llama/llama-3.3-70b-instruct"],
    "llama-3-2": [
        "meta-llama/llama-3.2-90b-vision-instruct",
        "meta-llama/llama-3.2-11b-vision-instruct",
    ],
    "llama-3-1": ["meta-llama/llama-3.1-405b-instruct", "meta-llama/llama-3.1-70b-instruct"],
    "llama-4": ["meta-llama/llama-4-scout", "meta-llama/llama-4-maverick"],
    // Qwen
    "qwen-max": ["qwen/qwen-max", "qwen/qwen-2.5-72b-instruct"],
    "qwen-plus": ["qwen/qwen-plus", "qwen/qwen-2.5-32b-instruct"],
    "qwen-turbo": ["qwen/qwen-turbo"],
    qwen3: ["qwen/qwen3-235b-a22b"],
};

/**
 * Find an OpenRouter model by trying various ID patterns.
 */
function findOpenRouterModel(
    modelId: string,
    models: Map<string, OpenRouterModel>
): OpenRouterModel | undefined {
    // First try direct mappings
    let mappings: string[] | undefined = MODEL_ID_MAPPINGS[modelId];
    if (mappings) {
        for (const mapping of mappings) {
            const model = models.get(mapping);
            if (model) return model;
        }
    }

    // Then try prefix mappings for variants (e.g., "-thinking-high")
    mappings = Object.entries(MODEL_ID_MAPPINGS)
        .sort((a, b) => b[0].length - a[0].length)
        .find(([prefix]) => modelId.startsWith(prefix))?.[1];
    if (mappings) {
        for (const mapping of mappings) {
            const model = models.get(mapping);
            if (model) return model;
        }
    }

    // Try exact match
    let model = models.get(modelId);
    if (model) return model;

    // Try with provider prefixes
    const providers = [
        "anthropic",
        "openai",
        "google",
        "meta-llama",
        "mistralai",
        "deepseek",
        "qwen",
    ];
    for (const provider of providers) {
        model = models.get(`${provider}/${modelId}`);
        if (model) return model;
    }

    // Try converting dashes to dots for version numbers (e.g., claude-3-5 -> claude-3.5)
    const dottedId = modelId.replace(/-(\d+)-(\d+)/, "-$1.$2");
    if (dottedId !== modelId) {
        model = models.get(dottedId);
        if (model) return model;

        for (const provider of providers) {
            model = models.get(`${provider}/${dottedId}`);
            if (model) return model;
        }
    }

    // Try partial matching - find models whose ID contains our model ID
    // This handles cases like "pixtral-large" matching "mistralai/pixtral-large-2411"
    for (const [openRouterId, openRouterModel] of models.entries()) {
        // Skip if it's the simplified key (which is already the model name without prefix)
        if (!openRouterId.includes("/")) continue;

        const modelName = openRouterId.split("/").pop()?.toLowerCase() ?? "";
        const searchId = modelId.toLowerCase();

        // Check if model name starts with our ID (e.g., pixtral-large-2411 starts with pixtral-large)
        if (modelName.startsWith(searchId)) {
            return openRouterModel;
        }

        // Also try without version suffixes in our ID (e.g., ministral-8b matches ministral-8b-2512)
        const baseSearchId = searchId.replace(/-\d+b?$/, "");
        if (baseSearchId !== searchId && modelName.startsWith(baseSearchId)) {
            return openRouterModel;
        }
    }

    return undefined;
}

/**
 * Get release date for a model from OpenRouter data.
 * Returns date string in YYYY-MM-DD format.
 */
export async function getReleaseDateFromOpenRouter(modelId: string): Promise<string | undefined> {
    try {
        const models = await fetchOpenRouterModels();
        const model = findOpenRouterModel(modelId, models);

        if (model && model.created) {
            const date = new Date(model.created * 1000);
            return date.toISOString().split("T")[0];
        }
    } catch (error) {
        console.warn(`Failed to get release date from OpenRouter for ${modelId}:`, error);
    }

    return undefined;
}

/**
 * Get context length (max input tokens) from OpenRouter data.
 */
export async function getContextLengthFromOpenRouter(modelId: string): Promise<number | undefined> {
    try {
        const models = await fetchOpenRouterModels();
        const model = findOpenRouterModel(modelId, models);

        if (model) {
            return model.context_length || model.top_provider?.context_length;
        }
    } catch (error) {
        console.warn(`Failed to get context length from OpenRouter for ${modelId}:`, error);
    }

    return undefined;
}

/**
 * Get max completion tokens from OpenRouter data.
 */
export async function getMaxOutputTokensFromOpenRouter(
    modelId: string
): Promise<number | undefined> {
    try {
        const models = await fetchOpenRouterModels();
        const model = findOpenRouterModel(modelId, models);

        if (model?.top_provider?.max_completion_tokens) {
            return model.top_provider.max_completion_tokens;
        }
    } catch (error) {
        console.warn(`Failed to get max output tokens from OpenRouter for ${modelId}:`, error);
    }

    return undefined;
}

/**
 * Get all available metadata from OpenRouter for a model.
 */
export async function getOpenRouterMetadata(modelId: string): Promise<{
    releaseDate?: string;
    maxInputTokens?: number;
    maxOutputTokens?: number;
}> {
    try {
        const models = await fetchOpenRouterModels();
        const model = findOpenRouterModel(modelId, models);

        if (!model) {
            return {};
        }

        const result: {
            releaseDate?: string;
            maxInputTokens?: number;
            maxOutputTokens?: number;
        } = {};

        if (model.created) {
            const date = new Date(model.created * 1000);
            result.releaseDate = date.toISOString().split("T")[0];
        }

        if (model.context_length) {
            result.maxInputTokens = model.context_length;
        } else if (model.top_provider?.context_length) {
            result.maxInputTokens = model.top_provider.context_length;
        }

        if (model.top_provider?.max_completion_tokens) {
            result.maxOutputTokens = model.top_provider.max_completion_tokens;
        }

        return result;
    } catch (error) {
        console.warn(`Failed to get OpenRouter metadata for ${modelId}:`, error);
        return {};
    }
}
