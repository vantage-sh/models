import type { ColumnQuery } from "./Table";
import Column from "./Column";
import { useStateItem } from "../state";
import forexData from "../forex.json";

export const DEFAULT_COLUMN_WIDTH = 150;

const ZERO_ENDING_REGEX = /0+$/g;
const DOT_ENDING_REGEX = /\.$/g;

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

function renderColumn(
    cellVal: any,
    columnName: string | undefined,
    query: ColumnQuery,
    currency: string,
) {
    if (columnName) {
        const dataType = query.columnExplicitlySetDataTypes[columnName];
        if (dataType === "boolean") {
            return cellVal ? "Yes" : "No";
        }
        if (dataType === "currency") {
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
        if (dataType === "country") {
            if (typeof cellVal === "string") {
                return countryCodeToFlag(cellVal);
            }
            return "-";
        }
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

export default function RowLoadedValues({
    loadedValues,
    queryColumns,
    modelType,
}: {
    loadedValues: (any[] | null | { error: string })[];
    queryColumns: (string[] | null)[];
    modelType: "llm" | "image";
}) {
    const [llmQueries, setLlmQueries] = useStateItem("queries");
    const [imageQueries, setImageQueries] = useStateItem("imageQueries");
    const [currency] = useStateItem("currency");

    // Select appropriate queries based on modelType prop
    const queries = modelType === "llm" ? llmQueries : imageQueries;
    const setQueries = modelType === "llm" ? setLlmQueries : setImageQueries;

    const getColSpan = (index: number) => {
        const cols = queryColumns[index];
        return cols ? cols.length : 1;
    };

    return loadedValues.map((val, i) => {
        if (val === null) {
            return (
                new Array({ length: getColSpan(i) }).map((_, j) => (
                    <td key={`${i}-${j}`}>
                        <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-gray-200 hover:opacity-50 transition-all duration-150" 
                        />
                    </td>
                ))
            );
        } else if (Array.isArray(val)) {
            const res = val.map((cellVal, j) => (
                <Column
                    columnType="td" initialWidth={queries[i]?.widths?.[queryColumns[i]?.[j] || ""] || DEFAULT_COLUMN_WIDTH}
                    updateWidth={(newWidth: number) => {
                        const colName = queryColumns[i]?.[j];
                        if (colName) {
                            const query = queries[i];
                            if (!query.widths) {
                                query.widths = {};
                            }
                            query.widths[colName] = newWidth;
                        }
                        setQueries((old) => [...old]);
                    }}
                    key={`${i}-${j}`}
                >
                    {renderColumn(
                        cellVal,
                        queryColumns[i]?.[j],
                        queries[i],
                        currency,
                    )}
                </Column>
            ));
            if (res.length === 0) {
                const columns = queryColumns[i];
                if (columns) {
                    // Render <column count> empty cells
                    return Array.from({ length: columns.length }, (_, j) => (
                        <Column
                            columnType="td" initialWidth={queries[i]?.widths?.[queryColumns[i]?.[j] || ""] || DEFAULT_COLUMN_WIDTH}
                            updateWidth={(newWidth: number) => {
                                const colName = queryColumns[i]?.[j];
                                if (colName) {
                                    const query = queries[i];
                                    if (!query.widths) {
                                        query.widths = {};
                                    }
                                    query.widths[colName] = newWidth;
                                }
                                setQueries((old) => [...old]);
                            }}
                            key={`${i}-${j}`}
                        >
                            -
                        </Column>
                    ));
                }
            }
            return res;
        } else {
            return (
                <td key={i} style={{ width: DEFAULT_COLUMN_WIDTH * getColSpan(i) }} colSpan={getColSpan(i)}>
                    Error: {val.error}
                </td>
            );
        }
    });
}
