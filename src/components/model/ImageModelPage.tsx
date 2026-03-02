import type { ImageModel, VendorInfo } from "../../dataFormat";
import Link from "../Link";

type ImageModelPageProps = {
    model: ImageModel;
    vendors: Record<string, VendorInfo>;
};

export default function ImageModelPage({ model, vendors }: ImageModelPageProps) {
    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-4">
                <Link href={`${import.meta.env.PUBLIC_BASE_URL ?? ""}/image-gen`}>
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
                <h2 className="text-xl font-semibold mb-4">{model.cleanName} Pricing</h2>
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
