import type { ImageModel, VendorInfo } from "../../dataFormat";
import Link from "../Link";

type ImageModelPageProps = {
    model: ImageModel;
    vendors: Record<string, VendorInfo>;
};

const PRICE_STALE_DAYS = 30;

function getPriceBadge(priceSource: string, priceVerifiedAt?: string) {
    if (priceSource !== "hardcoded") {
        return (
            <span
                className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700"
                title="Prices are scraped from live sources and refreshed daily."
            >
                ↻ Live pricing
            </span>
        );
    }

    if (!priceVerifiedAt) {
        return (
            <span
                className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700"
                title="These prices are manually maintained. Check the vendor's pricing page for the latest."
            >
                ⚠ Manually maintained
            </span>
        );
    }

    const verifiedDate = new Date(priceVerifiedAt);
    const ageInDays = Math.floor((Date.now() - verifiedDate.getTime()) / 86_400_000);
    const formattedDate = verifiedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    if (ageInDays >= PRICE_STALE_DAYS) {
        return (
            <span
                className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700"
                title={`Prices were last verified on ${formattedDate} (${ageInDays} days ago). Check the vendor's pricing page for the latest.`}
            >
                ⚠ Unverified ({ageInDays} days old)
            </span>
        );
    }

    return (
        <span
            className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700"
            title={`Prices are manually maintained and were last verified on ${formattedDate}.`}
        >
            ⚠ Manually maintained · Verified {formattedDate}
        </span>
    );
}

export default function ImageModelPage({ model, vendors }: ImageModelPageProps) {
    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-4">
                <Link href={`${import.meta.env.PUBLIC_BASE_PATH ?? ""}/image-gen`}>
                    &larr; Back to all image models
                </Link>
            </div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">{model.cleanName}</h1>
                <p className="text-gray-600 dark:text-gray-400">by {model.company}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Model Details</h2>
                <dl className="grid grid-cols-2 gap-4">
                    <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Country</dt>
                        <dd className="font-medium">{model.companyCountryCode}</dd>
                    </div>
                    <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Self-hostable</dt>
                        <dd className="font-medium">{model.selfhostable ? "Yes" : "No"}</dd>
                    </div>
                    <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">
                            Negative Prompts
                        </dt>
                        <dd className="font-medium">
                            {model.supportsNegativePrompts ? "Supported" : "Not Supported"}
                        </dd>
                    </div>
                </dl>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Supported Resolutions</h2>
                <div className="flex flex-wrap gap-2">
                    {model.supportedResolutions.map((res) => (
                        <span
                            key={res}
                            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                        >
                            {res}
                        </span>
                    ))}
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">{model.cleanName} Pricing</h2>
                    {getPriceBadge(
                        model.vendors[0]?.priceSource,
                        model.vendors[0]?.priceVerifiedAt
                    )}
                </div>
                {model.vendors
                    .filter((v) => Object.keys(v.regionPricing).length > 0)
                    .map((vendorModel) => {
                        const vendor = vendors[vendorModel.vendorRef.split(":")[0]];
                        return (
                            <div key={vendorModel.vendorRef} className="mb-6 last:mb-0">
                                <h3 className="font-medium mb-2">
                                    {vendor?.cleanName ?? vendorModel.vendorRef}
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b dark:border-gray-700">
                                                <th className="text-left py-2 pr-4">Region</th>
                                                <th className="text-left py-2 pr-4">Resolution</th>
                                                <th className="text-left py-2">Price per Image</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(vendorModel.regionPricing).flatMap(
                                                ([region, tiers]) =>
                                                    tiers.map((tier, idx) => (
                                                        <tr
                                                            key={`${region}-${tier.resolution}`}
                                                            className="border-b border-gray-100 dark:border-gray-700"
                                                        >
                                                            {idx === 0 && (
                                                                <td
                                                                    className="py-2 pr-4"
                                                                    rowSpan={tiers.length}
                                                                >
                                                                    {region}
                                                                </td>
                                                            )}
                                                            <td className="py-2 pr-4">
                                                                {tier.resolution}
                                                            </td>
                                                            <td className="py-2">
                                                                ${tier.pricePerImage.toFixed(4)}
                                                            </td>
                                                        </tr>
                                                    ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
