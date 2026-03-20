import React from "react";
import type { Model, VendorInfo } from "../../dataFormat";
import { useStateItem } from "../../state";
import CurrencyPicker from "../CurrencyPicker";
import forexData from "../../forex.json";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type PricingCalculatorProps = {
    model: Model;
    vendors: Record<string, VendorInfo>;
    isLlm: boolean;
};

export default function PricingCalculator({ model, vendors, isLlm }: PricingCalculatorProps) {
    const availableVendors = model.vendors
        .filter((v) => Object.keys(v.regionPricing).length > 0)
        .map((v) => ({
            slug: v.vendorRef,
            info: vendors[v.vendorRef],
            vendorModel: v,
        }));

    const [selectedVendorSlug, setSelectedVendorSlug] = React.useState(
        availableVendors[0]?.slug ?? ""
    );
    const [selectedRegion, setSelectedRegion] = React.useState<string>("");
    const [inputTokens, setInputTokens] = React.useState<number>(1000);
    const [outputTokens, setOutputTokens] = React.useState<number>(1000);
    const [cachedInputTokens, setCachedInputTokens] = React.useState<number>(0);
    const [currency] = useStateItem("currency", isLlm);

    const selectedVendorModel = model.vendors.find((v) => v.vendorRef === selectedVendorSlug);
    const selectedVendorInfo = vendors[selectedVendorSlug];

    const availableRegions = selectedVendorModel
        ? Object.keys(selectedVendorModel.regionPricing)
        : [];

    React.useEffect(() => {
        if (availableRegions.length > 0 && !availableRegions.includes(selectedRegion)) {
            setSelectedRegion(availableRegions[0]);
        }
    }, [selectedVendorSlug, availableRegions, selectedRegion]);

    const pricing = selectedVendorModel?.regionPricing[selectedRegion];
    const rate = forexData[currency as keyof typeof forexData]?.rate ?? 1;

    let totalCost = 0;
    let inputCostTotal = 0;
    let outputCostTotal = 0;
    let cachedInputCostTotal = 0;
    let hasCachedPricing = false;

    if (pricing) {
        const [inputCost, outputCost, cachedInputCost] = pricing;
        inputCostTotal = inputTokens * inputCost * rate;
        outputCostTotal = outputTokens * outputCost * rate;
        totalCost = inputCostTotal + outputCostTotal;
        if (cachedInputCost !== null) {
            hasCachedPricing = true;
            cachedInputCostTotal = cachedInputTokens * cachedInputCost * rate;
            totalCost += cachedInputCostTotal;
        }
    }

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency || "USD",
            maximumFractionDigits: 6,
        }).format(value);

    const formattedCost = formatCurrency(totalCost);

    const getRegionName = (regionCode: string): string => {
        if (!selectedVendorInfo) return regionCode;
        for (const regions of Object.values(selectedVendorInfo.regionCleanNames)) {
            if (regions[regionCode]) {
                return regions[regionCode];
            }
        }
        return regionCode;
    };

    const priceSource = selectedVendorModel?.priceSource;

    return (
        <div className="p-6 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{model.cleanName} Pricing</h2>
                {priceSource === "hardcoded" ? (
                    <span
                        className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700"
                        title="These prices are manually maintained. Check the vendor's pricing page for the latest."
                    >
                        ⚠ Manually maintained
                    </span>
                ) : (
                    <span
                        className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700"
                        title="Prices are scraped from live sources and refreshed daily."
                    >
                        ↻ Live pricing
                    </span>
                )}
            </div>
            <div className="flex items-center gap-4 mb-6">
                <div>
                    <div className="text-3xl font-bold">{formattedCost}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        <span>Input: {formatCurrency(inputCostTotal)}</span>
                        <span className="mx-2">·</span>
                        <span>Output: {formatCurrency(outputCostTotal)}</span>
                        {hasCachedPricing && cachedInputCostTotal > 0 && (
                            <>
                                <span className="mx-2">·</span>
                                <span>Cached: {formatCurrency(cachedInputCostTotal)}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Vendor</label>
                    <Select value={selectedVendorSlug} onValueChange={setSelectedVendorSlug}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availableVendors.map(({ slug, info }) => (
                                <SelectItem key={slug} value={slug}>
                                    {info?.cleanName ?? slug}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Region</label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availableRegions.map((code) => (
                                <SelectItem key={code} value={code}>
                                    {getRegionName(code)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Currency</label>
                <CurrencyPicker isLlm={isLlm} className="w-full" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Input Tokens</label>
                    <input
                        type="number"
                        value={inputTokens}
                        onChange={(e) => setInputTokens(Number(e.target.value))}
                        className="w-full p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md"
                        min={0}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Output Tokens</label>
                    <input
                        type="number"
                        value={outputTokens}
                        onChange={(e) => setOutputTokens(Number(e.target.value))}
                        className="w-full p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md"
                        min={0}
                    />
                </div>
                {hasCachedPricing && (
                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">
                            Cached Input Tokens
                        </label>
                        <input
                            type="number"
                            value={cachedInputTokens}
                            onChange={(e) => setCachedInputTokens(Number(e.target.value))}
                            className="w-full p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md"
                            min={0}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
