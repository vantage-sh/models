import type { ImageTokenConfig } from "@/src/dataFormat";

// Escape hatch for models whose image tokenization parameters are not exposed
// through standard pricing APIs. Add new provider entries here when the parameters
// are known. Keyed by model ID prefix; longest prefix wins.
//
// OpenAI parameters sourced from:
// https://raw.githubusercontent.com/jamesmcroft/openai-image-token-calculator/refs/heads/main/src/stores/ModelStore.js
// (costPerMillionTokens excluded — pricing comes from the regular scrapers;
//  regional variants collapsed since the token math is the same across regions)
//
// Anthropic parameters sourced from:
// https://platform.claude.com/docs/en/build-with-claude/vision
const IMAGE_TOKEN_CONFIGS: Record<string, ImageTokenConfig> = {
    // Anthropic — area-based: tokens ≈ (width × height) / 750
    // Long edge capped at 1568px; images exceeding ~1600 tokens are scaled down
    "claude-opus-4": { kind: "area", pixelsPerToken: 750, maxLongEdge: 1568, maxTokens: 1600 },
    "claude-sonnet-4": { kind: "area", pixelsPerToken: 750, maxLongEdge: 1568, maxTokens: 1600 },
    "claude-haiku-4": { kind: "area", pixelsPerToken: 750, maxLongEdge: 1568, maxTokens: 1600 },
    "claude-3": { kind: "area", pixelsPerToken: 750, maxLongEdge: 1568, maxTokens: 1600 },

    // OpenAI — tile-based: tokens = baseTokens + tokensPerTile × (ceil(w/512) × ceil(h/512))
    // after scaling so long edge ≤ maxImageDimension and short edge ≤ imageMinSizeLength
    "gpt-4o-mini": {
        kind: "tile",
        tokensPerTile: 5667,
        baseTokens: 2833,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    "gpt-image-1": {
        kind: "tile",
        tokensPerTile: 129,
        baseTokens: 65,
        maxImageDimension: 2048,
        imageMinSizeLength: 512,
        tileSizeLength: 512,
    },
    "gpt-4-5": {
        kind: "tile",
        tokensPerTile: 170,
        baseTokens: 85,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    "gpt-4-1": {
        kind: "tile",
        tokensPerTile: 170,
        baseTokens: 85,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    "gpt-4o": {
        kind: "tile",
        tokensPerTile: 170,
        baseTokens: 85,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    "gpt-5": {
        kind: "tile",
        tokensPerTile: 140,
        baseTokens: 70,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    o3: {
        kind: "tile",
        tokensPerTile: 150,
        baseTokens: 75,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    o1: {
        kind: "tile",
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
