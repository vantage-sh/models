import React from "react";
import { defaultQueries } from "../constants";
import { loadSingleRow } from "../sqlEngine";

type ColumnDataType =
    "boolean" |
    "currency";

type ColumnQuery = {
    query: string;
    columnExplicitlySetDataTypes: Record<string, ColumnDataType>;
    columnOrdering: Record<string, boolean>;
    columnFilters: Record<string, any>;
};

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
    const [storedValue, setStoredValue] = React.useState<T>(initialValue);

    React.useEffect(() => {
        const item = window.localStorage.getItem(key);
        if (item) {
            setStoredValue(JSON.parse(item));
        } else {
            window.localStorage.setItem(key, JSON.stringify(initialValue));
        }
    }, [key, initialValue]);

    const setValue = React.useCallback((value: T) => {
        setStoredValue(value);
        window.localStorage.setItem(key, JSON.stringify(value));
    }, [key]);

    return [storedValue, setValue];
}

function getDefaults(): ColumnQuery[] {
    return defaultQueries.map(({ name, ...dq }) => ({
        ...dq,
        columnOrdering: {},
        columnFilters: {},
    }));
}

function LoadingAffect() {
    // TODO: make this nicer
    return (
        <div>Loading...</div>        
    );
}

function TableHeader({
    query,
    updateQuery,
    deleteQuery,
    queryColumns,
}: {
    query: ColumnQuery;
    updateQuery: () => void;
    deleteQuery: () => void;
    queryColumns: string[] | null;
}) {
    if (queryColumns === null) {
        return (
            <th>
                <LoadingAffect />
            </th>
        );
    }

    // TODO: in the future add deletion/filtering/etc
    return queryColumns.map((col) => (
        <th key={col}>
            {col}
        </th>
    ));
}

function checkFilters(
    row: { [column: string]: any },
    filters: Record<string, any>,
): boolean {
    // TODO
    return true;
}

let rowLocks = 0;

async function loadSingleRowData(
    id: string,
    queries: ColumnQuery[],
    queryColumns: (string[] | null)[],
    setQueryColumns: (cols: (string[] | null)[]) => void,
    setLoadedValues: (vals: (any[] | null | { error: string })[] | null) => void,
    setRowVisible: (visible: boolean) => void,
    mountedRef: [boolean],
) {
    // Only one row at a time to allow for a cleaner load
    while (rowLocks++ !== 0) {
        rowLocks--;
        await new Promise((resolve) => setTimeout(resolve, 1));
    }

    const loadedColumns: (any[] | null | { error: string })[] = [];
    const write = () => {
        if (!mountedRef[0]) return false;
        setLoadedValues(loadedColumns);
        return true;
    };

    // Firstly, handle any filtered columns
    let noFiltersNegative = true;
    const load = async (query: ColumnQuery, index: number) => {
        // Load from the database
        try {
            await loadSingleRow(query.query, id).then((row) => {
                if (row) {
                    const sortedColumns = Object.keys(row).sort();
                    queryColumns[index] = sortedColumns;
                    setQueryColumns([...queryColumns]);
                    loadedColumns[index] = sortedColumns.map((col) => row[col]);

                    // Check filters
                    if (!checkFilters(row, query.columnFilters)) {
                        noFiltersNegative = false;
                    }
                } else if (queryColumns[index] === null) {
                    queryColumns[index] = [];
                    setQueryColumns([...queryColumns]);
                    loadedColumns[index] = [];
                } else {
                    loadedColumns[index] = [];
                }
            });
        } catch (e) {
            loadedColumns[index] = { error: (e as Error).message };
        } finally {
            write();
        }
    };
    for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        if (Object.keys(q.columnFilters).length > 0) {
            await load(q, i);
        }
    }
    setRowVisible(noFiltersNegative);

    // Then, handle any unfiltered columns
    for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        if (Object.keys(q.columnFilters).length === 0) {
            await load(q, i);
        }
    }
}

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

function RowLoadedValues({
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
                    <LoadingAffect />
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

function TableRow({
    id,
    name,
    queries,
    queryColumns,
    setQueryColumns,
}: {
    id: string;
    name: string;
    queries: ColumnQuery[];
    queryColumns: (string[] | null)[];
    setQueryColumns: (cols: (string[] | null)[]) => void;
}) {
    const [rowVisible, setRowVisible] = React.useState(true);
    const [loadedValues, setLoadedValues] = React.useState<(any[] | null | { error: string })[] | null>(null);

    React.useEffect(() => {
        const mounted = [true] as [boolean];
        setLoadedValues(null);

        loadSingleRowData(
            id,
            queries,
            queryColumns,
            setQueryColumns,
            setLoadedValues,
            setRowVisible,
            mounted,
        ).finally(() => {
            rowLocks--;
        });

        return () => {
            mounted[0] = false;
        };
    }, [id, queries]);

    if (!rowVisible) {
        return null;
    }

    return (
        <tr>
            <td>{name}</td>
            {
                loadedValues ? (
                    <RowLoadedValues
                        loadedValues={loadedValues}
                        queryColumns={queryColumns}
                        queries={queries}
                    />
                ) : (
                    <td colSpan={queries.length}>
                        <LoadingAffect />
                    </td>
                )
            }
        </tr>
    );
}

export default function Table({
    idsAndNames,
}: {
    idsAndNames: { id: string; name: string }[];
}) {
    const defaults = React.useMemo(() => getDefaults(), []);
    const [queries, setQueries] = useLocalStorage<ColumnQuery[]>("table-queries", defaults);
    const [queryColumns, setQueryColumns] = React.useState<(string[] | null)[]>(
        () => Array(queries.length).fill(null)
    );

    React.useEffect(() => {
        if (queries.length !== queryColumns.length) {
            setQueryColumns(Array(queries.length).fill(null));
        }
    }, [queries, queryColumns.length]);

    return (
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    {
                        queries.map((q, i) => (
                            <TableHeader
                                key={i}
                                query={q}
                                updateQuery={() => {
                                    const newQueries = [...queries];
                                    newQueries[i] = q;
                                    setQueries(newQueries);
                                }}
                                deleteQuery={() => {
                                    const newQueries = queries.filter((_, idx) => idx !== i);
                                    setQueries(newQueries);
                                }}
                                queryColumns={queryColumns[i]}
                            />
                        ))
                    }
                </tr>
            </thead>
            <tbody>
                {
                    idsAndNames.map(({ id, name }) => (
                        <TableRow
                            id={id}
                            key={id}
                            name={name}
                            queries={queries}
                            queryColumns={queryColumns}
                            setQueryColumns={setQueryColumns}
                        />
                    ))
                }
            </tbody>
        </table>
    );
}
