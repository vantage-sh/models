type InputTokenCost = number;
type OutputTokenCost = number;
type CachedInputTokenCost = number;
type CachedOutputTokenCost = number;

// Image generation types
type ImageResolution =
    | "256x256"
    | "512x512"
    | "1024x1024"
    | "1024x1792"
    | "1792x1024"
    | "2048x2048";

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
    priceSource: PriceSource;
    priceVerifiedAt?: string; // ISO date string (e.g. "2026-03-20"), only set when priceSource === "hardcoded"
};

type ImageModel = {
    cleanName: string;
    company: string;
    companyCountryCode: string;
    vendors: ImageVendorModelInfo[];
    selfhostable: boolean;
    supportedResolutions: ImageResolution[];
    supportsNegativePrompts: boolean;
};

type PriceSource = "scraped" | "hardcoded";

type VendorModelInfo = {
    vendorRef: string;
    regionPricing: {
        [regionCode: string]: [
            InputTokenCost,
            OutputTokenCost,
            CachedInputTokenCost | null,
            CachedOutputTokenCost | null,
        ];
    };
    latencyMs: number;
    tokensPerSecond: number;
    lowCapacity: boolean;
    priceSource: PriceSource;
};

type TiktokenTokenizer = {
    type: "tiktoken";
    bpePath: string;
};

type TransformersTokenizer = {
    type: "transformers";
    pretrainedPath: string;
};

type SiteAPITokenizer = {
    type: "site-api";
    apiUrl: string;
};

type Tokenizers = TiktokenTokenizer | TransformersTokenizer | SiteAPITokenizer;

type ReasoningTier = "none" | "basic" | "extended";

type Model = {
    cleanName: string;
    company: string;
    companyCountryCode: string;
    vendors: VendorModelInfo[];
    selfhostable: boolean;
    reasoning: boolean;
    reasoningTier?: ReasoningTier;
    maxInputTokens?: number;
    maxOutputTokens?: number;
    trainingCutoff?: string; // Date string like "2024-04"
    releaseDate?: string; // Date string like "2024-03-14"
    tokenizer?: Tokenizers;
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
    usaRegions: string[];
};

export type DataFormat = {
    scrapedAt: string; // ISO 8601 timestamp of when the scraper last ran
    vendors: Record<string, VendorInfo>;
    models: Record<string, Model>;
    imageModels: Record<string, ImageModel>;
};
