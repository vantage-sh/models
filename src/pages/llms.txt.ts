import type { APIRoute } from "astro";
import {
    BASE_URL,
    getLLMBrands,
    getImageModelBrands,
} from "@/src/lib/llmsTxt";

export const prerender = true;

export const GET: APIRoute = () => {
    const llmBrands = getLLMBrands();
    const imageModelBrands = getImageModelBrands();

    const lines: string[] = [
        "# AI Model Pricing & Comparison",
        "",
        "> Comprehensive pricing and benchmark data for AI models.",
        "",
        "## Language Models (LLMs)",
        "",
    ];

    for (const { brand, slug } of llmBrands) {
        lines.push(
            `- [${brand}](${BASE_URL}/llms/${slug}.md): ${brand} language models pricing and benchmarks`
        );
    }

    lines.push("", "## Image Generation Models", "");

    for (const { brand, slug } of imageModelBrands) {
        lines.push(
            `- [${brand}](${BASE_URL}/image-gen/${slug}.md): ${brand} image generation models pricing`
        );
    }

    lines.push("");

    return new Response(lines.join("\n"), {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
};
