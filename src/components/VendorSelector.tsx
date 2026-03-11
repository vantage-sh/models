import React from "react";
import type { ColumnDataType, ColumnQuery } from "./Table";
import type { VendorInfo } from "../dataFormat";

type RegionBucket = { eu: true } | { usa: true };

type VendorQueryBuilder = {
    name: string;
} & (
    | {
          region: true;
          queryBuilder: (
              vendorSlug: string | null,
              vendorName: string | null,
              region: null | string | RegionBucket
          ) => [string, { [key: string]: ColumnDataType }];
      }
    | {
          region: false;
          queryBuilder: (
              vendorSlug: string | null,
              vendorName: string | null
          ) => [string, { [key: string]: ColumnDataType }];
      }
);

function vendorOnlySelectAsWrapper(
    niceName: string,
    key: string,
    explicitDataType?: ColumnDataType
) {
    return (vendorSlug: string | null, vendorName: string | null) => {
        let niceNameReplaced: string;
        if (vendorName === null) {
            niceNameReplaced = niceName.replace("?", "Average");
        } else {
            niceNameReplaced = niceName.replace("?", vendorName);
        }
        let vendorQueryPart = "";
        let innerKey = key;
        if (vendorSlug === null) {
            innerKey = `AVG(${key})`;
        } else {
            vendorQueryPart = `vendor_id = '${vendorSlug}' AND `;
        }
        return [
            `SELECT ${innerKey} AS \`${niceNameReplaced}\` FROM models_vendors WHERE ${vendorQueryPart}model_id = ?`,
            explicitDataType ? { [niceNameReplaced]: explicitDataType } : {},
        ] as [string, { [key: string]: ColumnDataType }];
    };
}

function vendorAndRegionSelectAsWrapper(
    niceName: string,
    key: string,
    explicitDataType?: ColumnDataType
) {
    return (
        vendorSlug: string | null,
        vendorName: string | null,
        region: null | string | RegionBucket
    ) => {
        let formatted: string;
        if (region === null) {
            formatted = "Average";
        } else if (typeof region === "string") {
            formatted = region;
        } else if ("eu" in region) {
            formatted = "EU / UK Regions";
        } else {
            formatted = "USA";
        }
        let niceNameReplaced: string;
        if (vendorName === null) {
            niceNameReplaced = niceName.replace("?", formatted);
        } else {
            niceNameReplaced = niceName.replace("?", vendorName + " " + formatted);
        }

        const explicitDataTypes = explicitDataType ? { [niceNameReplaced]: explicitDataType } : {};

        let query: string;
        let vendorIdQueryPart = "";
        if (vendorSlug !== null) {
            vendorIdQueryPart = `models_vendors_regions.vendor_id = '${vendorSlug}' AND `;
        }
        if (region === null) {
            query = `SELECT AVG(${key}) AS \`${niceNameReplaced}\`
    FROM models_vendors_regions
    WHERE ${vendorIdQueryPart}model_id = ?`;
        } else if (typeof region === "string") {
            query = `SELECT ${key} AS \`${niceNameReplaced}\`
    FROM models_vendors_regions
    WHERE ${vendorIdQueryPart}model_id = ? AND region_code = '${region}'`;
        } else if ("eu" in region) {
            query = `SELECT AVG(models_vendors_regions.${key}) AS \`${niceNameReplaced}\`
    FROM models_vendors_regions JOIN vendors ON models_vendors_regions.vendor_id = vendors.vendor_id
    WHERE ${vendorIdQueryPart}models_vendors_regions.model_id = ? AND EXISTS (
        SELECT 1 FROM json_each(vendors.eu_or_uk_regions) WHERE value = models_vendors_regions.region_code
    )`;
        } else if ("usa" in region) {
            query = `SELECT AVG(models_vendors_regions.${key}) AS \`${niceNameReplaced}\`
    FROM models_vendors_regions JOIN vendors ON models_vendors_regions.vendor_id = vendors.vendor_id
    WHERE ${vendorIdQueryPart}models_vendors_regions.model_id = ? AND EXISTS (
        SELECT 1 FROM json_each(vendors.usa_regions) WHERE value = models_vendors_regions.region_code
    )`;
        } else {
            throw new Error("Invalid region");
        }

        return [query, explicitDataTypes] as [string, { [key: string]: ColumnDataType }];
    };
}

const vendorQueryBuilders: VendorQueryBuilder[] = [
    {
        name: "Latency (ms)",
        region: false,
        queryBuilder: vendorOnlySelectAsWrapper("? Latency (ms)", "latency_ms"),
    },
    {
        name: "Tokens per Second",
        region: false,
        queryBuilder: vendorOnlySelectAsWrapper("? Tokens per Second", "tokens_per_second"),
    },
    {
        name: "Low Capacity",
        region: false,
        queryBuilder: vendorOnlySelectAsWrapper("? Low Capacity", "low_capacity", "boolean"),
    },
    {
        name: "Cost per 1K Input Tokens",
        region: true,
        queryBuilder: vendorAndRegionSelectAsWrapper(
            "? Cost per 1K Input Tokens",
            "input_token_cost * 1000",
            "currency"
        ),
    },
    {
        name: "Cost per 1K Output Tokens",
        region: true,
        queryBuilder: vendorAndRegionSelectAsWrapper(
            "? Cost per 1K Output Tokens",
            "output_token_cost * 1000",
            "currency"
        ),
    },
    {
        name: "Cost per 1K Cached Input Tokens",
        region: true,
        queryBuilder: vendorAndRegionSelectAsWrapper(
            "? Cost per 1K Cached Input Tokens",
            "cached_input_token_cost * 1000",
            "currency"
        ),
    },
    {
        name: "Cost per 1K Cached Output Tokens",
        region: true,
        queryBuilder: vendorAndRegionSelectAsWrapper(
            "? Cost per 1K Cached Output Tokens",
            "cached_output_token_cost * 1000",
            "currency"
        ),
    },
];

// Image model vendor query builders
function imageVendorOnlySelectAsWrapper(
    niceName: string,
    key: string,
    explicitDataType?: ColumnDataType
) {
    return (vendorSlug: string | null, vendorName: string | null) => {
        let niceNameReplaced: string;
        if (vendorName === null) {
            niceNameReplaced = niceName.replace("?", "Average");
        } else {
            niceNameReplaced = niceName.replace("?", vendorName);
        }
        let vendorQueryPart = "";
        let innerKey = key;
        if (vendorSlug === null) {
            innerKey = `AVG(${key})`;
        } else {
            vendorQueryPart = `vendor_id = '${vendorSlug}' AND `;
        }
        return [
            `SELECT ${innerKey} AS \`${niceNameReplaced}\` FROM image_models_vendors WHERE ${vendorQueryPart}model_id = ?`,
            explicitDataType ? { [niceNameReplaced]: explicitDataType } : {},
        ] as [string, { [key: string]: ColumnDataType }];
    };
}

function imageVendorPricingSelectAsWrapper(
    niceName: string,
    resolution: string,
    explicitDataType?: ColumnDataType
) {
    return (vendorSlug: string | null, vendorName: string | null) => {
        let niceNameReplaced: string;
        if (vendorName === null) {
            niceNameReplaced = niceName.replace("?", "Average");
        } else {
            niceNameReplaced = niceName.replace("?", vendorName);
        }

        const explicitDataTypes = explicitDataType ? { [niceNameReplaced]: explicitDataType } : {};

        let vendorIdQueryPart = "";
        if (vendorSlug !== null) {
            vendorIdQueryPart = `vendor_id = '${vendorSlug}' AND `;
        }

        const query = `SELECT AVG(price_per_image) AS \`${niceNameReplaced}\`
    FROM image_models_vendors_pricing
    WHERE ${vendorIdQueryPart}model_id = ? AND resolution = '${resolution}'`;

        return [query, explicitDataTypes] as [string, { [key: string]: ColumnDataType }];
    };
}

const imageVendorQueryBuilders: VendorQueryBuilder[] = [
    {
        name: "Latency (ms)",
        region: false,
        queryBuilder: imageVendorOnlySelectAsWrapper("? Latency (ms)", "latency_ms"),
    },
    {
        name: "Low Capacity",
        region: false,
        queryBuilder: imageVendorOnlySelectAsWrapper("? Low Capacity", "low_capacity", "boolean"),
    },
    {
        name: "Price per Image (512x512)",
        region: false,
        queryBuilder: imageVendorPricingSelectAsWrapper("? Price (512x512)", "512x512", "currency"),
    },
    {
        name: "Price per Image (1024x1024)",
        region: false,
        queryBuilder: imageVendorPricingSelectAsWrapper(
            "? Price (1024x1024)",
            "1024x1024",
            "currency"
        ),
    },
    {
        name: "Price per Image (1024x1792)",
        region: false,
        queryBuilder: imageVendorPricingSelectAsWrapper(
            "? Price (1024x1792)",
            "1024x1792",
            "currency"
        ),
    },
    {
        name: "Price per Image (1792x1024)",
        region: false,
        queryBuilder: imageVendorPricingSelectAsWrapper(
            "? Price (1792x1024)",
            "1792x1024",
            "currency"
        ),
    },
];

function VendorItems({
    vendors,
    vendorSlug,
    setQueries,
    exit,
    isLlm,
}: {
    vendors: Record<string, VendorInfo>;
    vendorSlug: string;
    setQueries: (cb: (prev: ColumnQuery[]) => ColumnQuery[]) => void;
    exit: () => void;
    isLlm: boolean;
}) {
    let vendorInfo: VendorInfo | null = null;
    if (vendorSlug) {
        vendorInfo = vendors[vendorSlug];
    }
    const [queryBuilderIndex, setQueryBuilderIndex] = React.useState<number>(-1);
    const [region, setRegion] = React.useState<string | RegionBucket | null>(null);
    const [disabled, setDisabled] = React.useState(true);

    // Use appropriate query builders based on view
    const activeQueryBuilders =
        isLlm ? vendorQueryBuilders : imageVendorQueryBuilders;

    const handleQueryBuilderChange = React.useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            setQueryBuilderIndex(parseInt(e.target.value, 10));
            setRegion(null);
            setDisabled(false);
        },
        []
    );

    const submit = React.useCallback(() => {
        if (queryBuilderIndex === -1) {
            return;
        }
        const builder = activeQueryBuilders[queryBuilderIndex];
        let queryAndTypes: [string, { [key: string]: ColumnDataType }];
        if (builder.region) {
            queryAndTypes = builder.queryBuilder(
                vendorSlug || null,
                vendorInfo?.cleanName ?? null,
                region
            );
        } else {
            queryAndTypes = builder.queryBuilder(vendorSlug || null, vendorInfo?.cleanName ?? null);
        }

        setQueries((prev) => [
            ...prev,
            {
                columnExplicitlySetDataTypes: queryAndTypes[1] || {},
                columnFilters: {},
                columnOrdering: {},
                query: queryAndTypes[0],
            },
        ]);
        exit();
    }, [queryBuilderIndex, vendorSlug, vendorInfo, region, setQueries, exit, activeQueryBuilders]);

    return (
        <div>
            <div className="mb-4">
                <label className="block mb-2 font-medium">Select Data to Add:</label>
                <select
                    value={queryBuilderIndex}
                    onChange={handleQueryBuilderChange}
                    className="w-full p-2 border dark:border-gray-600 dark:bg-gray-800 rounded-md"
                    autoComplete="off"
                >
                    <option value={-1} disabled>
                        Select an option
                    </option>
                    {activeQueryBuilders.map((builder, index) => (
                        <option key={index} value={index}>
                            {builder.name}
                        </option>
                    ))}
                </select>
            </div>
            {queryBuilderIndex !== -1 && activeQueryBuilders[queryBuilderIndex].region && (
                <div className="mb-4">
                    <label className="block mb-2 font-medium">Select Region:</label>
                    <select
                        value={
                            typeof region === "string"
                                ? region
                                : region && "eu" in region
                                  ? "eu"
                                  : region && "usa" in region
                                    ? "usa"
                                    : ""
                        }
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === "eu") {
                                setRegion({ eu: true });
                            } else if (val === "usa") {
                                setRegion({ usa: true });
                            } else if (val) {
                                setRegion(val);
                            } else {
                                setRegion(null);
                            }
                        }}
                        className="w-full p-2 border dark:border-gray-600 dark:bg-gray-800 rounded-md"
                        autoComplete="off"
                    >
                        <option value="">All Regions (Average)</option>
                        {Object.entries(vendorInfo?.regionCleanNames || {}).map(
                            ([category, regions]) => {
                                const child = Object.entries(regions).map(
                                    ([regionCode, regionName]) => (
                                        <option key={regionCode} value={regionCode}>
                                            {regionName}
                                        </option>
                                    )
                                );
                                if (category === "") {
                                    return child;
                                }
                                return (
                                    <optgroup key={category} label={category}>
                                        {child}
                                    </optgroup>
                                );
                            }
                        )}
                        {!vendorInfo ||
                            (vendorInfo.usaRegions.length > 0 && (
                                <option value="usa">USA (Average)</option>
                            ))}
                        {!vendorInfo ||
                            (vendorInfo.euOrUKRegions.length > 0 && (
                                <option value="eu">EU / UK Regions (Average)</option>
                            ))}
                    </select>
                </div>
            )}
            <button
                className={`py-1 px-4 rounded text-white ${disabled ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                onClick={submit}
                disabled={disabled}
            >
                Add Column
            </button>
        </div>
    );
}

export default function VendorSelector({
    setQueries,
    exit,
    vendors,
    isLlm,
}: {
    setQueries: (cb: (prev: ColumnQuery[]) => ColumnQuery[]) => void;
    exit: () => void;
    vendors: Record<string, VendorInfo>;
    isLlm: boolean;
}) {
    const [selectedVendorSlug, setSelectedVendorSlug] = React.useState<string>("");

    const handleVendorChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedVendorSlug(e.target.value);
    }, []);

    return (
        <div className="w-full">
            <select
                value={selectedVendorSlug}
                onChange={handleVendorChange}
                className="w-full p-2 border dark:border-gray-600 dark:bg-gray-800 rounded-md mb-4"
                autoComplete="off"
            >
                <option value="">All Vendors</option>
                {Object.entries(vendors).map(([slug, info]) => (
                    <option key={slug} value={slug}>
                        {info.cleanName}
                    </option>
                ))}
            </select>
            <VendorItems
                vendors={vendors}
                vendorSlug={selectedVendorSlug}
                setQueries={setQueries}
                exit={exit}
                isLlm={isLlm}
            />
        </div>
    );
}
