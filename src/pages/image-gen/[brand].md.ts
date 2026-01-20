import type { APIRoute, GetStaticPaths } from "astro";
import type { ImageModel } from "@/src/dataFormat";
import {
    BASE_URL,
    getImageModelBrands,
    getImageModelsByBrand,
    formatImagePrice,
    getVendorName,
    getRegionName,
} from "@/src/lib/llmsTxt";

export const prerender = true;

export const getStaticPaths: GetStaticPaths = () => {
    const brands = getImageModelBrands();
    return brands.map(({ brand, slug }) => ({
        params: { brand: slug },
        props: { brandName: brand },
    }));
};

interface Props {
    brandName: string;
}

function generateModelMarkdown(modelId: string, model: ImageModel): string {
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
    lines.push(
        `| Supported Resolutions | ${model.supportedResolutions.join(", ")} |`
    );
    lines.push(
        `| Negative Prompts | ${model.supportsNegativePrompts ? "Yes" : "No"} |`
    );
    lines.push(`| Self-hostable | ${model.selfhostable ? "Yes" : "No"} |`);
    lines.push("");

    // Pricing tables - one per vendor
    lines.push("### Pricing");
    lines.push("");
    lines.push("*Prices shown per image*");
    lines.push("");

    for (const vendorInfo of model.vendors) {
        const vendorName = getVendorName(vendorInfo.vendorRef);
        lines.push(`#### ${vendorName}`);
        lines.push("");

        for (const [regionCode, tiers] of Object.entries(
            vendorInfo.regionPricing
        )) {
            const regionName = getRegionName(vendorInfo.vendorRef, regionCode);
            lines.push(`**${regionName}**`);
            lines.push("");
            lines.push("| Resolution | Price |");
            lines.push("|------------|-------|");

            for (const tier of tiers) {
                lines.push(
                    `| ${tier.resolution} | ${formatImagePrice(tier.pricePerImage)} |`
                );
            }
            lines.push("");
        }
    }

    return lines.join("\n");
}

export const GET: APIRoute = ({ props }) => {
    const { brandName } = props as Props;
    const models = getImageModelsByBrand(brandName);

    const lines: string[] = [
        `# ${brandName} Image Generation Models`,
        "",
        `> Pricing and specifications for ${brandName} image generation models.`,
        "",
        `[← Back to Index](${BASE_URL}/llms.txt)`,
        "",
    ];

    // Sort models by name
    const sortedModels = models.sort((a, b) =>
        a[1].cleanName.localeCompare(b[1].cleanName)
    );

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
