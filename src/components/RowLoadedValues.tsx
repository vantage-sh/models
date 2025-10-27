import type { ColumnQuery } from "./Table";
import LoadingEffect from "./LoadingEffect";

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
}: {
    loadedValues: (any[] | null | { error: string })[];
    queryColumns: (string[] | null)[];
    queries: ColumnQuery[];
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
                <td key={`${i}-${j}`}>
                    {renderColumn(
                        cellVal,
                        queryColumns[i]?.[j],
                        queries[i],
                    )}
                </td>
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
                <td key={i} colSpan={getColSpan(i)}>
                    Error: {val.error}
                </td>
            );
        }
    });
}
