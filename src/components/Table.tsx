import React from "react";
import { defaultQueries } from "../constants";
import { loadSingleRow } from "../sqlEngine";
import BooleanFilter from "./filters/BooleanFilter";
import StringFilter from "./filters/StringFilter";
import { NumberFilter } from "./filters/NumberFilter";
import useLocalStorage from "./hooks/useLocalStorage";
import LoadingEffect from "./LoadingEffect";
import RowLoadedValues, { DEFAULT_COLUMN_WIDTH } from "./RowLoadedValues";
import sortValue from "./utils/sortValue";
import SortingButtons from "./SortingButtons";
import checkFilters from "./filters/checkFilters";
import Column from "./Column";

export type ColumnDataType =
    "boolean" |
    "currency";

export type ColumnQuery = {
    query: string;
    columnExplicitlySetDataTypes: Record<string, ColumnDataType>;
    columnOrdering: Record<string, boolean>;
    columnFilters: Record<string, any>;
    widths?: Record<string, number>;
};

const defaults = defaultQueries.map(({ name, ...dq }) => ({
    ...dq,
    columnOrdering: {},
    columnFilters: {},
}));

function QueryFilter({
    columnName,
    query,
    updateQuery,
    values,
}: {
    columnName: string;
    query: ColumnQuery;
    updateQuery: () => void;
    values: any[];
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

    const valueTypeSet = new Set<string>();
    for (const val of values) {
        valueTypeSet.add(val === null ? "null" : typeof val);
    }
    valueTypeSet.delete("null");
    if (valueTypeSet.size !== 1) {
        return null;
    }

    switch (valueTypeSet.values().next().value) {
        case "boolean":
            return (
                <BooleanFilter
                    columnName={columnName}
                    query={query}
                    updateQuery={updateQuery}
                />
            );
        case "string":
            return (
                <StringFilter
                    columnName={columnName}
                    query={query}
                    updateQuery={updateQuery}
                />
            )
        case "number":
            return (
                <NumberFilter
                    columnName={columnName}
                    query={query}
                    updateQuery={updateQuery}
                />
            )
    }

    return null;
}

type LoadedValues = (any[] | null | { error: string })[] | null;

function TableHeader({
    query,
    queryIdx,
    updateQuery,
    deleteQuery,
    queryColumns,
    loadedValuesPtr,
}: {
    query: ColumnQuery;
    queryIdx: number;
    updateQuery: () => void;
    deleteQuery: () => void;
    queryColumns: string[] | null;
    loadedValuesPtr: [Map<string, LoadedValues>];
}) {
    if (queryColumns === null) {
        return (
            <th className="pb-1">
                <LoadingEffect />
            </th>
        );
    }

    const values = React.useMemo(() => {
        return Array.from(loadedValuesPtr[0].values()).map((lv) => {
            if (lv === null) {
                return undefined;
            }
            return lv;
        }).filter((v) => v !== undefined);
    }, [loadedValuesPtr]);

    // TODO: in the future add deletion/etc
    return queryColumns.map((col, idx) => (
        <Column
            columnType="th" initialWidth={query.widths?.[col] || DEFAULT_COLUMN_WIDTH}
            key={col} className="pb-1" updateWidth={(width) => {
                if (!query.widths) {
                    query.widths = {
                        [col]: width,
                    };
                    updateQuery();
                    return;
                }
                query.widths[col] = width;
                updateQuery();
            }}
        >
            <div className="flex">
                <div className="block grow">
                    {col}
                    <div className="w-full">
                        <QueryFilter
                            columnName={col}
                            query={query}
                            updateQuery={updateQuery}
                            values={values.map((lv) => {
                                if (lv === null) {
                                    return undefined;
                                }
                                const queryFromIdx = lv[queryIdx];
                                if (!Array.isArray(queryFromIdx)) {
                                    return undefined;
                                }
                                return queryFromIdx[idx];
                            }).filter((v) => v !== undefined)}
                        />
                    </div>
                </div>
                <SortingButtons
                    columnName={col}
                    query={query}
                    updateQuery={updateQuery}
                />
            </div>
        </Column>
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

const cachedQueriesKey = new WeakMap<ColumnQuery[], string>();

function getQueriesKey(queries: ColumnQuery[]): string {
    let key = cachedQueriesKey.get(queries);
    if (!key) {
        key = queries.map((q) => q.query + JSON.stringify(q.columnFilters) + JSON.stringify(q.columnExplicitlySetDataTypes)).join("||");
        cachedQueriesKey.set(queries, key);
    }
    return key;
}

function TableRow({
    id,
    name,
    queries,
    setQueries,
    queryColumns,
    setQueryColumns,
    loadedValues,
    setLoadedValues,
}: {
    id: string;
    name: string;
    queries: ColumnQuery[];
    setQueries: (cb: (prev: ColumnQuery[]) => ColumnQuery[]) => void;
    queryColumns: (string[] | null)[];
    setQueryColumns: (cols: (string[] | null)[]) => void;
    loadedValues: LoadedValues;
    setLoadedValues: (vals: LoadedValues) => void;
}) {
    const [rowVisible, setRowVisible] = React.useState(true);

    const queriesKey = getQueriesKey(queries);
    React.useEffect(() => {
        const mounted = [true] as [boolean];

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

    const updateQueries = React.useCallback(() => {
        setQueries((prev) => [...prev]);
    }, [setQueries]);

    if (!rowVisible) {
        return null;
    }

    return (
        <tr className="border-t border-gray-300">
            <td className="relative">
                <div className="px-2">
                    {name}
                </div>
                <div 
                    className="absolute top-0 right-0 w-1 h-full bg-gray-200 hover:opacity-50 transition-all duration-150" 
                />
            </td>
            {
                loadedValues ? (
                    <RowLoadedValues
                        loadedValues={loadedValues}
                        queryColumns={queryColumns}
                        queries={queries}
                        updateQueries={updateQueries}
                    />
                ) : (
                    <td colSpan={queries.length}>
                        <LoadingEffect />
                    </td>
                )
            }
        </tr>
    );
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
                    <th className="pb-1 relative">
                        <div className="px-2">
                            Name
                        </div>
                        <div 
                            className="absolute top-0 right-0 w-1 h-full bg-gray-200 hover:opacity-50 transition-all duration-150" 
                        />
                    </th>
                    {
                        queries.map((q, i) => (
                            <TableHeader
                                key={i}
                                queryIdx={i}
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
                                loadedValuesPtr={loadedValuesRows}
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
                            setQueries={setQueries}
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
