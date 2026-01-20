import type { APIRoute } from "astro";
import {
    BASE_URL,
    getLLMCompanies,
    getImageModelCompanies,
} from "@/src/lib/llmsTxt";

export const prerender = true;

export const GET: APIRoute = () => {
    const llmCompanies = getLLMCompanies();
    const imageModelCompanies = getImageModelCompanies();

    const lines: string[] = [
        "# AI Model Pricing & Comparison",
        "",
        "> Comprehensive pricing and benchmark data for AI models.",
        "",
        "## Language Models (LLMs)",
        "",
    ];

    for (const { company, slug } of llmCompanies) {
        lines.push(
            `- [${company}](${BASE_URL}/llms/${slug}.md): ${company} language models pricing and benchmarks`
        );
    }

    lines.push("", "## Image Generation Models", "");

    for (const { company, slug } of imageModelCompanies) {
        lines.push(
            `- [${company}](${BASE_URL}/image-gen/${slug}.md): ${company} image generation models pricing`
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
