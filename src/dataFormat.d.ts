type InputTokenCost = number;
type OutputTokenCost = number;
type CachedInputTokenCost = number;
type CachedOutputTokenCost = number;

// Image generation types
type ImageResolution =
    | "256x256"
    | "512x512"
    | "1024x1024"
    | "1024x1536"
    | "1536x1024"
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

// Parameters for computing how many tokens an input image consumes.
// Used by the tokenizer preview to show image token counts.

// OpenAI-style: image is divided into fixed-size tiles, each costing tokensPerTile
type TileBasedImageTokenConfig = {
    kind: "tile";
    tokensPerTile: number;
    baseTokens: number;
    // Images are scaled down so neither dimension exceeds this
    maxImageDimension: number;
    // Images are scaled down so the shorter side does not exceed this
    imageMinSizeLength: number;
    tileSizeLength: number;
};

// Anthropic-style: tokens ≈ (width × height) / pixelsPerToken
// Source: https://platform.claude.com/docs/en/build-with-claude/vision
type AreaBasedImageTokenConfig = {
    kind: "area";
    // Divides pixel area to get token count
    pixelsPerToken: number;
    // Images are scaled down so the long edge does not exceed this
    maxLongEdge: number;
    // Images are scaled down so token count does not exceed this
    maxTokens: number;
};

// Google Gemini-style: fixed 768×768 tiling, 258 tokens per tile
// Images with both dimensions ≤ smallImageMaxDimension count as a single tile.
// No pre-scaling; the image is tiled at its native resolution.
// Source: https://ai.google.dev/gemini-api/docs/tokens
type GeminiTileImageTokenConfig = {
    kind: "gemini-tile";
    tokensPerTile: number;
    tileSizeLength: number;
    // If both dimensions are ≤ this, the image is counted as one tile
    smallImageMaxDimension: number;
};

export type ImageTokenConfig =
    | TileBasedImageTokenConfig
    | AreaBasedImageTokenConfig
    | GeminiTileImageTokenConfig;

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
    imageTokenConfig?: ImageTokenConfig;
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
