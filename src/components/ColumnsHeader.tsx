import React from "react";
import type { ColumnsHeaderProps } from "./utils/useMultiColumnSync";
import type { ColumnDataType } from "./Table";
import { useStateItem } from "../state";
import Column from "./Column";
import SQLEditorButton from "./SQLEditorButton";
import SortingButtons from "./SortingButtons";
import { DEFAULT_COLUMN_WIDTH } from "./Table";
import type { OperatorTypes } from "./filters/NumberFilter";

function BooleanFilter({
    value,
    onChange,
}: {
    value: boolean | undefined;
    onChange: (v: boolean | undefined) => void;
}) {
    return (
        <select
            value={value === undefined ? "any" : value ? "true" : "false"}
            onChange={(e) => {
                const v = e.target.value;
                onChange(v === "any" ? undefined : v === "true");
            }}
            className="w-full border text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md p-1"
        >
            <option value="any">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
        </select>
    );
}

function StringFilter({
    value,
    columnName,
    onChange,
}: {
    value: string;
    columnName: string;
    onChange: (v: string) => void;
}) {
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md p-1 placeholder:text-gray-500 dark:placeholder:text-gray-400 placeholder:font-light"
            aria-label={`Filter ${columnName}`}
            placeholder={`Filter by ${columnName}...`}
        />
    );
}

function NumberFilter({
    value,
    columnName,
    onChange,
}: {
    value: [OperatorTypes, number] | undefined;
    columnName: string;
    onChange: (v: [OperatorTypes, number] | undefined) => void;
}) {
    const [op, num] = value ?? [">=", 0];
    return (
        <div className="flex">
            <select
                value={op}
                onChange={(e) => onChange([e.target.value as OperatorTypes, num])}
                className="border text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md p-1 mr-1"
                aria-label={`Operator for filtering ${columnName}`}
            >
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="=">=</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
            </select>
            <input
                type="number"
                value={num}
                onChange={(e) => onChange([op, Number(e.target.value)])}
                className="border text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md p-1 w-full"
                aria-label={`Value for filtering ${columnName}`}
            />
        </div>
    );
}

function QueryFilter({
    columnName,
    columnType,
    specificType,
    currentFilter,
    onFilterChange,
}: {
    columnName: string;
    columnType: string;
    specificType: ColumnDataType | undefined;
    currentFilter: any;
    onFilterChange: (columnName: string, filter: any) => void;
}) {
    if (specificType === "boolean" || columnType === "boolean") {
        return (
            <BooleanFilter value={currentFilter} onChange={(v) => onFilterChange(columnName, v)} />
        );
    }
    if (columnType === "string") {
        return (
            <StringFilter
                value={currentFilter ?? ""}
                columnName={columnName}
                onChange={(v) => onFilterChange(columnName, v === "" ? undefined : v)}
            />
        );
    }
    if (columnType === "number") {
        return (
            <NumberFilter
                value={currentFilter}
                columnName={columnName}
                onChange={(v) => onFilterChange(columnName, v)}
            />
        );
    }
    return null;
}

export default function ColumnsHeader({
    columns,
    useColumnTypes,
    filters,
    query,
    queryIdx,
    columnSpecificDataTypes,
    updateQuery,
    initialSorting,
    onFilterChange,
    onSortChange,
    isLlm,
    firstId,
}: ColumnsHeaderProps) {
    const path = isLlm ? "/" : "/image-models"; // FIXME: This is a hack.
    const [queries, setQueries] = useStateItem("queries", path);

    // Only re-renders when the dominant value type per column changes.
    const columnTypesKey = useColumnTypes();
    const columnTypes = columnTypesKey ? columnTypesKey.split(",") : [];

    const joined = React.useMemo(() => {
        return {
            query: query,
            columnExplicitlySetDataTypes: columnSpecificDataTypes,
            columnFilters: filters,
            widths: queries[queryIdx]?.widths ?? {},
        };
    }, [query, columnSpecificDataTypes, filters, queries, queryIdx]);

    const deleteQuery = React.useCallback(() => {
        setQueries((prev) => {
            const newQueries = [...prev];
            newQueries.splice(queryIdx, 1);
            return newQueries;
        });
    }, [setQueries, queryIdx]);

    const setSorting = React.useCallback(
        (columnName: string, cb: (value: boolean | null) => boolean | null) => {
            const current = initialSorting?.[0] === columnName ? initialSorting[1] : null;
            const next = cb(current ?? null);
            if (next === null) {
                onSortChange(null);
            } else {
                onSortChange([columnName, next]);
            }
        },
        [initialSorting, onSortChange]
    );

    const end = React.useMemo(
        () => (
            <>
                <button
                    className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 rounded transition block"
                    title="Delete column"
                    onClick={deleteQuery}
                >
                    &#x2715;
                </button>
                <SQLEditorButton query={joined} updateQuery={updateQuery} firstId={firstId} />
            </>
        ),
        [deleteQuery, joined, updateQuery, firstId]
    );

    if (!columns) {
        return (
            <th
                className="pb-1 relative bg-[#F7F7F9] dark:bg-gray-900 align-bottom"
                style={{ width: DEFAULT_COLUMN_WIDTH }}
            >
                <div className="flex justify-end">{end}</div>
                <div className="absolute top-0 right-0 w-1 h-full bg-gray-200 dark:bg-gray-700 hover:opacity-50 transition-all duration-150" />
            </th>
        );
    }

    return columns.map((column, index) => (
        <Column
            columnType="th"
            key={column}
            initialWidth={queries[queryIdx]?.widths?.[column] || DEFAULT_COLUMN_WIDTH}
            updateWidth={(newWidth) => {
                setQueries((prev) => {
                    const newQueries = [...prev];
                    const item = newQueries[queryIdx];
                    if (!item.widths) item.widths = {};
                    item.widths[column] = newWidth;
                    return newQueries;
                });
            }}
        >
            <div className="flex items-center mb-1 grow">
                <div className="block grow">
                    <div className="flex items-center gap-2">
                        <div className="line-clamp-2 font-inter-header text-left" title={column}>
                            {column}
                        </div>
                        <SortingButtons
                            ascending={initialSorting?.[0] === column ? initialSorting[1] : null}
                            setSorting={setSorting}
                            columnName={column}
                        />
                    </div>
                </div>
                {index === columns.length - 1 && end}
            </div>
            <div className="w-full mt-auto">
                <QueryFilter
                    columnName={column}
                    columnType={columnTypes[index] ?? ""}
                    specificType={columnSpecificDataTypes[column]}
                    currentFilter={filters[column]}
                    onFilterChange={onFilterChange}
                />
            </div>
        </Column>
    ));
}
