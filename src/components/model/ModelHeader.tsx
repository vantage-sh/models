import type { Model } from "../../dataFormat";

function countryCodeToFlag(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

export default function ModelHeader({ model }: { model: Model }) {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{model.cleanName}</h1>
                <span className="text-2xl" title={model.companyCountryCode}>
                    {countryCodeToFlag(model.companyCountryCode)}
                </span>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">by {model.company}</p>
        </div>
    );
}
