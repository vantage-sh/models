import type { ImageTokenConfig } from "@/src/dataFormat";

// Escape hatch for models whose image tokenization parameters are not exposed
// through standard pricing APIs. Add new provider entries here when the parameters
// are known. Keyed by model ID prefix; longest prefix wins.
//
// OpenAI parameters sourced from:
// https://raw.githubusercontent.com/jamesmcroft/openai-image-token-calculator/refs/heads/main/src/stores/ModelStore.js
// (costPerMillionTokens excluded — pricing comes from the regular scrapers;
//  regional variants collapsed since the token math is the same across regions)
const IMAGE_TOKEN_CONFIGS: Record<string, ImageTokenConfig> = {
    // OpenAI
    "gpt-4o-mini": {
        tokensPerTile: 5667,
        baseTokens: 2833,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    "gpt-image-1": {
        tokensPerTile: 129,
        baseTokens: 65,
        maxImageDimension: 2048,
        imageMinSizeLength: 512,
        tileSizeLength: 512,
    },
    "gpt-4-5": {
        tokensPerTile: 170,
        baseTokens: 85,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    "gpt-4-1": {
        tokensPerTile: 170,
        baseTokens: 85,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    "gpt-4o": {
        tokensPerTile: 170,
        baseTokens: 85,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    "gpt-5": {
        tokensPerTile: 140,
        baseTokens: 70,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    o3: {
        tokensPerTile: 150,
        baseTokens: 75,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    o1: {
        tokensPerTile: 150,
        baseTokens: 75,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
};

const SORTED_PREFIXES = Object.keys(IMAGE_TOKEN_CONFIGS).sort((a, b) => b.length - a.length);

export function getImageTokenConfig(modelId: string): ImageTokenConfig | undefined {
    for (const prefix of SORTED_PREFIXES) {
        if (modelId.startsWith(prefix)) {
            return IMAGE_TOKEN_CONFIGS[prefix];
        }
    }
    return undefined;
}
