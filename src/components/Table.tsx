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

function SortingButtons({
    columnName,
    query,
    updateQuery,
}: {
    columnName: string;
    query: ColumnQuery;
    updateQuery: () => void;
}) {
    const ascending = query.columnOrdering[columnName];

    const setSorting = (asc: boolean | undefined) => {
        if (asc === undefined) {
            delete query.columnOrdering[columnName];
        } else {
            query.columnOrdering[columnName] = asc;
        }
        updateQuery();
    };

    return (
        <div className="flex flex-col ml-1">
            <button
                onClick={() => setSorting(ascending === true ? undefined : true)}
                className={`text-[8px] leading-2 p-0 border-none bg-none cursor-pointer ${ascending === true ? "font-bold" : "font-normal"}`}
                aria-label="Sort ascending"
            >
                ▲
            </button>
            <button
                onClick={() => setSorting(ascending === false ? undefined : false)}
                className={`text-[8px] leading-2 p-0 border-none bg-none cursor-pointer ${ascending === false ? "font-bold" : "font-normal"}`}
                aria-label="Sort descending"
            >
                ▼
            </button>
        </div>
    );
}

function BooleanFilter({
    columnName,
    query,
    updateQuery,
}: {
    columnName: string;
    query: ColumnQuery;
    updateQuery: () => void;
}) {
    const currentFilter = query.columnFilters[columnName];

    const setFilter = (value: boolean | undefined) => {
        if (value === undefined) {
            delete query.columnFilters[columnName];
        } else {
            query.columnFilters[columnName] = value;
        }
        updateQuery();
    };

    return (
        <select
            value={currentFilter === undefined ? "any" : currentFilter ? "true" : "false"}
            onChange={(e) => {
                const val = e.target.value;
                if (val === "any") {
                    setFilter(undefined);
                } else if (val === "true") {
                    setFilter(true);
                } else {
                    setFilter(false);
                }
            }}
            className="w-full border text-sm border-gray-300 rounded-md p-1"
        >
            <option value="any">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
        </select>
    );
}

function QueryFilter({
    columnName,
    query,
    updateQuery,
}: {
    columnName: string;
    query: ColumnQuery;
    updateQuery: () => void;
}) {
    const specificType = query.columnExplicitlySetDataTypes[columnName];

    if (specificType === "boolean") {
        return (
            <BooleanFilter
                columnName={columnName}
                query={query}
                updateQuery={updateQuery}
            />
        );
    }

    // TODO: filter ui

    return null;
}

function checkFilters(
    row: { [column: string]: any },
    filters: Record<string, any>,
    explicitlySetDataTypes: Record<string, ColumnDataType>,
): boolean {
    for (const [col, val] of Object.entries(filters)) {
        const dataType = explicitlySetDataTypes[col];
        if (dataType === "boolean") {
            const rowVal = Boolean(row[col]);
            if (rowVal !== Boolean(val)) {
                return false;
            }
        }
    }

    // TODO: other filter types

    return true;
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

    // TODO: in the future add deletion/etc
    return queryColumns.map((col) => (
        <th key={col}>
            <div className="flex">
                <div className="block">
                    {col}
                    <div className="w-full">
                        <QueryFilter
                            columnName={col}
                            query={query}
                            updateQuery={updateQuery}
                        />
                    </div>
                </div>
                <SortingButtons
                    columnName={col}
                    query={query}
                    updateQuery={updateQuery}
                />
            </div>
        </th>
    ));
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
                    if (!checkFilters(row, query.columnFilters, query.columnExplicitlySetDataTypes)) {
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

const cachedQueriesKey = new WeakMap<ColumnQuery[], string>();

function getQueriesKey(queries: ColumnQuery[]): string {
    let key = cachedQueriesKey.get(queries);
    if (!key) {
        key = queries.map((q) => q.query + JSON.stringify(q.columnFilters) + JSON.stringify(q.columnExplicitlySetDataTypes)).join("||");
        cachedQueriesKey.set(queries, key);
    }
    return key;
}

type LoadedValues = (any[] | null | { error: string })[] | null;

function TableRow({
    id,
    name,
    queries,
    queryColumns,
    setQueryColumns,
    loadedValues,
    setLoadedValues,
}: {
    id: string;
    name: string;
    queries: ColumnQuery[];
    queryColumns: (string[] | null)[];
    setQueryColumns: (cols: (string[] | null)[]) => void;
    loadedValues: LoadedValues;
    setLoadedValues: (vals: LoadedValues) => void;
}) {
    const [rowVisible, setRowVisible] = React.useState(true);

    const queriesKey = getQueriesKey(queries);
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
    }, [id, queriesKey]);

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

function sortValue(
    aVal: any,
    bVal: any,
    ascending: boolean,
    dataType: ColumnDataType | undefined,
): number {
    let comparison = 0;

    if (dataType === "boolean") {
        const aBool = Boolean(aVal);
        const bBool = Boolean(bVal);
        comparison = (aBool === bBool) ? 0 : (aBool ? 1 : -1);
    } else if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
    } else {
        const aStr = String(aVal);
        const bStr = String(bVal);
        comparison = aStr.localeCompare(bStr);
    }

    return ascending ? comparison : -comparison;
}

function sortIdsAndNames(
    idsAndNames: { id: string; name: string }[],
    queries: ColumnQuery[],
    queryColumns: (string[] | null)[],
    loadedValuesMap: Map<string, LoadedValues>,
) {
    return idsAndNames.slice().sort((a, b) => {
        const aValues = loadedValuesMap.get(a.id);
        const bValues = loadedValuesMap.get(b.id);

        for (let i = 0; i < queries.length; i++) {
            const queryOrdering = queries[i].columnOrdering;

            for (const [colName, ascending] of Object.entries(queryOrdering)) {
                const queryIdx = queryColumns[i]?.indexOf(colName);
                if (queryIdx === undefined || queryIdx === -1) {
                    continue;
                }

                const aQuery = aValues?.[i];
                const bQuery = bValues?.[i];
                if (!Array.isArray(aQuery)) {
                    // Rank bQuery higher if it is valid, otherwise equal
                    if (Array.isArray(bQuery)) {
                        return ascending ? 1 : -1;
                    }
                    continue;
                }

                if (!Array.isArray(bQuery)) {
                    // Rank aQuery higher
                    return ascending ? -1 : 1;
                }

                const aVal = aQuery[queryIdx];
                const bVal = bQuery[queryIdx];

                const ranking = sortValue(aVal, bVal, ascending, queries[i].columnExplicitlySetDataTypes[colName]);
                if (ranking !== 0) {
                    return ranking;
                }
            }
        }

        return 0;
    });
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
    const [loadedValuesRows, setLoadedValuesRows] = React.useState<[Map<string, LoadedValues>]>(
        () => [new Map(idsAndNames.map(({ id }) => [id, null]))]
    );
    const sortedIdsAndNames = React.useMemo(() => {
        return sortIdsAndNames(idsAndNames, queries, queryColumns, loadedValuesRows[0]);
    }, [idsAndNames, queries, queryColumns, loadedValuesRows]);

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
                    sortedIdsAndNames.map(({ id, name }) => (
                        <TableRow
                            id={id}
                            key={id}
                            name={name}
                            queries={queries}
                            queryColumns={queryColumns}
                            setQueryColumns={setQueryColumns}
                            loadedValues={loadedValuesRows[0].get(id)!}
                            setLoadedValues={(vals) => {
                                setLoadedValuesRows((prev) => {
                                    prev[0].set(id, vals);
                                    return [prev[0]];
                                });
                            }}
                        />
                    ))
                }
            </tbody>
        </table>
    );
}
