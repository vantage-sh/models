import type { ColumnQuery } from "./Table";
import LoadingEffect from "./LoadingEffect";
import Column from "./Column";
import { useStateItem } from "../state";

export const DEFAULT_COLUMN_WIDTH = 150;

const ZERO_ENDING_REGEX = /0+$/g;
const DOT_ENDING_REGEX = /\.$/g;

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
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency,
            }).format(Number(cellVal));
        }
        if (dataType === "country") {
            // TODO
            return cellVal;
        }
    }

    if (cellVal === null) {
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
}: {
    loadedValues: (any[] | null | { error: string })[];
    queryColumns: (string[] | null)[];
}) {
    const [queries, setQueries] = useStateItem("queries");
    const [currency] = useStateItem("currency");

    const getColSpan = (index: number) => {
        const cols = queryColumns[index];
        return cols ? cols.length : 1;
    };

    return loadedValues.map((val, i) => {
        if (val === null) {
            return (
                <td key={i} colSpan={getColSpan(i)}>
                    <LoadingEffect />
                </td>
            );
        } else if (Array.isArray(val)) {
            let res = val.map((cellVal, j) => (
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
            const expectedLen = getColSpan(i);
            if (res.length > expectedLen) {
                res = res.slice(0, expectedLen);
            }
            const emptyCells = expectedLen - val.length;
            for (let k = 0; k < emptyCells; k++) {
                res.push(
                    <td key={`${i}-empty-${k}`}>
                        TODO: infer column name from everything else
                    </td>
                );
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
