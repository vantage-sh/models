import React from "react";
import { loadSingleRow } from "../sqlEngine";
import BooleanFilter from "./filters/BooleanFilter";
import StringFilter from "./filters/StringFilter";
import { NumberFilter } from "./filters/NumberFilter";
import RowLoadedValues, { DEFAULT_COLUMN_WIDTH } from "./RowLoadedValues";
import sortValue from "./utils/sortValue";
import SortingButtons from "./SortingButtons";
import checkFilters from "./filters/checkFilters";
import Column from "./Column";
import AddButton from "./AddButton";
import SQLEditorButton from "./SQLEditorButton";
import type { VendorInfo } from "../dataFormat";
import { useStateItem } from "../state";
import Link from "./Link";
import PortalRoot from "./PortalRoot";
import ReactDOM from "react-dom";

export type ColumnDataType = "boolean" | "currency" | "country";

export type ColumnQuery = {
    query: string;
    columnExplicitlySetDataTypes: Record<string, ColumnDataType>;
    columnFilters: Record<string, any>;
    widths?: Record<string, number>;
};

function QueryFilter({
    columnName,
    query,
    updateQuery,
    values,
}: {
    columnName: string;
    query: ColumnQuery;
    updateQuery: (rerunQuery: boolean) => void;
    values: any[];
}) {
    const specificType = query.columnExplicitlySetDataTypes[columnName];

    if (specificType === "boolean") {
        return <BooleanFilter columnName={columnName} query={query} updateQuery={updateQuery} />;
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
                <BooleanFilter columnName={columnName} query={query} updateQuery={updateQuery} />
            );
        case "string":
            return <StringFilter columnName={columnName} query={query} updateQuery={updateQuery} />;
        case "number":
            return <NumberFilter columnName={columnName} query={query} updateQuery={updateQuery} />;
    }

    return null;
}

export type LoadedValues = (any[] | null | { error: string })[] | null;

function TableHeader({
    query,
    queryIdx,
    updateQuery,
    deleteQuery,
    queryColumns,
    loadedValuesPtr,
    firstId,
}: {
    query: ColumnQuery;
    queryIdx: number;
    updateQuery: (rerunQuery: boolean) => void;
    deleteQuery: () => void;
    queryColumns: string[] | null;
    loadedValuesPtr: [Map<string, LoadedValues>];
    firstId: string;
}) {
    const [currentSorting, setCurrentSorting] = useStateItem("currentSorting");

    const setSorting = React.useCallback(
        (columnName: string, cb: (value: boolean | null) => boolean | null) => {
            setCurrentSorting((old) => {
                if (old?.[0] === queryIdx) {
                    const newSorting = cb(old[2]);
                    if (newSorting === null) {
                        return null;
                    }
                    return [old[0], old[1], newSorting] as [number, string, boolean];
                }
                return [queryIdx, columnName, cb(null)] as [number, string, boolean];
            });
        },
        [queryColumns, queryIdx]
    );

    if (queryColumns === null) {
        return (
            <th className="pb-1">
                <div className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:opacity-50 transition-all duration-150" />
            </th>
        );
    }

    const values = React.useMemo(() => {
        return Array.from(loadedValuesPtr[0].values())
            .map((lv) => {
                if (lv === null) {
                    return undefined;
                }
                return lv;
            })
            .filter((v) => v !== undefined);
    }, [loadedValuesPtr]);

    return queryColumns.map((col, idx) => (
        <Column
            columnType="th"
            initialWidth={query.widths?.[col] || DEFAULT_COLUMN_WIDTH}
            key={col}
            className="pb-1"
            updateWidth={(width) => {
                if (!query.widths) {
                    query.widths = {
                        [col]: width,
                    };
                    updateQuery(false);
                    return;
                }
                query.widths[col] = width;
                updateQuery(false);
            }}
        >
            <div className="flex items-center mb-1 grow">
                <div className="block grow">
                    <div className="line-clamp-2" title={col}>
                        {col}
                    </div>
                </div>
                <SortingButtons
                    ascending={currentSorting?.[0] === queryIdx ? currentSorting[2] : null}
                    setSorting={setSorting}
                    columnName={col}
                />
                {idx === queryColumns.length - 1 && (
                    <>
                        <button
                            className="ml-2 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 rounded transition block"
                            title="Delete column"
                            onClick={deleteQuery}
                        >
                            &#x2715;
                        </button>
                        <SQLEditorButton
                            query={query}
                            updateQuery={updateQuery}
                            firstId={firstId}
                        />
                    </>
                )}
            </div>
            <div className="w-full mt-auto">
                <QueryFilter
                    columnName={col}
                    query={query}
                    updateQuery={updateQuery}
                    values={values
                        .map((lv) => {
                            if (lv === null) {
                                return undefined;
                            }
                            const queryFromIdx = lv[queryIdx];
                            if (!Array.isArray(queryFromIdx)) {
                                return undefined;
                            }
                            return queryFromIdx[idx];
                        })
                        .filter((v) => v !== undefined)}
                />
            </div>
        </Column>
    ));
}

async function loadSingleRowData(
    id: string,
    queries: ColumnQuery[],
    queryColumns: (string[] | null)[],
    setQueryColumns: (cols: (string[] | null)[]) => void,
    setLoadedValues: (vals: (any[] | null | { error: string })[] | null) => void,
    setRowVisible: (visible: boolean) => void,
    mountedRef: [boolean]
) {
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
                    const old = queryColumns[index];
                    if (JSON.stringify(old) !== JSON.stringify(sortedColumns)) {
                        queryColumns[index] = sortedColumns;
                        setQueryColumns([...queryColumns]);
                    }
                    loadedColumns[index] = sortedColumns.map((col) => row[col]);

                    // Check filters
                    if (
                        !checkFilters(row, query.columnFilters, query.columnExplicitlySetDataTypes)
                    ) {
                        noFiltersNegative = false;
                    }
                } else if (queryColumns[index] === null) {
                    if (!queryColumns[index]) {
                        queryColumns[index] = [];
                        setQueryColumns([...queryColumns]);
                    }
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
    if (mountedRef[0]) setRowVisible(noFiltersNegative);

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
        key = queries
            .map(
                (q) =>
                    q.query +
                    JSON.stringify(q.columnFilters) +
                    JSON.stringify(q.columnExplicitlySetDataTypes)
            )
            .join("||");
        cachedQueriesKey.set(queries, key);
    }
    return key;
}

function TableRow({
    id,
    name,
    queryColumns,
    setQueryColumns,
    loadedValues,
    setLoadedValues,
    queries,
    modelType,
}: {
    id: string;
    name: string;
    queryColumns: (string[] | null)[];
    setQueryColumns: (cols: (string[] | null)[]) => void;
    loadedValues: LoadedValues | null;
    setLoadedValues: (vals: LoadedValues | null) => void;
    queries: ColumnQuery[];
    modelType: "llm" | "image";
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
            mounted
        );

        return () => {
            mounted[0] = false;
        };
    }, [id, queriesKey, modelType]);

    if (!rowVisible) {
        return null;
    }

    const modelPath = modelType === "llm" ? "models" : "image-models";
    return (
        <tr className="border-t border-gray-300 dark:border-gray-600">
            <td className="relative">
                <div className="px-2">
                    <Link href={`/${modelPath}/${id}`}>{name}</Link>
                </div>
                <div className="absolute top-0 right-0 w-1 h-full bg-gray-200 dark:bg-gray-700 hover:opacity-50 transition-all duration-150" />
            </td>
            {loadedValues ? (
                <RowLoadedValues
                    loadedValues={loadedValues}
                    queryColumns={queryColumns}
                    modelType={modelType}
                />
            ) : (
                new Array({ length: queries.length }).map((_, i) => (
                    <td key={i}>
                        <div className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:opacity-50 transition-all duration-150" />
                    </td>
                ))
            )}
        </tr>
    );
}

function sortIdsAndNames(
    idsAndNames: { id: string; name: string }[],
    queries: ColumnQuery[],
    queryColumns: (string[] | null)[],
    loadedValuesMap: Map<string, LoadedValues>,
    currentSorting: [number, string, boolean] | null
) {
    // Get the query we are sorting by
    const queryIdx = currentSorting?.[0];
    if (queryIdx === undefined) {
        // Just return as is - no sorting
        return idsAndNames;
    }

    // Get the query column index of the column we are sorting by (we can use ! because we know it is defined due to the if above)
    const queryColumnIdx = queryColumns[queryIdx]?.indexOf(currentSorting![1]);
    if (queryColumnIdx === undefined) {
        // Just return as is - not loaded yet
        return idsAndNames;
    }

    // Get if its ascending or descending
    const ascending = currentSorting![2];

    return idsAndNames.slice().sort((a, b) => {
        const aValues = loadedValuesMap.get(a.id);
        const bValues = loadedValuesMap.get(b.id);
        const aQueryValues = aValues?.[queryIdx];
        const bQueryValues = bValues?.[queryIdx];
        if (!Array.isArray(aQueryValues)) {
            // Not loaded yet - put to bottom
            return ascending ? 1 : -1;
        }
        if (!Array.isArray(bQueryValues)) {
            // Not loaded yet - put to bottom
            return ascending ? -1 : 1;
        }

        // Get the values to sort by
        const aVal = aQueryValues[queryColumnIdx];
        const bVal = bQueryValues[queryColumnIdx];
        return sortValue(
            aVal,
            bVal,
            ascending,
            queries[queryIdx].columnExplicitlySetDataTypes[currentSorting![1]]
        );
    });
}

function NameFilter({
    nameFilter,
    setNameFilter,
}: {
    nameFilter: string;
    setNameFilter: (nameFilter: string) => void;
}) {
    return (
        <div className="px-2 flex flex-col h-full">
            <div className="grow">Name</div>
            <input
                type="text"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="w-full border text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md p-1 mt-auto"
            />
        </div>
    );
}

export default function Table({
    models,
    vendors,
    modelType,
}: {
    models: { id: string; name: string }[];
    vendors: Record<string, VendorInfo>;
    modelType: "llm" | "image";
}) {
    const [queries, setQueries] = useStateItem("queries");

    // Select appropriate data based on modelType prop
    const [nameFilter, setNameFilter] = useStateItem("nameFilter");
    const [queryColumns, setQueryColumns] = React.useState<(string[] | null)[]>(
        Array(queries.length).fill(null)
    );
    const [loadedValuesRows, setLoadedValuesRows] = React.useState<[Map<string, LoadedValues>]>(
        () => [new Map(models.map(({ id }) => [id, null]))]
    );
    const [currentSorting, setCurrentSorting] = useStateItem("currentSorting");

    // Reset state when modelType changes
    React.useEffect(() => {
        setQueryColumns(Array(queries.length).fill(null));
        setLoadedValuesRows([new Map(models.map(({ id }) => [id, null]))]);
    }, [modelType]);
    const sortedIdsAndNames = React.useMemo(() => {
        const v = sortIdsAndNames(
            models,
            queries,
            queryColumns,
            loadedValuesRows[0],
            currentSorting
        );
        if (nameFilter === "") {
            return v;
        }
        return v.filter(({ name }) => name.toLowerCase().includes(nameFilter.toLowerCase()));
    }, [models, nameFilter, queries, queryColumns, loadedValuesRows, currentSorting]);

    const portalRoot = ReactDOM.createPortal(
        <PortalRoot />,
        document.getElementById("portal-root")!
    );

    return (
        <>
            {portalRoot}
            <div className="flex-1 overflow-x-auto h-full">
                <div className="flex items-start min-w-max">
                    <table className="h-full">
                        <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10 shadow-[0_2px_0_0_rgb(209,213,219)] dark:shadow-[0_2px_0_0_rgb(75,85,99)]">
                            <tr>
                                <th className="pb-1 relative bg-white dark:bg-gray-900 align-bottom">
                                    <NameFilter
                                        nameFilter={nameFilter}
                                        setNameFilter={setNameFilter}
                                    />
                                    <div className="absolute top-0 right-0 w-1 h-full bg-gray-200 dark:bg-gray-700 hover:opacity-50 transition-all duration-150" />
                                </th>
                                {queries.map((q, i) => (
                                    <TableHeader
                                        key={i}
                                        queryIdx={i}
                                        query={q}
                                        updateQuery={(rerunQuery: boolean) => {
                                            const newQueries = [...queries];
                                            newQueries[i] = q;
                                            setQueries(newQueries);
                                            if (rerunQuery) {
                                                setCurrentSorting((old) => {
                                                    if (old?.[0] === i) {
                                                        return null;
                                                    }
                                                    return [i, q.query, true];
                                                });
                                                setQueryColumns((x) => {
                                                    const newQueryColumns = [...x];
                                                    newQueryColumns[i] = null;
                                                    return newQueryColumns;
                                                });
                                            }
                                        }}
                                        deleteQuery={() => {
                                            // Handle the map
                                            loadedValuesRows[0].forEach((v) => {
                                                v?.splice(i, 1);
                                            });
                                            setLoadedValuesRows([...loadedValuesRows]);

                                            // Handle deletion of a query from that array
                                            const newQueries = queries.filter(
                                                (_, idx) => idx !== i
                                            );
                                            setQueries(newQueries);
                                            setQueryColumns((x) => x.filter((_, idx) => idx !== i));
                                        }}
                                        queryColumns={queryColumns[i] || []}
                                        loadedValuesPtr={loadedValuesRows}
                                        firstId={models[0]?.id || ""}
                                    />
                                ))}
                            </tr>
                        </thead>
                        <tbody className="h-full overflow-y-scroll">
                            {sortedIdsAndNames.map(({ id, name }) => (
                                <TableRow
                                    id={id}
                                    key={`${modelType}-${id}`}
                                    name={name}
                                    queryColumns={queryColumns}
                                    setQueryColumns={setQueryColumns}
                                    loadedValues={loadedValuesRows[0].get(id) || null}
                                    setLoadedValues={(vals) => {
                                        setLoadedValuesRows((prev) => {
                                            prev[0].set(id, vals);
                                            return [prev[0]];
                                        });
                                    }}
                                    queries={queries}
                                    modelType={modelType}
                                />
                            ))}
                        </tbody>
                    </table>
                    <div className="ml-4 shrink-0 sticky top-0 self-start">
                        <AddButton
                            loadedValuesRows={loadedValuesRows[0]}
                            firstId={models[0]?.id || ""}
                            vendors={vendors}
                            modelType={modelType}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
