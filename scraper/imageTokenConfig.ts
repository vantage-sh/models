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
//
// Google Gemini parameters sourced from:
// https://ai.google.dev/gemini-api/docs/tokens
const IMAGE_TOKEN_CONFIGS: Record<string, ImageTokenConfig> = {
    // Google Gemini — 768×768 tiles, 258 tokens/tile
    // Both dims ≤ 384px → flat 258 tokens (equivalent to 1 tile)
    // Covers: gemini-2-5-pro, gemini-2-5-flash, gemini-2-5-flash-lite
    "gemini-2-5": {
        kind: "gemini-tile",
        tokensPerTile: 258,
        tileSizeLength: 768,
        smallImageMaxDimension: 384,
    },
    // Covers: gemini-2-0-flash, gemini-2-0-flash-lite
    "gemini-2-0": {
        kind: "gemini-tile",
        tokensPerTile: 258,
        tileSizeLength: 768,
        smallImageMaxDimension: 384,
    },

    // Anthropic — area-based: tokens ≈ (width × height) / 750
    // Long edge capped at 1568px; images exceeding ~1600 tokens are scaled down
    // Covers: claude-opus-4, claude-opus-4-1, claude-opus-4-5, claude-opus-4-6
    "claude-opus-4": { kind: "area", pixelsPerToken: 750, maxLongEdge: 1568, maxTokens: 1600 },
    // Covers: claude-sonnet-4, claude-sonnet-4-5, claude-sonnet-4-6
    "claude-sonnet-4": { kind: "area", pixelsPerToken: 750, maxLongEdge: 1568, maxTokens: 1600 },
    // Covers: claude-haiku-4-5
    "claude-haiku-4": { kind: "area", pixelsPerToken: 750, maxLongEdge: 1568, maxTokens: 1600 },
    // Covers: claude-3-haiku, claude-3-opus, claude-3-sonnet
    "claude-3": { kind: "area", pixelsPerToken: 750, maxLongEdge: 1568, maxTokens: 1600 },

    // OpenAI — tile-based: tokens = baseTokens + tokensPerTile × (ceil(w/512) × ceil(h/512))
    // after scaling so long edge ≤ maxImageDimension and short edge ≤ imageMinSizeLength
    // Covers: gpt-4o-mini
    "gpt-4o-mini": {
        kind: "tile",
        tokensPerTile: 5667,
        baseTokens: 2833,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    // Covers: gpt-4o
    "gpt-4o": {
        kind: "tile",
        tokensPerTile: 170,
        baseTokens: 85,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    // Covers: gpt-4-1, gpt-4-1-mini, gpt-4-1-nano
    "gpt-4-1": {
        kind: "tile",
        tokensPerTile: 170,
        baseTokens: 85,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    // Covers: gpt-5, gpt-5-1, gpt-5-2, gpt-5-4, gpt-5-4-mini, gpt-5-mini
    "gpt-5": {
        kind: "tile",
        tokensPerTile: 140,
        baseTokens: 70,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    // Covers: gpt-o1, gpt-o1-mini
    "gpt-o1": {
        kind: "tile",
        tokensPerTile: 150,
        baseTokens: 75,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    // Covers: gpt-o3, gpt-o3-mini
    "gpt-o3": {
        kind: "tile",
        tokensPerTile: 150,
        baseTokens: 75,
        maxImageDimension: 2048,
        imageMinSizeLength: 768,
        tileSizeLength: 512,
    },
    // Covers: gpt-o4-mini
    "gpt-o4": {
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
