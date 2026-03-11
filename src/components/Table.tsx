import React from "react";
import type { VendorInfo } from "../dataFormat";
import { clearState, useStateItem } from "../state";
import { useMultiColumnSync, type CustomTdProps } from "./utils/useMultiColumnSync";
import { PlusIcon, XIcon } from "lucide-react";
import RunQueryButton from "./RunQueryButton";
import CurrencyPicker from "./CurrencyPicker";
import AddButton from "./AddButton";
import Column from "./Column";
import forexData from "../forex.json";
import Link from "./Link";
import ColumnsHeader from "./ColumnsHeader";

export const DEFAULT_COLUMN_WIDTH = 200;

export type ColumnDataType = "boolean" | "currency" | "country";

export type ColumnQuery = {
    query: string;
    columnExplicitlySetDataTypes: Record<string, ColumnDataType>;
    columnFilters: Record<string, any>;
    widths?: Record<string, number>;
};

export type LoadedValues = (any[] | null | { error: string })[] | null;

function NameFilter({
    nameFilter,
    setNameFilter,
}: {
    nameFilter: string;
    setNameFilter: (nameFilter: string) => void;
}) {
    return (
        <div className="px-2 flex flex-col h-full">
            <div
                id="name-filter-header"
                className="grow flex items-center w-full font-inter-header"
            >
                <p>Name</p>
            </div>
            <input
                type="text"
                value={nameFilter}
                aria-label="Name Filter"
                placeholder="Filter by Name..."
                onChange={(e) => setNameFilter(e.target.value)}
                className="w-full border text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md p-1 mt-auto placeholder:text-gray-500 dark:placeholder:text-gray-400 placeholder:font-light"
            />
        </div>
    );
}

function Toolbar({
    isLlm,
    addQueryOpen,
    setAddQueryOpen,
}: {
    isLlm: boolean;
    addQueryOpen: boolean;
    setAddQueryOpen: (open: boolean) => void;
}) {
    return (
        <div className="flex items-end justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 gap-4">
            <div className="flex items-end gap-6">
                {/* <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                        Output
                    </span>
                    <ModelTypeTabs />
                </div> */}
                <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                        Currency
                    </span>
                    <CurrencyPicker isLlm={isLlm} />
                </div>
                <button
                    onClick={() => clearState()}
                    className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <XIcon className="w-3.5 h-3.5" />
                    Reset Columns
                </button>
            </div>
            <div className="flex items-center gap-1">
                <RunQueryButton />
                <button
                    onClick={() => setAddQueryOpen(!addQueryOpen)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                        addQueryOpen
                            ? "bg-[#6742d6] text-white"
                            : "border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Add Query
                </button>
            </div>
        </div>
    );
}

function countryCodeToFlag(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
    try {
        return `${String.fromCodePoint(...codePoints)} (${countryCode})`;
    } catch {
        return countryCode;
    }
}

const ZERO_ENDING_REGEX = /0+$/g;
const DOT_ENDING_REGEX = /\.$/g;

function renderColumn(
    cellVal: any,
    columnSpecificDataType: ColumnDataType | undefined,
    currency: string
) {
    if (columnSpecificDataType === "boolean") {
        return cellVal ? "Yes" : "No";
    }
    if (columnSpecificDataType === "currency") {
        const rate = forexData[currency as keyof typeof forexData]?.rate ?? forexData.USD.rate;
        if (typeof cellVal !== "number") {
            return "-";
        }
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            maximumFractionDigits: 6,
        }).format(cellVal * rate);
    }
    if (columnSpecificDataType === "country") {
        if (typeof cellVal === "string") {
            return countryCodeToFlag(cellVal);
        }
        return "-";
    }

    if (cellVal === null || cellVal === undefined) {
        return "-";
    }

    if (typeof cellVal === "number") {
        // Round to 4 decimal places
        const v = cellVal.toFixed(4);
        const x = v.replace(ZERO_ENDING_REGEX, "").replace(DOT_ENDING_REGEX, "");
        if (x === "") return "0";
        return x;
    }

    return String(cellVal);
}

function Cell({
    value,
    columnSpecificDataType,
    isLlm,
}: {
    value: any;
    columnSpecificDataType: ColumnDataType | undefined;
    isLlm: boolean;
}) {
    const [currency] = useStateItem("currency", isLlm);
    return React.useMemo(() => {
        return renderColumn(value, columnSpecificDataType, currency);
    }, [value, columnSpecificDataType, currency]);
}

function CustomTd({ children, queryIdx, columnName, isLlm }: CustomTdProps) {
    const [queries, setQueries] = useStateItem("queries", isLlm);

    const updateWidth = React.useCallback(
        (newWidth: number) => {
            if (columnName === null) return;
            setQueries((prev) => {
                const newQueries = [...prev];
                const item = newQueries[queryIdx];
                if (!item.widths) {
                    item.widths = {};
                }
                item.widths[columnName] = newWidth;
                return newQueries;
            });
        },
        [setQueries, columnName]
    );

    if (columnName === null) {
        return (
            <td className="relative">
                {children}
                <div className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:opacity-50 transition-all duration-150" />
            </td>
        );
    }

    return (
        <Column
            columnType="td"
            initialWidth={queries[queryIdx]?.widths?.[columnName] || DEFAULT_COLUMN_WIDTH}
            updateWidth={updateWidth}
            key={columnName}
        >
            {children}
        </Column>
    );
}

function NameView({ name, modelId, isLlm }: { name: string; modelId: string; isLlm: boolean }) {
    const modelPath = isLlm ? "llm-models" : "image-models";
    return (
        <td className="relative">
            <div className="px-2 font-roboto-mono">
                <Link href={`${import.meta.env.PUBLIC_BASE_PATH ?? ""}/${modelPath}/${modelId}`}>
                    {name}
                </Link>
            </div>
            <div className="absolute top-0 right-0 w-1 h-full bg-gray-200 dark:bg-gray-700 hover:opacity-50 transition-all duration-150" />
        </td>
    );
}

export default function Table({
    models,
    vendors,
    isLlm,
}: {
    models: { id: string; name: string }[];
    vendors: Record<string, VendorInfo>;
    isLlm: boolean;
}) {
    const [queries, setQueries] = useStateItem("queries", isLlm);
    const [nameFilter, setNameFilter] = useStateItem("nameFilter", isLlm);
    const [addQueryOpen, setAddQueryOpen] = React.useState(false);

    const onQueryChange = React.useCallback(
        (
            query: string,
            columnSpecificDataTypes: Record<string, ColumnDataType>,
            queryIdx: number
        ) => {
            setQueries((prev) => {
                const newQueries = [...prev];
                const item = newQueries[queryIdx];
                item.query = query;
                item.columnExplicitlySetDataTypes = columnSpecificDataTypes;
                return newQueries;
            });
        },
        [setQueries]
    );

    const queriesPartial = React.useMemo(() => {
        return queries.map((q) => ({
            query: q.query,
            columnSpecificDataTypes: q.columnExplicitlySetDataTypes,
            filters: q.columnFilters,
        }));
    }, [JSON.stringify(queries)]); // This is bad. Never do this. This is a weird case.

    const onFilterChange = React.useCallback(
        (columnName: string, filter: any, queryIdx: number) => {
            setQueries((prev) => {
                const newQueries = [...prev];
                const item = newQueries[queryIdx];
                if (filter === undefined) {
                    delete item.columnFilters[columnName];
                } else {
                    item.columnFilters[columnName] = filter;
                }
                return newQueries;
            });
        },
        [setQueries]
    );

    const [headersWithoutName, tableRows] = useMultiColumnSync(
        queriesPartial,
        onQueryChange,
        onFilterChange,
        models,
        Cell,
        ColumnsHeader,
        CustomTd,
        nameFilter,
        NameView,
        isLlm,
        models[0].id,
    );

    return (
        <React.StrictMode>
            <div className="flex flex-col h-full">
                <Toolbar
                    isLlm={isLlm}
                    addQueryOpen={addQueryOpen}
                    setAddQueryOpen={setAddQueryOpen}
                />
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1 overflow-x-auto">
                        <div className="flex items-start min-w-max">
                            <table className="h-full">
                                <thead className="sticky top-0 bg-[#F7F7F9] dark:bg-gray-900 z-10 shadow-[0_2px_0_0_rgb(209,213,219)] dark:shadow-[0_2px_0_0_rgb(75,85,99)]">
                                    <tr>
                                        <th className="pb-1 relative bg-[#F7F7F9] dark:bg-gray-900 align-bottom">
                                            <NameFilter
                                                nameFilter={nameFilter}
                                                setNameFilter={setNameFilter}
                                            />
                                            <div className="absolute top-0 right-0 w-1 h-full bg-gray-200 dark:bg-gray-700 hover:opacity-50 transition-all duration-150" />
                                        </th>
                                        {headersWithoutName}
                                    </tr>
                                </thead>
                                <tbody className="h-full overflow-y-scroll">{tableRows}</tbody>
                            </table>
                        </div>
                    </div>
                    <AddButton
                        isOpen={addQueryOpen}
                        onClose={() => setAddQueryOpen(false)}
                        firstId={models[0]?.id || ""}
                        vendors={vendors}
                        isLlm={isLlm}
                    />
                </div>
            </div>
        </React.StrictMode>
    );
}
