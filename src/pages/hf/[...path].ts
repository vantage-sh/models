import type { APIRoute, GetStaticPaths } from "astro";

// HuggingFace API token for accessing gated models (optional)
const HF_TOKEN = process.env.HF_TOKEN;

// Models that require authentication (gated)
const GATED_MODELS = [
    // Meta Llama - requires license agreement
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "meta-llama/Llama-3.3-70B-Instruct",
    "meta-llama/Llama-3.2-3B-Instruct",
    "meta-llama/Llama-3.1-8B-Instruct",
    // Google Gemma - requires license agreement
    "google/gemma-3-1b-it",
    "google/gemma-2-9b-it",
];

// Publicly accessible models (no auth required)
const PUBLIC_MODELS = [
    // Mistral
    "mistralai/Mistral-Large-Instruct-2411",
    "mistralai/Mistral-Small-24B-Instruct-2501",
    "mistralai/Codestral-22B-v0.1",
    "mistralai/Pixtral-Large-Instruct-2411",
    "mistralai/Mixtral-8x22B-Instruct-v0.1",
    "mistralai/Mistral-7B-Instruct-v0.3",
    // DeepSeek
    "deepseek-ai/DeepSeek-R1",
    "deepseek-ai/DeepSeek-V3",
    // Qwen
    "Qwen/Qwen3-235B-A22B",
    "Qwen/Qwen2.5-72B-Instruct",
    "Qwen/Qwen2.5-32B-Instruct",
    "Qwen/Qwen2.5-14B-Instruct",
    "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    "Qwen/Qwen3-32B",
    "Qwen/Qwen2.5-Coder-32B-Instruct",
    // IBM Granite
    "ibm-granite/granite-3.0-8b-instruct",
];

// All models to proxy
const HUGGINGFACE_MODELS = [...PUBLIC_MODELS, ...GATED_MODELS];

// Files needed for tokenizers
const TOKENIZER_FILES = [
    "tokenizer.json",
    "tokenizer_config.json",
    "vocab.json",
    "merges.txt",
    "special_tokens_map.json",
    "config.json",
];

// Track if we've warned about missing token
let warnedAboutMissingToken = false;

export const prerender = true;

// Generate static paths for each model + file combination
export const getStaticPaths: GetStaticPaths = () => {
    const paths: { params: { path: string } }[] = [];

    for (const model of HUGGINGFACE_MODELS) {
        for (const file of TOKENIZER_FILES) {
            paths.push({
                params: { path: `${model}/resolve/main/${file}` },
            });
        }
    }

    return paths;
};

// Cache for development
const cache = new Map<string, ArrayBuffer | null>();

function isGatedModel(path: string): boolean {
    return GATED_MODELS.some((model) => path.startsWith(model));
}

export const GET: APIRoute = async ({ params }) => {
    const path = params.path;

    if (!path) {
        return new Response("Invalid path", { status: 404 });
    }

    // Validate the path is in our allowed list
    const isAllowed = HUGGINGFACE_MODELS.some((model) =>
        TOKENIZER_FILES.some((file) => path === `${model}/resolve/main/${file}`)
    );

    if (!isAllowed) {
        return new Response("Path not allowed", { status: 403 });
    }

    // Check cache first (for dev server)
    if (cache.has(path)) {
        const cached = cache.get(path);
        if (cached === null) {
            return new Response("File not found on HuggingFace", { status: 404 });
        }
        return new Response(cached, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    }

    const sourceUrl = `https://huggingface.co/${path}`;
    const isGated = isGatedModel(path);

    // Warn once if trying to fetch gated model without token
    if (isGated && !HF_TOKEN && !warnedAboutMissingToken) {
        console.warn(
            "\n⚠️  HF_TOKEN environment variable not set.\n" +
                "   Gated models (Meta Llama, Google Gemma) require a HuggingFace token.\n" +
                "   To enable these tokenizers, set HF_TOKEN with a token that has accepted the model licenses.\n" +
                "   Get a token at: https://huggingface.co/settings/tokens\n"
        );
        warnedAboutMissingToken = true;
    }

    console.log(`Fetching HuggingFace file from ${sourceUrl}${isGated ? " (gated)" : ""}`);

    try {
        const headers: Record<string, string> = {};
        if (HF_TOKEN) {
            headers["Authorization"] = `Bearer ${HF_TOKEN}`;
        }

        const response = await fetch(sourceUrl, { headers });

        if (!response.ok) {
            // Some files may not exist for all models, or require authentication
            if (response.status === 404 || response.status === 401 || response.status === 403) {
                if (isGated && (response.status === 401 || response.status === 403)) {
                    console.log(
                        `Gated model file unavailable (${response.status}): ${path} - ` +
                            (HF_TOKEN
                                ? "token may not have accepted the license"
                                : "no HF_TOKEN provided")
                    );
                } else {
                    console.log(`File unavailable (${response.status}): ${path}`);
                }
                cache.set(path, null);
                return new Response(`File unavailable: ${response.status}`, { status: 404 });
            }
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const data = await response.arrayBuffer();
        cache.set(path, data);

        console.log(`Cached HuggingFace file ${path} (${(data.byteLength / 1024).toFixed(1)} KB)`);

        return new Response(data, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error(`Error fetching ${path}:`, error);
        throw error;
    }
};
