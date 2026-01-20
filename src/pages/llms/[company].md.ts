import type { APIRoute, GetStaticPaths } from "astro";
import type { Model } from "@/src/dataFormat";
import {
    BASE_URL,
    getLLMCompanies,
    getModelsByCompany,
    formatPrice,
    getVendorName,
    getRegionName,
} from "@/src/lib/llmsTxt";

export const prerender = true;

export const getStaticPaths: GetStaticPaths = () => {
    const companies = getLLMCompanies();
    return companies.map(({ company, slug }) => ({
        params: { company: slug },
        props: { companyName: company },
    }));
};

interface Props {
    companyName: string;
}

function formatReasoningTier(model: Model): string {
    if (!model.reasoning) return "none";
    return model.reasoningTier || "basic";
}

function formatTokenCount(tokens: number | undefined): string {
    if (tokens === undefined) return "N/A";
    if (tokens >= 1_000_000) {
        return `${(tokens / 1_000_000).toFixed(1)}M`;
    }
    if (tokens >= 1_000) {
        return `${(tokens / 1_000).toFixed(0)}K`;
    }
    return tokens.toString();
}

function generateModelMarkdown(modelId: string, model: Model): string {
    const lines: string[] = [];

    lines.push(`## ${model.cleanName}`);
    lines.push("");
    lines.push(`**Model ID:** \`${modelId}\``);
    lines.push("");

    // Specifications table
    lines.push("### Specifications");
    lines.push("");
    lines.push("| Property | Value |");
    lines.push("|----------|-------|");
    if (model.releaseDate) {
        lines.push(`| Release Date | ${model.releaseDate} |`);
    }
    if (model.trainingCutoff) {
        lines.push(`| Training Cutoff | ${model.trainingCutoff} |`);
    }
    lines.push(`| Max Input Tokens | ${formatTokenCount(model.maxInputTokens)} |`);
    lines.push(`| Max Output Tokens | ${formatTokenCount(model.maxOutputTokens)} |`);
    lines.push(`| Reasoning Tier | ${formatReasoningTier(model)} |`);
    lines.push(`| Self-hostable | ${model.selfhostable ? "Yes" : "No"} |`);
    lines.push("");

    // Benchmarks table (if any benchmarks are available)
    const hasBenchmarks =
        model.sweBenchResolvedPercentage !== undefined ||
        model.humanitysLastExamPercentage !== undefined ||
        model.skatebenchScore !== undefined;

    if (hasBenchmarks) {
        lines.push("### Benchmarks");
        lines.push("");
        lines.push("| Benchmark | Score |");
        lines.push("|-----------|-------|");
        if (model.sweBenchResolvedPercentage !== undefined) {
            lines.push(`| SWE-Bench Verified | ${model.sweBenchResolvedPercentage}% |`);
        }
        if (model.humanitysLastExamPercentage !== undefined) {
            lines.push(`| Humanity's Last Exam | ${model.humanitysLastExamPercentage}% |`);
        }
        if (model.skatebenchScore !== undefined) {
            lines.push(`| SkateBench | ${model.skatebenchScore.toFixed(2)} |`);
        }
        lines.push("");
    }

    // Pricing tables - one per vendor
    lines.push("### Pricing");
    lines.push("");
    lines.push("*Prices shown per 1 million tokens*");
    lines.push("");

    for (const vendorInfo of model.vendors) {
        const vendorName = getVendorName(vendorInfo.vendorRef);
        lines.push(`#### ${vendorName}`);
        lines.push("");
        lines.push("| Region | Input | Output | Cached Input | Cached Output |");
        lines.push("|--------|-------|--------|--------------|---------------|");

        for (const [regionCode, pricing] of Object.entries(
            vendorInfo.regionPricing
        )) {
            const regionName = getRegionName(vendorInfo.vendorRef, regionCode);
            const [input, output, cachedInput, cachedOutput] = pricing;
            lines.push(
                `| ${regionName} | ${formatPrice(input)} | ${formatPrice(output)} | ${formatPrice(cachedInput)} | ${formatPrice(cachedOutput)} |`
            );
        }
        lines.push("");
    }

    return lines.join("\n");
}

export const GET: APIRoute = ({ props }) => {
    const { companyName } = props as Props;
    const models = getModelsByCompany(companyName);

    const lines: string[] = [
        `# ${companyName} Language Models`,
        "",
        `> Pricing and specifications for ${companyName} language models.`,
        "",
        `[← Back to Index](${BASE_URL}/llms.txt)`,
        "",
    ];

    // Sort models by release date (newest first), then by name
    const sortedModels = models.sort((a, b) => {
        const dateA = a[1].releaseDate || "0000-00-00";
        const dateB = b[1].releaseDate || "0000-00-00";
        if (dateA !== dateB) {
            return dateB.localeCompare(dateA); // Newest first
        }
        return a[1].cleanName.localeCompare(b[1].cleanName);
    });

    for (const [modelId, model] of sortedModels) {
        lines.push(generateModelMarkdown(modelId, model));
    }

    return new Response(lines.join("\n"), {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
};
