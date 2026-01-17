import React from "react";
import type { Tokenisers } from "../../dataFormat";

type TokenizerPreviewProps = {
    tokeniser: Tokenisers;
    modelName: string;
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

export default function TokenizerPreview({ tokeniser, modelName }: TokenizerPreviewProps) {
    const [text, setText] = React.useState("");
    const [tokens, setTokens] = React.useState<TokenInfo[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [showVisualization, setShowVisualization] = React.useState(true);

    const tokenizerRef = React.useRef<any>(null);

    const tokenize = React.useCallback(async () => {
        if (!text.trim()) {
            setTokens([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            switch (tokeniser.type) {
                case "tiktoken":
                    await tokenizeTiktoken(tokeniser.bpePath, text, tokenizerRef, setTokens);
                    break;
                case "transformers":
                    await tokenizeTransformers(
                        tokeniser.pretrainedPath,
                        text,
                        tokenizerRef,
                        setTokens
                    );
                    break;
                case "site-api":
                    await tokenizeSiteApi(tokeniser.apiUrl, text, setTokens);
                    break;
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [text, tokeniser]);

    React.useEffect(() => {
        const timeout = setTimeout(tokenize, 300);
        return () => clearTimeout(timeout);
    }, [text, tokenize]);

    return (
        <div className="mb-8 p-4 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Tokenizer Preview</h2>
            <p className="text-sm text-gray-500 mb-3">
                Using {tokeniser.type === "tiktoken" && "tiktoken"}
                {tokeniser.type === "transformers" && "HuggingFace Transformers"}
                {tokeniser.type === "site-api" && "API"} tokenizer
            </p>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to count tokens..."
                className="w-full p-3 border rounded-md min-h-[100px] font-mono text-sm"
            />
            <div className="mt-3 flex items-center gap-4">
                {loading ? (
                    <span className="text-gray-500">Counting...</span>
                ) : error ? (
                    <span className="text-red-500 text-sm">{error}</span>
                ) : (
                    <span className="font-medium">Token count: {tokens.length}</span>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-600 ml-auto">
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
                <div className="mt-4 p-3 bg-gray-50 rounded-md border">
                    <div className="text-xs text-gray-500 mb-2">
                        Token visualization (each color = one token):
                    </div>
                    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-all">
                        {tokens.map((token, idx) => (
                            <span
                                key={idx}
                                className={`${TOKEN_COLORS[idx % TOKEN_COLORS.length]} rounded px-0.5 border border-gray-300/50`}
                                title={`Token ${idx + 1}: "${token.text}" (ID: ${token.id})`}
                            >
                                {formatTokenText(token.text)}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Format token text for display, making whitespace visible
 */
function formatTokenText(text: string): string {
    // Replace newlines with visible symbol but keep them as newlines for layout
    return text.replace(/\n/g, "↵\n").replace(/\t/g, "→").replace(/ /g, "·");
}

// Valid tiktoken encodings
const TIKTOKEN_ENCODINGS = ["cl100k_base", "o200k_base"] as const;
type TiktokenEncodingName = (typeof TIKTOKEN_ENCODINGS)[number];

function getEncodingFromPath(bpePath: string): TiktokenEncodingName {
    // Extract encoding name from path like "/tiktoken/cl100k_base.tiktoken"
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

    // Decode each token individually to get the text
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
        // Use our local proxy to avoid CORS issues with HuggingFace
        env.remoteHost = "/hf/";
        tokenizerRef.current = await AutoTokenizer.from_pretrained(pretrainedPath);
    }

    const tokenizer = tokenizerRef.current;
    const encoded = await tokenizer.encode(text);

    // Decode each token individually
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

    // If the API returns token details, use them; otherwise fall back to count
    if (data.tokens && Array.isArray(data.tokens)) {
        setTokens(
            data.tokens.map((t: any, idx: number) => ({
                text: t.text || t,
                id: t.id ?? idx,
            }))
        );
    } else {
        // API only returns count, can't visualize individual tokens
        const placeholderTokens: TokenInfo[] = [];
        for (let i = 0; i < (data.tokenCount || 0); i++) {
            placeholderTokens.push({ text: "?", id: i });
        }
        setTokens(placeholderTokens);
    }
}
