import type { Tokenizers } from "@/src/dataFormat";
import {
    nullable,
    array,
    number,
    object,
    parse,
    string,
    type BaseSchema,
    type InferOutput,
} from "valibot";

const MODEL_REASONING_PREFIXES = {
    // OpenAI
    "gpt-oss": true,
    "gpt-5": true,
    "gpt-4-1": true, // GPT-4.1
    "gpt-4o": true,
    "gpt-4-turbo": true,
    "gpt-4": true,
    "gpt-3": true,
    o3: true,
    o1: true,
    // Anthropic
    "claude-opus-4": true,
    "claude-sonnet-4": true,
    "claude-haiku-4": true,
    "claude-3-opus": true,
    "claude-3-sonnet": true,
    "claude-3-haiku": true,
    "claude-haiku-3": true,
    "claude-instant": false,
    "claude-2": true,
    "claude-3": true,
    // Meta
    "llama-4": false,
    "llama-3-3": true,
    "llama-3": true,
    // Mistral
    magistral: true,
    "mistral-large": true,
    "mistral-medium": true,
    "mistral-small": true,
    "mistral-7b": true,
    ministral: true,
    codestral: true,
    mixtral: true,
    pixtral: true,
    voxtral: false,
    devstral: false,
    // DeepSeek
    "deepseek-r1": true,
    "deepseek-reasoner": true,
    "deepseek-chat": true,
    "deepseek-v3": true,
    // Qwen
    "qwen3-max": true,
    "qwen-max": true,
    "qwen-plus": true,
    "qwen-turbo": true,
    "qwen3-235b-a22b": true,
    "qwen3-coder": true,
    "qwen3-32": false,
    "qwen-coder": true,
    // Google
    "gemini-3": true,
    "gemini-2-5": true,
    "gemini-2-0": true,
    "gemini-1-5": true,
    "gemma-3": true,
    // IBM
    "granite-3": true,
    granite: true,
    // Kimi AI
    "kimi-k2-thinking": true,
    "kimi-k2-5": false,
    qwen3: true,
    // Nvidia
    "nvidia-nemotron-nano": true,
    // Minimax AI
    "minimax-m2": false,
    // GLM
    "glm-": true,
    // Microsoft
    "phi-4": false,
    phi: false,
    // Writer
    "writer-palmyra": true,
} as const;

export function isReasoningModel(modelId: string): boolean {
    for (const [prefix, isReasoning] of Object.entries(MODEL_REASONING_PREFIXES).sort(
        // Longer prefixes first
        (a, b) => b[0].length - a[0].length
    )) {
        if (modelId.startsWith(prefix)) {
            return isReasoning;
        }
    }

    throw new Error(
        `Unknown model ID: ${modelId}. Please add it to MODEL_REASONING_PREFIXES in scraper/constants.ts.`
    );
}

export type ReasoningTier = "none" | "basic" | "extended";

// Models with extended reasoning capabilities (chain-of-thought, extended thinking)
const EXTENDED_REASONING_PREFIXES = [
    "o1",
    "o3",
    "deepseek-r1",
    "deepseek-reasoner",
    "claude-3-7-sonnet", // Extended thinking capable
    "claude-sonnet-4", // Extended thinking capable
    "claude-opus-4", // Extended thinking capable
    "gemini-2-5", // Thinking mode
    "qwen3", // Thinking mode
    "magistral", // Reasoning model
];

export function getReasoningTier(modelId: string): ReasoningTier {
    // Check for extended reasoning models first
    for (const prefix of EXTENDED_REASONING_PREFIXES) {
        if (modelId.startsWith(prefix)) {
            return "extended";
        }
    }

    // Check if it's a reasoning model at all
    try {
        if (isReasoningModel(modelId)) {
            return "basic";
        }
    } catch {
        // Unknown model, default to none
    }

    return "none";
}

// Model metadata: training cutoff dates
// Format: "YYYY-MM" or "YYYY-MM-DD" for more precision
const MODEL_TRAINING_CUTOFFS: Record<string, string | null> = {
    // OpenAI
    "gpt-5": "2024-12",
    "gpt-4-1": "2024-06",
    "gpt-4o": "2023-10",
    "gpt-4-turbo": "2023-12",
    "gpt-4": "2021-09",
    "gpt-3": "2021-09",
    o3: "2024-12",
    o1: "2023-10",
    // Anthropic
    "claude-opus-4-6": "2025-08",
    "claude-sonnet-4-6": "2026-01",
    "claude-haiku-4-5": "2025-07",
    "claude-opus-4": "2025-03",
    "claude-sonnet-4": "2025-03",
    "claude-haiku-4": "2025-03",
    "claude-3-7-sonnet": "2024-11",
    "claude-3-5-sonnet": "2024-04",
    "claude-3-5-haiku": "2024-04",
    "claude-3-opus": "2023-08",
    "claude-3-sonnet": "2023-08",
    "claude-3-haiku": "2023-08",
    // Meta
    "llama-4": "2024-08",
    "llama-3-3": "2023-12",
    "llama-3": "2023-03",
    // Mistral
    magistral: "2024-12",
    "mistral-large": "2024-11",
    "mistral-medium": "2024-07",
    "mistral-small": "2024-09",
    // DeepSeek
    "deepseek-r1": "2024-11",
    "deepseek-v3": "2024-11",
    // Qwen
    qwen3: "2024-09",
    "qwen-max": "2024-06",
    // Google
    "gemini-2-5": "2025-01",
    "gemini-2-0": "2024-08",
    "gemini-1-5": "2023-11",
};

export function getTrainingCutoff(modelId: string): string | undefined {
    for (const [prefix, cutoff] of Object.entries(MODEL_TRAINING_CUTOFFS).sort(
        (a, b) => b[0].length - a[0].length
    )) {
        if (modelId.startsWith(prefix)) {
            return cutoff;
        }
    }
    return undefined;
}

// Model metadata: release dates
// Format: "YYYY-MM-DD"
const MODEL_RELEASE_DATES: Record<string, string> = {
    // OpenAI
    "gpt-4o": "2024-05-13",
    "gpt-4-turbo": "2024-04-09",
    "gpt-4": "2023-03-14",
    o3: "2025-04-16",
    "o1-pro": "2024-12-05",
    o1: "2024-09-12",
    // Anthropic
    "claude-opus-4-6": "2026-02-05",
    "claude-sonnet-4-6": "2026-02-17",
    "claude-opus-4-5": "2025-11-01",
    "claude-opus-4-1": "2025-08-05",
    "claude-sonnet-4-5": "2025-09-29",
    "claude-sonnet-4": "2025-05-14",
    "claude-haiku-4-5": "2025-10-01",
    "claude-3-7-sonnet": "2025-02-19",
    "claude-3-5-sonnet": "2024-06-20",
    "claude-3-5-haiku": "2024-10-22",
    "claude-3-opus": "2024-02-29",
    "claude-3-sonnet": "2024-02-29",
    "claude-3-haiku": "2024-03-07",
    // Meta
    "llama-4": "2025-04-05",
    "llama-3-3": "2024-12-06",
    "llama-3-2": "2024-09-25",
    "llama-3-1": "2024-07-23",
    "llama-3": "2024-04-18",
    // Mistral
    magistral: "2025-05-29",
    "mistral-large": "2024-02-26",
    "mistral-medium": "2023-12-11",
    "mistral-small": "2024-09-17",
    // DeepSeek
    "deepseek-r1": "2025-01-20",
    "deepseek-v3": "2024-12-26",
    // Qwen
    "qwen3-235b": "2025-04-28",
    "qwen3-max": "2025-04-28",
    // Google
    "gemini-2-5": "2025-03-25",
    "gemini-2-0": "2024-12-11",
    "gemini-1-5": "2024-02-15",
};

export function getReleaseDate(modelId: string): string | undefined {
    for (const [prefix, date] of Object.entries(MODEL_RELEASE_DATES).sort(
        (a, b) => b[0].length - a[0].length
    )) {
        if (modelId.startsWith(prefix)) {
            return date;
        }
    }
    return undefined;
}

export function isSelfHostableModel(modelId: string, provider: string): boolean {
    if (provider === "Meta") {
        // All Meta models are self-hostable
        return true;
    }

    if (provider === "Anthropic") {
        // No Anthropic models are self-hostable
        return false;
    }

    if (provider === "OpenAI") {
        if (modelId.startsWith("gpt-oss-")) {
            return true;
        }
        return false;
    }

    if (provider === "Qwen") {
        // All Qwen models are self-hostable
        return true;
    }

    if (provider === "DeepSeek") {
        // All DeepSeek models are self-hostable
        return true;
    }

    if (provider.startsWith("Mistral")) {
        // All Mistral models are self-hostable
        return true;
    }

    if (provider === "Google") {
        // No Google models are self-hostable
        return false;
    }

    if (provider === "IBM") {
        // IBM Granite models are self-hostable
        if (modelId.startsWith("granite")) {
            return true;
        }
        return false;
    }

    if (provider === "Kimi AI") {
        // Kimi AI models are self-hostable
        return true;
    }

    if (provider === "Nvidia") {
        // Nvidia models are self-hostable
        return true;
    }

    if (provider === "Minimax AI") {
        // Minimax AI models are self-hostable
        return true;
    }

    if (provider === "Moonshot AI") {
        // Moonshot AI models are self-hostable
        return true;
    }

    if (provider === "Z AI") {
        // Z AI models are self-hostable
        return true;
    }

    if (provider === "Microsoft") {
        // Microsoft Phi models are open-source and self-hostable
        return true;
    }

    if (provider === "Writer") {
        // Writer Palmyra model is not self-hostable
        return false;
    }

    throw new Error(
        `Unknown self-hostable status for model ID: ${modelId} with provider: ${provider}. Please update isSelfHostableModel in scraper/constants.ts.`
    );
}

// Tiktoken BPE file URLs (proxied through our server to avoid CORS issues)
const TIKTOKEN_CL100K = "/tiktoken/cl100k_base.tiktoken";
const TIKTOKEN_O200K = "/tiktoken/o200k_base.tiktoken";

// Map of model prefixes to their HuggingFace tokenizer paths
const TRANSFORMERS_TOKENIZER_PATHS: Record<string, string> = {
    // Meta/Llama
    "llama-4": "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "llama-3-3": "meta-llama/Llama-3.3-70B-Instruct",
    "llama-3-2": "meta-llama/Llama-3.2-3B-Instruct",
    "llama-3-1": "meta-llama/Llama-3.1-8B-Instruct",
    "llama-3": "meta-llama/Llama-3.1-8B-Instruct",
    // Mistral
    magistral: "mistralai/Mistral-Large-Instruct-2411",
    "mistral-large": "mistralai/Mistral-Large-Instruct-2411",
    "mistral-medium": "mistralai/Mistral-Large-Instruct-2411",
    "mistral-small": "mistralai/Mistral-Small-24B-Instruct-2501",
    ministral: "mistralai/Mistral-Small-24B-Instruct-2501",
    codestral: "mistralai/Codestral-22B-v0.1",
    pixtral: "mistralai/Pixtral-Large-Instruct-2411",
    mixtral: "mistralai/Mixtral-8x22B-Instruct-v0.1",
    "mistral-7b": "mistralai/Mistral-7B-Instruct-v0.3",
    // DeepSeek
    "deepseek-reasoner": "deepseek-ai/DeepSeek-R1",
    "deepseek-chat": "deepseek-ai/DeepSeek-V3",
    "deepseek-r1": "deepseek-ai/DeepSeek-R1",
    "deepseek-v3": "deepseek-ai/DeepSeek-V3",
    // Qwen
    "qwen3-max": "Qwen/Qwen3-235B-A22B",
    "qwen-max": "Qwen/Qwen2.5-72B-Instruct",
    "qwen-plus": "Qwen/Qwen2.5-32B-Instruct",
    "qwen-turbo": "Qwen/Qwen2.5-14B-Instruct",
    "qwen3-235b": "Qwen/Qwen3-235B-A22B",
    "qwen3-coder": "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    "qwen3-32": "Qwen/Qwen3-32B",
    qwen3: "Qwen/Qwen3-32B",
    "qwen-coder": "Qwen/Qwen2.5-Coder-32B-Instruct",
    // Google Gemma (open tokenizer, but gated - requires HF token)
    "gemma-3": "google/gemma-3-1b-it",
    "gemma-2": "google/gemma-2-9b-it",
    gemma: "google/gemma-2-9b-it",
    // IBM Granite
    granite: "ibm-granite/granite-3.0-8b-instruct",
    // Microsoft Phi
    "phi-4": "microsoft/Phi-4",
    phi: "microsoft/Phi-4",
};

export function getTokenizerForModel(modelId: string, provider: string): Tokenizers | undefined {
    // OpenAI models use tiktoken
    if (provider === "OpenAI") {
        // GPT-5, GPT-4.1, GPT-4o, o-series and newer use o200k_base
        if (
            modelId.startsWith("gpt-5") ||
            modelId.startsWith("gpt-4-1") ||
            modelId.startsWith("gpt-4o") ||
            modelId.startsWith("gpt-oss") ||
            modelId.startsWith("o3") ||
            modelId.startsWith("o1")
        ) {
            return { type: "tiktoken", bpePath: TIKTOKEN_O200K };
        }
        // Older GPT-4, GPT-3.5 use cl100k_base
        if (modelId.startsWith("gpt-4") || modelId.startsWith("gpt-3")) {
            return { type: "tiktoken", bpePath: TIKTOKEN_CL100K };
        }
        return undefined;
    }

    // Anthropic Claude - no public tokenizer available
    if (provider === "Anthropic") {
        return undefined;
    }

    // Google Gemini - no public tokenizer available (proprietary)
    // Gemma models have public tokenizers, so let them fall through to the lookup
    if (provider === "Google" && !modelId.startsWith("gemma")) {
        return undefined;
    }

    // For other providers, look up in the transformers tokenizer map
    // Sort by prefix length (longest first) for more specific matches
    const sortedPrefixes = Object.keys(TRANSFORMERS_TOKENIZER_PATHS).sort(
        (a, b) => b.length - a.length
    );

    for (const prefix of sortedPrefixes) {
        if (modelId.startsWith(prefix)) {
            return {
                type: "transformers",
                pretrainedPath: TRANSFORMERS_TOKENIZER_PATHS[prefix],
            };
        }
    }

    return undefined;
}

async function fetchAndParse<S extends BaseSchema<any, any, any>>(
    url: string,
    schema: S,
    headers?: Record<string, string>
): Promise<InferOutput<S>> {
    const res = await fetch(url, headers ? { headers } : undefined);
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return parse(schema, data);
}

const ranking = object({
    model: string(),
    correct: number(),
    incorrect: number(),
    totalTests: number(),
    successRate: number(),
    averageCostPerTest: number(),
});

const skateBenchRankingsObj = object({
    rankings: array(ranking),
});

let skatebenchResult: Promise<InferOutput<typeof skateBenchRankingsObj>> | null = null;

async function getSkatebenchScores() {
    if (skatebenchResult) {
        return (await skatebenchResult).rankings;
    }
    const res = fetchAndParse(
        "https://raw.githubusercontent.com/T3-Content/skatebench/refs/heads/main/visualizer/data/benchmark-results.json",
        skateBenchRankingsObj
    );
    skatebenchResult = res;
    return (await res).rankings;
}

const leaderboardObj = object({
    instance_cost: nullable(number()),
    resolved: number(),
    tags: array(string()),
});

const leaderboardItemSweBench = object({
    name: string(),
    results: array(leaderboardObj),
});

const sweBenchRankingsObj = object({
    leaderboards: array(leaderboardItemSweBench),
});

let sweBenchResult: Promise<{
    [testName: string]: Array<InferOutput<typeof leaderboardObj>>;
}> | null = null;

async function getSweBenchScores() {
    if (sweBenchResult) {
        return sweBenchResult;
    }
    const res = fetchAndParse(
        "https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/refs/heads/master/data/leaderboards.json",
        sweBenchRankingsObj
    ).then((x) => Object.fromEntries(x.leaderboards.map((item) => [item.name, item.results])));
    sweBenchResult = res;
    return res;
}

const hleLeaderboardItem = object({
    model_id: string(),
    benchmark_score: number(),
});

let hleResult: Promise<Array<InferOutput<typeof hleLeaderboardItem>>> | null = null;

async function getHumanitysLastExamScores() {
    if (hleResult) {
        return hleResult;
    }
    const res = fetchAndParse(
        "https://api.zeroeval.com/leaderboard/benchmarks/humanity's-last-exam",
        object({
            entries: array(hleLeaderboardItem),
        })
    ).then((x) => x.entries);
    hleResult = res;
    return res;
}

const NUMBER_DASH_NUMBER_REGEX = /(\d+)-(\d+)/g;

export async function addBenchmarkDataForModel(modelId: string): Promise<{
    humanitysLastExamPercentage?: number;
    sweBenchResolvedPercentage?: number;
    sweBenchCostPerResolved?: number;
    skatebenchScore?: number;
}> {
    // Replace version numbers like v1-0 with v1.0 for matching
    const dotVersion = modelId.replaceAll(NUMBER_DASH_NUMBER_REGEX, (_, p1, p2) => {
        return `${p1}.${p2}`;
    });

    const [skatebenchScores, sweBenchScores, hleScores] = await Promise.all([
        getSkatebenchScores(),
        getSweBenchScores(),
        getHumanitysLastExamScores(),
    ]);

    const result: {
        humanitysLastExamPercentage?: number;
        sweBenchResolvedPercentage?: number;
        sweBenchCostPerResolved?: number;
        skatebenchScore?: number;
        skatebenchCostPerTest?: number;
    } = {};

    // Some Theo specific patches. Theo's stuff seems to like <number>-<thing> over <thing>-<number> for Claude.
    let theoVersion = dotVersion;
    if (theoVersion.startsWith("claude-")) {
        const match = theoVersion.match(/claude(.+)-(\d+\.\d+)/);
        if (match) {
            theoVersion = "claude-" + match[2] + match[1];
        }
    }

    // SkateBench
    const skatebenchEntry = skatebenchScores.find((entry) => entry.model.startsWith(theoVersion));
    if (skatebenchEntry) {
        result.skatebenchScore = skatebenchEntry.successRate;
        result.skatebenchCostPerTest = skatebenchEntry.averageCostPerTest;
    }

    // SweBench
    const verified = sweBenchScores.Verified;
    if (!verified) {
        throw new Error("No 'Verified' leaderboard found in SweBench data");
    }
    const sweBenchModelId = modelId === "deepseek-r1" ? "deepseek-reasoner" : modelId;
    const sweBenchEntry = verified.find((entry) => {
        const tag = entry.tags.find((t) => t.startsWith("Model: "));
        if (tag?.toLowerCase().startsWith(`model: ${sweBenchModelId.toLowerCase()}`)) {
            return true;
        }
        return false;
    });
    if (sweBenchEntry) {
        result.sweBenchResolvedPercentage = sweBenchEntry.resolved;
        if (sweBenchEntry.instance_cost !== null && sweBenchEntry.resolved > 0) {
            result.sweBenchCostPerResolved = sweBenchEntry.instance_cost / sweBenchEntry.resolved;
        }
    }

    // Humanity's Last Exam
    const hleEntry = hleScores.find((entry) =>
        entry.model_id.toLowerCase().startsWith(modelId.toLowerCase())
    );
    if (hleEntry) {
        result.humanitysLastExamPercentage = hleEntry.benchmark_score * 100;
    }

    return result;
}
