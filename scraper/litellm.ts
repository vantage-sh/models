/**
 * Fetches and parses LiteLLM pricing data from their GitHub repository.
 * This is a community-maintained, regularly updated source of LLM pricing.
 * https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json
 */

const LITELLM_PRICING_URL =
    "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

export type LiteLLMModel = {
    input_cost_per_token?: number;
    output_cost_per_token?: number;
    cache_read_input_token_cost?: number;
    cache_creation_input_token_cost?: number;
    input_cost_per_token_cache_hit?: number;
    input_cost_per_image?: number;
    input_cost_per_pixel?: number;
    output_cost_per_image?: number;
    litellm_provider?: string;
    max_input_tokens?: number;
    max_output_tokens?: number;
    max_tokens?: number;
    mode?: string;
    supports_reasoning?: boolean;
    supports_function_calling?: boolean;
    supports_vision?: boolean;
    source?: string;
    deprecation_date?: string;
};

export type LiteLLMPricingData = Record<string, LiteLLMModel>;

let cachedData: Promise<LiteLLMPricingData> | null = null;

/**
 * Fetches the LiteLLM pricing data. Results are cached for the duration of the scrape.
 */
export async function fetchLiteLLMPricing(): Promise<LiteLLMPricingData> {
    if (cachedData) {
        return cachedData;
    }

    cachedData = fetch(LITELLM_PRICING_URL).then((res) => {
        if (!res.ok) {
            throw new Error(`Failed to fetch LiteLLM pricing: ${res.status} ${res.statusText}`);
        }
        return res.json();
    });

    return cachedData;
}

/**
 * Gets models for a specific provider from the LiteLLM pricing data.
 * @param provider - The litellm_provider value to filter by (e.g., "openai", "anthropic", "mistral")
 * @param mode - Optional mode filter (e.g., "chat" for chat models only)
 */
export async function getModelsForProvider(
    provider: string,
    mode: string = "chat"
): Promise<Map<string, LiteLLMModel>> {
    const data = await fetchLiteLLMPricing();
    const models = new Map<string, LiteLLMModel>();

    for (const [modelId, model] of Object.entries(data)) {
        // Skip the sample_spec entry
        if (modelId === "sample_spec") continue;

        // Filter by provider
        if (model.litellm_provider !== provider) continue;

        // Filter by mode if specified
        if (mode && model.mode !== mode) continue;

        // Skip models without pricing
        if (model.input_cost_per_token === undefined && model.output_cost_per_token === undefined) {
            continue;
        }

        // Skip deprecated models
        if (model.deprecation_date) {
            const deprecationDate = new Date(model.deprecation_date);
            if (deprecationDate < new Date()) {
                continue;
            }
        }

        models.set(modelId, model);
    }

    return models;
}

/**
 * Extracts a clean model name from a LiteLLM model ID.
 * Removes provider prefixes and normalizes the name.
 */
export function cleanModelName(modelId: string, provider: string): string | null {
    // Remove provider prefix (e.g., "openai/gpt-4o" -> "gpt-4o", "mistral/mistral-large" -> "mistral-large")
    let name = modelId;

    // Common prefixes to remove
    const prefixes = [
        `${provider}/`,
        "openai/",
        "anthropic/",
        "mistral/",
        "gemini/",
        "vertex_ai/",
        "deepseek/",
        "dashscope/",
    ];

    for (const prefix of prefixes) {
        if (name.startsWith(prefix)) {
            name = name.slice(prefix.length);
            break;
        }
    }

    // Convert to title case and clean up
    const res = name
        .split(/[-_]/)
        .map((part) => {
            // Keep version numbers as-is
            if (/^\d/.test(part)) return part;
            // Keep common abbreviations uppercase
            if (["gpt", "llm", "ai"].includes(part.toLowerCase())) {
                return part.toUpperCase();
            }
            // Title case
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join(" ")
        .replace(/(\d+)([a-z])/gi, "$1 $2") // Space before letters after numbers
        .replace(/\s+/g, " ")
        .trim();
    if (res.toLowerCase().includes("preview") || res.toLowerCase().includes("latest")) {
        return null;
    }
    return res;
}

/**
 * Gets the cached input cost from a LiteLLM model.
 * LiteLLM uses different field names for cached input costs.
 */
export function getCachedInputCost(model: LiteLLMModel): number | undefined {
    return model.cache_read_input_token_cost ?? model.input_cost_per_token_cache_hit;
}
