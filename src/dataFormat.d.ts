type InputTokenCost = number;
type OutputTokenCost = number;
type CachedInputTokenCost = number;
type CachedOutputTokenCost = number;

// Image generation types
type ImageResolution = "256x256" | "512x512" | "1024x1024" | "1024x1792" | "1792x1024" | "2048x2048";

type ImagePricingTier = {
    resolution: ImageResolution;
    pricePerImage: number;
    generationSpeedMs?: number;
};

type ImageVendorModelInfo = {
    vendorRef: string;
    regionPricing: { [regionCode: string]: ImagePricingTier[] };
    latencyMs: number;
    lowCapacity: boolean;
};

type ImageModel = {
    cleanName: string;
    brand: string;
    companyCountryCode: string;
    vendors: ImageVendorModelInfo[];
    selfhostable: boolean;
    supportedResolutions: ImageResolution[];
    supportsNegativePrompts: boolean;
};

type VendorModelInfo = {
    vendorRef: string;
    regionPricing: {
        [regionCode: string]: [InputTokenCost, OutputTokenCost, CachedInputTokenCost | null, CachedOutputTokenCost | null];
    };
    latencyMs: number;
    tokensPerSecond: number;
    lowCapacity: boolean;
};

type TiktokenTokeniser = {
    type: "tiktoken";
    bpePath: string;
};

type TransformersTokeniser = {
    type: "transformers";
    pretrainedPath: string;
};

type SiteAPITokeniser = {
    type: "site-api";
    apiUrl: string;
};

type Tokenisers = TiktokenTokeniser | TransformersTokeniser | SiteAPITokeniser;

type Model = {
    cleanName: string;
    brand: string;
    companyCountryCode: string;
    vendors: VendorModelInfo[];
    selfhostable: boolean;
    reasoning: boolean;
    tokeniser?: Tokenisers;
    humanitysLastExamPercentage?: number;
    sweBenchResolvedPercentage?: number;
    skatebenchScore?: number;
};

type VendorInfo = {
    cleanName: string;
    learnMoreUrl: string;
    regionCleanNames: {
        [categoryOrEmpty: string]: {
            [regionCode: string]: string;
        };
    };
    euOrUKRegions: string[];
};

export type DataFormat = {
    vendors: Record<string, VendorInfo>;
    models: Record<string, Model>;
    imageModels: Record<string, ImageModel>;
};
