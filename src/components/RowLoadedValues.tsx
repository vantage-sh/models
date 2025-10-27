import type { ColumnQuery } from "./Table";
import LoadingEffect from "./LoadingEffect";
import Column from "./Column";

export const DEFAULT_COLUMN_WIDTH = 150;

function renderColumn(
    cellVal: any,
    columnName: string | undefined,
    query: ColumnQuery,
) {
    if (columnName) {
        const dataType = query.columnExplicitlySetDataTypes[columnName];
        if (dataType === "boolean") {
            return cellVal ? "Yes" : "No";
        }
        if (dataType === "currency") {
            // TODO
            return cellVal;
        }
    }

    return String(cellVal);
}

export default function RowLoadedValues({
    loadedValues,
    queryColumns,
    queries,
    updateQueries,
}: {
    loadedValues: (any[] | null | { error: string })[];
    queryColumns: (string[] | null)[];
    queries: ColumnQuery[];
    updateQueries: () => void;
}) {
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
                    columnType="td" initialWidth={queries[i].widths?.[queryColumns[i]?.[j] || ""] || DEFAULT_COLUMN_WIDTH}
                    updateWidth={(newWidth: number) => {
                        const colName = queryColumns[i]?.[j];
                        if (colName) {
                            const query = queries[i];
                            if (!query.widths) {
                                query.widths = {};
                            }
                            query.widths[colName] = newWidth;
                        }
                        updateQueries();
                    }}
                    key={`${i}-${j}`}
                >
                    {renderColumn(
                        cellVal,
                        queryColumns[i]?.[j],
                        queries[i],
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
                        {/* Empty */}
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
