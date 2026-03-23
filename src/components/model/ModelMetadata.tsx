import type { Model } from "../../dataFormat";

// G6: MetadataItem with optional tooltip for benchmark explanations
function MetadataItem({
    label,
    value,
    href,
    tooltip,
}: {
    label: string;
    value: string;
    href?: string;
    tooltip?: string;
}) {
    return (
        <div className="flex flex-col">
            {href ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={tooltip}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    {label} ↗
                </a>
            ) : (
                <span
                    className="text-sm text-gray-500 dark:text-gray-400"
                    title={tooltip}
                >
                    {label}{tooltip ? " ⓘ" : ""}
                </span>
            )}
            <span className="font-medium">{value}</span>
        </div>
    );
}

function formatTokenCount(count: number): string {
    if (count >= 1_000_000) {
        return `${(count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1)}M`;
    }
    if (count >= 1_000) {
        return `${(count / 1_000).toFixed(count % 1_000 === 0 ? 0 : 1)}K`;
    }
    return count.toString();
}

function formatReasoningTier(tier: string | undefined, reasoning: boolean): string {
    if (!reasoning) return "None";
    if (tier === "extended") return "Extended";
    if (tier === "basic") return "Basic";
    return "Yes";
}

export default function ModelMetadata({ model }: { model: Model }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <MetadataItem label="Self-hostable" value={model.selfhostable ? "Yes" : "No"} />
            <MetadataItem
                label="Reasoning Tier"
                value={formatReasoningTier(model.reasoningTier, model.reasoning)}
            />
            {(model.maxInputTokens !== undefined || model.maxOutputTokens !== undefined) && (
                <MetadataItem
                    label="Max Tokens"
                    value={
                        model.maxInputTokens !== undefined && model.maxOutputTokens !== undefined
                            ? `${formatTokenCount(model.maxInputTokens)} in / ${formatTokenCount(model.maxOutputTokens)} out`
                            : model.maxInputTokens !== undefined
                              ? `${formatTokenCount(model.maxInputTokens)} in`
                              : `${formatTokenCount(model.maxOutputTokens!)} out`
                    }
                />
            )}
            {model.trainingCutoff !== undefined && (
                <MetadataItem label="Training Cutoff" value={model.trainingCutoff} />
            )}
            {model.releaseDate !== undefined && (
                <MetadataItem label="Release Date" value={model.releaseDate} />
            )}
            {model.humanitysLastExamPercentage !== undefined && (
                <MetadataItem
                    label="Humanity's Last Exam"
                    value={`${model.humanitysLastExamPercentage.toFixed(1)}%`}
                    href="https://lastexam.ai/"
                    tooltip="HLE: Expert-level academic exam questions across 100+ subjects. Higher % = stronger broad reasoning."
                />
            )}
            {model.sweBenchResolvedPercentage !== undefined && (
                <MetadataItem
                    label="SWE-Bench Resolved"
                    value={`${model.sweBenchResolvedPercentage.toFixed(1)}%`}
                    href="https://www.swebench.com/"
                    tooltip="SWE-Bench: Real GitHub issues resolved by the model autonomously. Higher % = better software engineering capability."
                />
            )}
            {model.skatebenchScore !== undefined && (
                <MetadataItem
                    label="SkateBench Score"
                    value={`${model.skatebenchScore.toFixed(2)}%`}
                    href="https://skatebench.t3.gg/"
                    tooltip="SkateBench: Measures practical coding task completion. Focuses on real-world dev tasks."
                />
            )}
        </div>
    );
}
