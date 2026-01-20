import type { DataFormat, ImageResolution } from "@/src/dataFormat";
import {
    getTokenizerForModel,
    isReasoningModel,
    isSelfHostableModel,
    addBenchmarkDataForModel,
    getReasoningTier,
    getTrainingCutoff,
    getReleaseDate,
    type ReasoningTier,
} from "./constants";
import { getPerformanceMetrics } from "./scrapers/artificialanalysis";
import { getOpenRouterMetadata } from "./openrouter";

export const PROVIDERS: Record<string, string> = {
    Meta: "US",
    Anthropic: "US",
    OpenAI: "US",
    Qwen: "CN",
    DeepSeek: "CN",
    Mistral: "FR",
    Google: "US",
    IBM: "US",
    Alibaba: "CN",
};

export function slugify(name: string, provider: string): string {
    const n = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (provider === "DeepSeek" && !n.startsWith("deepseek-")) {
        return `deepseek-${n}`;
    }
    return n;
}

export function providerToCountryCode(provider: string): string {
    const res = PROVIDERS[provider];
    if (!res)
        throw new Error(`Unknown provider: ${provider}. Add it to PROVIDERS in scraper/shared.ts.`);
    return res;
}

type ModelPricing = {
    input: number; // per token (not per million)
    output: number; // per token
    cachedInput?: number; // per token
    cachedOutput?: number; // per token
};

export type { ReasoningTier };

export type ModelDefinition = {
    name: string;
    provider: string;
    pricing: ModelPricing;
    maxInputTokens?: number;
    maxOutputTokens?: number;
    reasoningTier?: ReasoningTier;
    trainingCutoff?: string; // Date string like "2024-04"
    releaseDate?: string; // Date string like "2024-03-14"
};

export async function addModelToFormat(
    fmt: DataFormat,
    vendorRef: string,
    regionCode: string,
    model: ModelDefinition
): Promise<void> {
    const slugifiedModel = slugify(model.name, model.provider);
    let modelEntry = fmt.models[slugifiedModel];

    if (!modelEntry) {
        let reasoning: boolean;
        let selfhostable: boolean;

        try {
            reasoning = isReasoningModel(slugifiedModel);
        } catch {
            reasoning = false; // Default for unknown models
        }

        try {
            selfhostable = isSelfHostableModel(slugifiedModel, model.provider);
        } catch {
            selfhostable = false; // Default for unknown models
        }

        // Fetch metadata from OpenRouter for fields not provided by scraper or constants
        const openRouterMeta = await getOpenRouterMetadata(slugifiedModel);

        modelEntry = {
            cleanName: model.name,
            company: model.provider,
            companyCountryCode: providerToCountryCode(model.provider),
            vendors: [],
            reasoning,
            selfhostable,
            reasoningTier: model.reasoningTier ?? getReasoningTier(slugifiedModel),
            maxInputTokens: model.maxInputTokens ?? openRouterMeta.maxInputTokens,
            maxOutputTokens: model.maxOutputTokens ?? openRouterMeta.maxOutputTokens,
            trainingCutoff: model.trainingCutoff ?? getTrainingCutoff(slugifiedModel),
            releaseDate:
                model.releaseDate ?? getReleaseDate(slugifiedModel) ?? openRouterMeta.releaseDate,
            tokenizer: getTokenizerForModel(slugifiedModel, model.provider),
            ...(await addBenchmarkDataForModel(slugifiedModel)),
        };
        fmt.models[slugifiedModel] = modelEntry;
    }

    let vendor = modelEntry.vendors.find((v) => v.vendorRef === vendorRef);
    if (!vendor) {
        // Look up performance metrics from Artificial Analysis data
        const perfMetrics = getPerformanceMetrics(slugifiedModel, vendorRef);

        vendor = {
            vendorRef,
            regionPricing: {},
            latencyMs: perfMetrics?.latencyMs ?? 0,
            tokensPerSecond: perfMetrics?.tokensPerSecond ?? 0,
            lowCapacity: false,
        };
        modelEntry.vendors.push(vendor);
    }

    vendor.regionPricing[regionCode] = [
        model.pricing.input,
        model.pricing.output,
        model.pricing.cachedInput ?? null,
        model.pricing.cachedOutput ?? null,
    ];
}

// Convert price per million tokens to price per token
export function perMillion(price: number): number {
    return price / 1_000_000;
}

// Image model providers
export const IMAGE_PROVIDERS: Record<string, string> = {
    "Stability AI": "GB",
    Amazon: "US",
    OpenAI: "US",
};

export type ImageModelPricing = {
    resolution: ImageResolution;
    pricePerImage: number;
    generationSpeedMs?: number;
};

export type ImageModelDefinition = {
    name: string;
    provider: string;
    supportedResolutions: ImageResolution[];
    supportsNegativePrompts: boolean;
    pricing: ImageModelPricing[];
};

export function imageProviderToCountryCode(provider: string): string {
    const res = IMAGE_PROVIDERS[provider];
    if (!res)
        throw new Error(
            `Unknown image provider: ${provider}. Add it to IMAGE_PROVIDERS in scraper/shared.ts.`
        );
    return res;
}

export async function addImageModelToFormat(
    fmt: DataFormat,
    vendorRef: string,
    regionCode: string,
    model: ImageModelDefinition
): Promise<void> {
    const slugifiedModel = slugify(model.name, model.provider);
    let modelEntry = fmt.imageModels[slugifiedModel];

    if (!modelEntry) {
        modelEntry = {
            cleanName: model.name,
            company: model.provider,
            companyCountryCode: imageProviderToCountryCode(model.provider),
            vendors: [],
            selfhostable: false,
            supportedResolutions: model.supportedResolutions,
            supportsNegativePrompts: model.supportsNegativePrompts,
        };
        fmt.imageModels[slugifiedModel] = modelEntry;
    }

    let vendor = modelEntry.vendors.find((v) => v.vendorRef === vendorRef);
    if (!vendor) {
        vendor = {
            vendorRef,
            regionPricing: {},
            latencyMs: 0,
            lowCapacity: false,
        };
        modelEntry.vendors.push(vendor);
    }

    vendor.regionPricing[regionCode] = model.pricing.map((p) => ({
        resolution: p.resolution,
        pricePerImage: p.pricePerImage,
        generationSpeedMs: p.generationSpeedMs,
    }));
}
