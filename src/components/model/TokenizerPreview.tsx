import React from "react";
import type { ImageTokenConfig, Tokenizers } from "../../dataFormat";

type TokenizerPreviewProps = {
    tokenizer?: Tokenizers;
    modelName: string;
    imageTokenConfig?: ImageTokenConfig;
    onTokenCountChange?: (count: number) => void;
};

// Color palette for token visualization - alternating pastel colors
const TOKEN_COLORS = [
    "bg-blue-200",
    "bg-green-200",
    "bg-yellow-200",
    "bg-pink-200",
    "bg-purple-200",
    "bg-orange-200",
    "bg-teal-200",
    "bg-red-200",
];

type TokenInfo = {
    text: string;
    id: number;
};

type UploadedImage = {
    id: string;
    name: string;
    objectUrl: string;
    width: number;
    height: number;
    tokens: number;
};

export default function TokenizerPreview({
    tokenizer,
    modelName,
    imageTokenConfig,
    onTokenCountChange,
}: TokenizerPreviewProps) {
    const [text, setText] = React.useState("");
    const [tokens, setTokens] = React.useState<TokenInfo[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [showVisualization, setShowVisualization] = React.useState(true);

    const [images, setImages] = React.useState<UploadedImage[]>([]);
    const [dragging, setDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const tokenizerRef = React.useRef<any>(null);

    // Clean up object URLs when images are removed or component unmounts
    React.useEffect(() => {
        return () => {
            images.forEach((img) => URL.revokeObjectURL(img.objectUrl));
        };
    }, []);

    const tokenize = React.useCallback(async () => {
        if (!tokenizer) return;
        if (!text.trim()) {
            setTokens([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            switch (tokenizer.type) {
                case "tiktoken":
                    await tokenizeTiktoken(tokenizer.bpePath, text, tokenizerRef, setTokens);
                    break;
                case "transformers":
                    await tokenizeTransformers(
                        tokenizer.pretrainedPath,
                        text,
                        tokenizerRef,
                        setTokens
                    );
                    break;
                case "site-api":
                    await tokenizeSiteApi(tokenizer.apiUrl, text, setTokens);
                    break;
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [text, tokenizer]);

    React.useEffect(() => {
        const timeout = setTimeout(tokenize, 300);
        return () => clearTimeout(timeout);
    }, [text, tokenize]);

    const addFiles = React.useCallback(
        async (files: FileList | File[]) => {
            if (!imageTokenConfig) return;
            const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
            const newImages = await Promise.all(
                imageFiles.map((file) => loadImageFile(file, imageTokenConfig))
            );
            setImages((prev) => [...prev, ...newImages]);
        },
        [imageTokenConfig]
    );

    const removeImage = React.useCallback((id: string) => {
        setImages((prev) => {
            const img = prev.find((i) => i.id === id);
            if (img) URL.revokeObjectURL(img.objectUrl);
            return prev.filter((i) => i.id !== id);
        });
    }, []);

    const handleDrop = React.useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
        },
        [addFiles]
    );

    const totalImageTokens = images.reduce((sum, img) => sum + img.tokens, 0);

    React.useEffect(() => {
        onTokenCountChange?.(tokens.length + totalImageTokens);
    }, [tokens.length, totalImageTokens, onTokenCountChange]);

    return (
        <div className="mb-8 p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">{modelName} Tokenizer</h2>

            {tokenizer && (
                <>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enter text to count tokens..."
                        className="w-full p-3 border dark:border-gray-600 dark:bg-gray-800 rounded-md min-h-[100px] font-mono text-sm"
                    />
                    <div className="mt-3 flex items-center gap-4">
                        {loading ? (
                            <span className="text-gray-500 dark:text-gray-400">Counting...</span>
                        ) : error ? (
                            <span className="text-red-500 dark:text-red-400 text-sm">{error}</span>
                        ) : (
                            <span className="font-medium">Token count: {tokens.length}</span>
                        )}
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 ml-auto">
                            <input
                                type="checkbox"
                                checked={showVisualization}
                                onChange={(e) => setShowVisualization(e.target.checked)}
                                className="rounded"
                            />
                            Show token colors
                        </label>
                    </div>

                    {/* Token visualization */}
                    {showVisualization && tokens.length > 0 && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Token visualization (each color = one token):
                            </div>
                            <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-all">
                                {tokens.map((token, idx) => (
                                    <span
                                        key={idx}
                                        className={`${TOKEN_COLORS[idx % TOKEN_COLORS.length]} text-gray-800 rounded px-0.5 border border-gray-300/50 dark:border-gray-500/50`}
                                        title={`Token ${idx + 1}: "${token.text}" (ID: ${token.id})`}
                                    >
                                        {formatTokenText(token.text)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {imageTokenConfig && (
                <div className={tokenizer ? "mt-6 pt-6 border-t dark:border-gray-700" : ""}>
                    <h3 className="text-base font-medium mb-3">Image tokens</h3>

                    {/* Drop zone */}
                    <div
                        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                            dragging
                                ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => e.target.files && addFiles(e.target.files)}
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Drop images here or click to upload
                        </p>
                    </div>

                    {/* Image list */}
                    {images.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {images.map((img) => (
                                <ImageRow
                                    key={img.id}
                                    image={img}
                                    config={imageTokenConfig}
                                    onRemove={removeImage}
                                />
                            ))}
                            {images.length > 1 && (
                                <div className="pt-2 border-t dark:border-gray-700 flex justify-between text-sm font-medium">
                                    <span>{images.length} images</span>
                                    <span>{totalImageTokens} tokens total</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ImageRow({
    image,
    config,
    onRemove,
}: {
    image: UploadedImage;
    config: ImageTokenConfig;
    onRemove: (id: string) => void;
}) {
    const { scaledW, scaledH } = getScaledDimensions(image.width, image.height, config);
    const wasScaled = scaledW !== image.width || scaledH !== image.height;
    const dims = wasScaled
        ? `${image.width}×${image.height} → ${scaledW}×${scaledH}`
        : `${image.width}×${image.height}`;

    let detail: string;
    if (config.kind === "tile") {
        const tilesX = Math.ceil(scaledW / config.tileSizeLength);
        const tilesY = Math.ceil(scaledH / config.tileSizeLength);
        detail = `${tilesX}×${tilesY} tiles`;
    } else if (config.kind === "area") {
        detail = `${(scaledW * scaledH).toLocaleString()} px² ÷ ${config.pixelsPerToken}`;
    } else if (config.kind === "gemini-tile") {
        const isSmall =
            scaledW <= config.smallImageMaxDimension && scaledH <= config.smallImageMaxDimension;
        const tilesX = isSmall ? 1 : Math.ceil(scaledW / config.tileSizeLength);
        const tilesY = isSmall ? 1 : Math.ceil(scaledH / config.tileSizeLength);
        detail = `${tilesX}×${tilesY} tiles`;
    } else {
        const patchesW = Math.ceil(scaledW / config.patchSize);
        const patchesH = Math.ceil(scaledH / config.patchSize);
        const mergedW = Math.floor(patchesW / config.spatialMergeSize);
        const mergedH = Math.floor(patchesH / config.spatialMergeSize);
        detail = `${mergedH}×${mergedW} merged patches`;
    }
    const subtitle = `${dims} · ${detail}`;

    const tokenDisplay = `${image.tokens} tokens`;

    return (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700">
            <img
                src={image.objectUrl}
                alt={image.name}
                className="w-12 h-12 object-cover rounded flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{image.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>
            <span className="text-sm font-medium flex-shrink-0">{tokenDisplay}</span>
            <button
                onClick={() => onRemove(image.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0 text-lg leading-none"
                aria-label="Remove image"
            >
                ×
            </button>
        </div>
    );
}

function getScaledDimensions(
    width: number,
    height: number,
    config: ImageTokenConfig
): { scaledW: number; scaledH: number } {
    let w = width;
    let h = height;

    if (config.kind === "tile") {
        // Scale down to fit within maxImageDimension × maxImageDimension
        if (w > config.maxImageDimension || h > config.maxImageDimension) {
            const scale = config.maxImageDimension / Math.max(w, h);
            w = Math.floor(w * scale);
            h = Math.floor(h * scale);
        }
        // Scale down so the shorter side does not exceed imageMinSizeLength
        if (Math.min(w, h) > config.imageMinSizeLength) {
            const scale = config.imageMinSizeLength / Math.min(w, h);
            w = Math.floor(w * scale);
            h = Math.floor(h * scale);
        }
    } else if (config.kind === "area") {
        // Scale down so the long edge does not exceed maxLongEdge
        if (Math.max(w, h) > config.maxLongEdge) {
            const scale = config.maxLongEdge / Math.max(w, h);
            w = Math.floor(w * scale);
            h = Math.floor(h * scale);
        }
        // Scale down so token count does not exceed maxTokens
        const maxPixels = config.maxTokens * config.pixelsPerToken;
        if (w * h > maxPixels) {
            const scale = Math.sqrt(maxPixels / (w * h));
            w = Math.floor(w * scale);
            h = Math.floor(h * scale);
        }
    } else if (config.kind === "mistral-tile") {
        // Scale to fit within maxImageSize
        if (Math.max(w, h) > config.maxImageSize) {
            const scale = config.maxImageSize / Math.max(w, h);
            w = Math.floor(w * scale);
            h = Math.floor(h * scale);
        }
    }
    // gemini-tile: no pre-scaling

    return { scaledW: w, scaledH: h };
}

function calculateImageTokens(width: number, height: number, config: ImageTokenConfig): number {
    const { scaledW, scaledH } = getScaledDimensions(width, height, config);
    if (config.kind === "tile") {
        const tilesX = Math.ceil(scaledW / config.tileSizeLength);
        const tilesY = Math.ceil(scaledH / config.tileSizeLength);
        return config.baseTokens + config.tokensPerTile * tilesX * tilesY;
    } else if (config.kind === "area") {
        return Math.round((scaledW * scaledH) / config.pixelsPerToken);
    } else if (config.kind === "gemini-tile") {
        if (scaledW <= config.smallImageMaxDimension && scaledH <= config.smallImageMaxDimension) {
            return config.tokensPerTile;
        }
        const tilesX = Math.ceil(scaledW / config.tileSizeLength);
        const tilesY = Math.ceil(scaledH / config.tileSizeLength);
        return config.tokensPerTile * tilesX * tilesY;
    } else {
        // mistral-tile: mergedH × (mergedW + 1)
        const patchesW = Math.ceil(scaledW / config.patchSize);
        const patchesH = Math.ceil(scaledH / config.patchSize);
        const mergedW = Math.floor(patchesW / config.spatialMergeSize);
        const mergedH = Math.floor(patchesH / config.spatialMergeSize);
        return mergedH * (mergedW + 1);
    }
}

function loadImageFile(file: File, config: ImageTokenConfig): Promise<UploadedImage> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const tokens = calculateImageTokens(img.naturalWidth, img.naturalHeight, config);
            resolve({
                id: `${Date.now()}-${Math.random()}`,
                name: file.name,
                objectUrl,
                width: img.naturalWidth,
                height: img.naturalHeight,
                tokens,
            });
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Failed to load ${file.name}`));
        };
        img.src = objectUrl;
    });
}

/**
 * Format token text for display, making whitespace visible
 */
function formatTokenText(text: string): string {
    return text.replace(/\n/g, "↵\n").replace(/\t/g, "→").replace(/ /g, "·");
}

// Valid tiktoken encodings
const TIKTOKEN_ENCODINGS = ["cl100k_base", "o200k_base"] as const;
type TiktokenEncodingName = (typeof TIKTOKEN_ENCODINGS)[number];

function getEncodingFromPath(bpePath: string): TiktokenEncodingName {
    const match = bpePath.match(/\/tiktoken\/([^/]+)\.tiktoken$/);
    if (!match) {
        throw new Error(`Invalid tiktoken bpePath format: ${bpePath}`);
    }
    const encoding = match[1];
    if (!TIKTOKEN_ENCODINGS.includes(encoding as TiktokenEncodingName)) {
        throw new Error(`Unknown tiktoken encoding: ${encoding}`);
    }
    return encoding as TiktokenEncodingName;
}

async function tokenizeTiktoken(
    bpePath: string,
    text: string,
    tokenizerRef: React.MutableRefObject<any>,
    setTokens: (tokens: TokenInfo[]) => void
) {
    if (!tokenizerRef.current) {
        const { getEncoding } = await import("js-tiktoken");
        const encoding = getEncodingFromPath(bpePath);
        tokenizerRef.current = getEncoding(encoding);
    }

    const tokenizer = tokenizerRef.current;
    const tokenIds = tokenizer.encode(text);

    const tokens: TokenInfo[] = [];
    for (const id of tokenIds) {
        const decoded = tokenizer.decode([id]);
        tokens.push({ text: decoded, id });
    }

    setTokens(tokens);
}

async function tokenizeTransformers(
    pretrainedPath: string,
    text: string,
    tokenizerRef: React.MutableRefObject<any>,
    setTokens: (tokens: TokenInfo[]) => void
) {
    if (!tokenizerRef.current) {
        const { AutoTokenizer, env } = await import("@huggingface/transformers");
        env.remoteHost = `${import.meta.env.PUBLIC_BASE_PATH ?? ""}/hf/`;
        tokenizerRef.current = await AutoTokenizer.from_pretrained(pretrainedPath);
    }

    const tokenizer = tokenizerRef.current;
    const encoded = await tokenizer.encode(text);

    const tokens: TokenInfo[] = [];
    for (const id of encoded) {
        const decoded = await tokenizer.decode([id], { skip_special_tokens: false });
        tokens.push({ text: decoded, id });
    }

    setTokens(tokens);
}

async function tokenizeSiteApi(
    apiUrl: string,
    text: string,
    setTokens: (tokens: TokenInfo[]) => void
) {
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
    });
    const data = await response.json();

    if (data.tokens && Array.isArray(data.tokens)) {
        setTokens(
            data.tokens.map((t: any, idx: number) => ({
                text: t.text || t,
                id: t.id ?? idx,
            }))
        );
    } else {
        const placeholderTokens: TokenInfo[] = [];
        for (let i = 0; i < (data.tokenCount || 0); i++) {
            placeholderTokens.push({ text: "?", id: i });
        }
        setTokens(placeholderTokens);
    }
}
