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
};

function isGemmaModel(modelId: string, brand: string): boolean {
    return brand === "Google" && modelId.startsWith("gemma");
}

function GemmaLegalNotice() {
    return (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs">
            <h3 className="font-semibold text-amber-800 mb-2">Gemma Terms of Use</h3>
            <p className="text-amber-700 mb-2">
                Gemma is provided under and subject to the{" "}
                <a
                    href="https://ai.google.dev/gemma/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-900"
                >
                    Gemma Terms of Use
                </a> and the{" "}
                <a
                    href="https://ai.google.dev/gemma/prohibited_use_policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-900"
                >
                    Gemma Prohibited Use Policy
                </a>
                , which prohibits certain uses including generating content that violates
                rights, and attempting to circumvent safety filters. By using this model,
                you agree to these terms.
            </p>
            <p className="text-amber-600">
                Google reserves the right to restrict usage that violates these policies.
                This service is not affiliated with Google.
            </p>
        </div>
    );
}

export default function ModelPage({ modelId, model, vendors }: ModelPageProps) {
    const showGemmaNotice = isGemmaModel(modelId, model.brand);

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-4">
                <Link href="/">&larr; Back to all models</Link>
            </div>
            <ModelHeader model={model} />
            <ModelMetadata model={model} />
            {showGemmaNotice && <GemmaLegalNotice />}
            {model.tokeniser && (
                <TokenizerPreview tokeniser={model.tokeniser} modelName={model.cleanName} />
            )}
            <PricingCalculator modelId={modelId} model={model} vendors={vendors} />
        </div>
    );
}
