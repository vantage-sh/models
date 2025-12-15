import type { DataFormat, Model, VendorModelInfo } from "@/src/dataFormat";
import {
    getTokeniserForModel,
    isReasoningModel,
    isSelfHostableModel,
    addBenchmarkDataForModel,
} from "./constants";

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
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (provider === "DeepSeek" && !n.startsWith("deepseek-")) {
        return `deepseek-${n}`;
    }
    return n;
}

export function providerToCountryCode(provider: string): string {
    const res = PROVIDERS[provider];
    if (!res) throw new Error(`Unknown provider: ${provider}. Add it to PROVIDERS in scraper/shared.ts.`);
    return res;
}

type ModelPricing = {
    input: number;         // per token (not per million)
    output: number;        // per token
    cachedInput?: number;  // per token
    cachedOutput?: number; // per token
};

export type ModelDefinition = {
    name: string;
    provider: string;
    pricing: ModelPricing;
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

        modelEntry = {
            cleanName: model.name,
            brand: model.provider,
            companyCountryCode: providerToCountryCode(model.provider),
            vendors: [],
            reasoning,
            selfhostable,
            tokeniser: getTokeniserForModel(slugifiedModel, model.provider),
            ...await addBenchmarkDataForModel(slugifiedModel),
        };
        fmt.models[slugifiedModel] = modelEntry;
    }

    let vendor = modelEntry.vendors.find(v => v.vendorRef === vendorRef);
    if (!vendor) {
        vendor = {
            vendorRef,
            regionPricing: {},
            latencyMs: 0,
            tokensPerSecond: 0,
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
