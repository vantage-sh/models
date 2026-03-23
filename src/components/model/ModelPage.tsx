import type { Model, VendorInfo } from "../../dataFormat";
import Link from "../Link";
import ModelHeader from "./ModelHeader";
import ModelMetadata from "./ModelMetadata";
import TokenizerPreview from "./TokenizerPreview";
import PricingCalculator from "./PricingCalculator";

type ModelPageProps = {
    modelId: string;
    model: Model;
    vendors: Record<string, VendorInfo>;
    description: string;
    isLlm: boolean;
};

function isGemmaModel(modelId: string, company: string): boolean {
    return company === "Google" && modelId.startsWith("gemma");
}

function GemmaLegalNotice() {
    return (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-xs">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                Gemma Terms of Use
            </h3>
            <p className="text-amber-700 dark:text-amber-300 mb-2">
                Gemma is provided under and subject to the{" "}
                <a
                    href="https://ai.google.dev/gemma/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-900 dark:hover:text-amber-100"
                >
                    Gemma Terms of Use
                </a>{" "}
                and the{" "}
                <a
                    href="https://ai.google.dev/gemma/prohibited_use_policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-900 dark:hover:text-amber-100"
                >
                    Gemma Prohibited Use Policy
                </a>
                , which prohibits certain uses including generating content that violates rights,
                and attempting to circumvent safety filters. By using this model, you agree to these
                terms.
            </p>
            <p className="text-amber-600 dark:text-amber-400">
                Google reserves the right to restrict usage that violates these policies. This
                service is not affiliated with Google.
            </p>
        </div>
    );
}

export default function ModelPage({ modelId, model, vendors, description, isLlm }: ModelPageProps) {
    const showGemmaNotice = isGemmaModel(modelId, model.company);

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-4 flex items-center justify-between">
                <Link href={`${import.meta.env.PUBLIC_BASE_PATH ?? ""}/`}>
                    &larr; Back to all models
                </Link>
                {/* G10: FiceCal FinOps deep-link */}
                <a
                    href={`https://duksh.github.io/ficecal/#calculator`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded border border-[#6742d6] text-[#6742d6] hover:bg-[#6742d6] hover:text-white transition-colors"
                    title="Open FiceCal FinOps dashboard for full AI cost intelligence"
                >
                    💰 Estimate in FiceCal ↗
                </a>
            </div>
            <ModelHeader model={model} description={description} />
            <ModelMetadata model={model} />
            {showGemmaNotice && <GemmaLegalNotice />}
            {model.tokenizer && (
                <TokenizerPreview tokenizer={model.tokenizer} modelName={model.cleanName} />
            )}
            <PricingCalculator model={model} vendors={vendors} isLlm={isLlm} />
        </div>
    );
}
