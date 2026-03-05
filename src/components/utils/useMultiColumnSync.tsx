import React, { type JSX } from "react";
import type { ColumnDataType } from "../Table";
import { loadSingleRow } from "@/src/sqlEngine";
import checkFilters from "../filters/checkFilters";
import sortValue from "./sortValue";

export type ColumnsHeaderProps = {
    columns: string[] | null;
    // Hook that returns a comma-joined dominant-type string per column.
    // Only changes identity (triggering re-render) when the type mix changes.
    useColumnTypes: () => string;
    filters: Record<string, any>;
    query: string;
    queryIdx: number;
    columnSpecificDataTypes: Record<string, ColumnDataType>;
    updateQuery: (query: string, columnSpecificDataTypes: Record<string, ColumnDataType>) => void;
    initialSorting: [string, boolean] | null;
    onFilterChange: (columnName: string, filter: any) => void;
    onSortChange: (v: [string, boolean] | null) => void;
    isLlm: boolean;
    firstId: string;
};

export type CustomTdProps = {
    isLlm: boolean;
    children?: any;
    queryIdx: number;
    columnName: string | null;
};

type CellGroupProps = {
    modelId: string;
    updateContent: (modelId: string, newContent: any[] | string, newColumns: string[] | null) => void;
    query: string;
    queryIdx: number;
    columns: string[] | null;
    columnSpecificDataTypes: Record<string, ColumnDataType>;
    cellComponent: (props: CellProps) => JSX.Element;
    customTdComponent: ((props: CustomTdProps) => JSX.Element) | null;
    isLlm: boolean;
};

type CellProps = {
    value: any;
    columnSpecificDataType: ColumnDataType | undefined;
    isLlm: boolean;
};

function DefaultTd({ children }: { children?: any }) {
    return <td>{children}</td>;
}

function CellGroup({
    modelId,
    updateContent,
    query,
    queryIdx,
    columns,
    columnSpecificDataTypes,
    cellComponent: Cell,
    customTdComponent,
    isLlm,
}: CellGroupProps) {
    const [result, setResult] = React.useState<any[] | string | null>(null);
    const aliveRef = React.useRef(true);

    React.useEffect(() => {
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
        };
    }, []);

    React.useEffect(() => {
        const load = async () => {
            try {
                await loadSingleRow(query, modelId).then((row) => {
                    if (!row) {
                        if (aliveRef.current) {
                            setResult(null);
                            updateContent(modelId, [], []);
                        }
                        return;
                    }
                    const sortedColumns = Object.keys(row).sort();
                    if (aliveRef.current) {
                        setResult(sortedColumns.map((col) => row[col]));
                        updateContent(modelId, sortedColumns.map((col) => row[col]), sortedColumns);
                    }
                });
            } catch (e) {
                if (aliveRef.current) {
                    setResult(null);
                    updateContent(modelId, [], []);
                }
            }
        };
        load();
    }, [query, modelId]);

    const Td = customTdComponent ? customTdComponent : DefaultTd;

    if (typeof result === "string") {
        if (columns) {
            const cells = [
                <Td queryIdx={queryIdx} columnName={columns[0] || null} isLlm={isLlm}>
                    {result}
                </Td>
            ]
            for (let i = 0; i < columns.length - 1; i++) {
                cells.push(<Td queryIdx={queryIdx} columnName={columns[i + 1]} isLlm={isLlm}></Td>);
            }
            return cells;
        }
        return <Td queryIdx={queryIdx} columnName={null} isLlm={isLlm}>{result}</Td>;
    }

    if (!columns || !result) {
        return <Td queryIdx={queryIdx} columnName={null} isLlm={isLlm}></Td>
    }

    return columns.map((column, index) => (
        <Td queryIdx={queryIdx} columnName={column} isLlm={isLlm} key={column}>
            <Cell value={result[index]} columnSpecificDataType={columnSpecificDataTypes[column]} isLlm={isLlm} />
        </Td>
    ));
}

// Computes a comma-joined string of dominant types per column.
// Only changes when the actual type mix changes — used as a stable useSyncExternalStore snapshot.
function computeColumnTypeKey(content: Map<string, any[] | string>, columns: string[] | null): string {
    if (!columns || columns.length === 0) return "";
    return columns.map((_, colIdx) => {
        const typeSet = new Set<string>();
        for (const row of content.values()) {
            if (!Array.isArray(row)) continue;
            const val = row[colIdx];
            if (val !== null && val !== undefined) {
                typeSet.add(typeof val);
            }
        }
        if (typeSet.size === 0) return "";
        if (typeSet.size === 1) return typeSet.values().next().value!;
        return "mixed";
    }).join(",");
}

// Pure function — no hooks. Safe to call in a loop.
function createSqlSyncLayer(
    query: string,
    queryIdx: number,
    columns: string[] | null,
    columnSpecificDataTypes: Record<string, ColumnDataType>,
    filters: Record<string, any>,
    onQueryChange: (query: string, columnSpecificDataTypes: Record<string, ColumnDataType>) => void,
    orderForColumn: [string, boolean] | null,
    onSortChange: (v: [string, boolean] | null) => void,
    modelIds: string[],
    onFilterChange: (columnName: string, filter: any) => void,
    updateContent: (modelId: string, newContent: any[] | string, newColumns: string[] | null) => void,
    content: Map<string, any[] | string>,
    useColumnTypes: () => string,
    cellComponent: (props: CellProps) => any,
    ColumnsHeader: (props: ColumnsHeaderProps) => JSX.Element | JSX.Element[],
    customTdComponent: ((props: CustomTdProps) => JSX.Element) | null,
    isLlm: boolean,
    firstId: string,
) {
    // Sort model IDs based on loaded content.
    let modelIdsSorted: string[];
    if (columns === null || orderForColumn === null) {
        modelIdsSorted = modelIds;
    } else {
        const [sortCol, ascending] = orderForColumn;
        const colIdx = columns.indexOf(sortCol);
        if (colIdx === -1) {
            modelIdsSorted = modelIds;
        } else {
            modelIdsSorted = modelIds.slice().sort((a, b) => {
                const aValues = content.get(a);
                const bValues = content.get(b);
                if (aValues === undefined || typeof aValues === "string") return ascending ? 1 : -1;
                if (bValues === undefined || typeof bValues === "string") return ascending ? -1 : 1;
                return sortValue(
                    (aValues as any[])[colIdx],
                    (bValues as any[])[colIdx],
                    ascending,
                    columnSpecificDataTypes[sortCol],
                );
            });
        }
    }

    const columnsHeader = (
        <ColumnsHeader
            columns={columns}
            useColumnTypes={useColumnTypes}
            filters={filters}
            query={query}
            queryIdx={queryIdx}
            columnSpecificDataTypes={columnSpecificDataTypes}
            updateQuery={onQueryChange}
            initialSorting={orderForColumn}
            onFilterChange={onFilterChange}
            onSortChange={onSortChange}
            key={queryIdx}
            isLlm={isLlm}
            firstId={firstId}
        />
    );

    const cellGroups = new Map<string, JSX.Element>();
    for (const modelId of modelIdsSorted) {
        cellGroups.set(modelId, (
            <CellGroup
                modelId={modelId}
                updateContent={updateContent}
                query={query}
                columns={columns}
                columnSpecificDataTypes={columnSpecificDataTypes}
                cellComponent={cellComponent}
                queryIdx={queryIdx}
                customTdComponent={customTdComponent}
                isLlm={isLlm}
                key={`${queryIdx}-${modelId}`}
            />
        ));
    }

    return [columnsHeader, cellGroups] as const;
}

export function useMultiColumnSync(
    queries: {
        query: string;
        columnSpecificDataTypes: Record<string, ColumnDataType>;
        filters: Record<string, any>;
    }[],
    onQueryChange: (
        query: string,
        columnSpecificDataTypes: Record<string, ColumnDataType>,
        queryIdx: number,
    ) => void,
    onFilterChange: (
        columnName: string,
        filter: any,
        queryIdx: number,
    ) => void,
    modelIdsAndNames: { id: string; name: string }[],
    cellComponent: (props: CellProps) => any,
    columnsHeaderComponent: (props: ColumnsHeaderProps) => JSX.Element | JSX.Element[],
    customTdComponent: ((props: CustomTdProps) => JSX.Element) | null,
    nameFilter: string,
    NameComponent: (props: { name: string; modelId: string; isLlm: boolean }) => JSX.Element,
    isLlm: boolean,
    firstId: string,
) {
    const [modelIdsAndNamesSorted, setModelIdsAndNamesSorted] = React.useState<{ id: string; name: string }[]>(modelIdsAndNames);
    const hidden = React.useMemo(() => new Map<string, number>(), []);
    const [currentSorting, setCurrentSorting] = React.useState<[number, [string, boolean]] | null>(null);
    const [, setIncr] = React.useState(0);

    // Per-query columns — lifted out of createSqlSyncLayer so hook count is stable.
    const [columnsPerQuery, setColumnsPerQuery] = React.useState<(string[] | null)[]>(
        () => queries.map(() => null),
    );

    // Per-query content/hidden stored in refs — mutations don't need to trigger renders directly.
    const contentPerQuery = React.useRef<Map<string, any[] | string>[]>(
        queries.map(() => new Map()),
    );
    const hiddenPerQuery = React.useRef<Set<string>[]>(
        queries.map(() => new Set()),
    );

    // Per-query type-change subscription. Listeners are notified only when the dominant
    // value type per column changes — so ColumnsHeader only re-renders when it needs to
    // update its filter UI, not on every row load.
    // Pre-sized to match initial queries so initial slots are always populated.
    const typeListenersRef = React.useRef<Set<() => void>[]>(queries.map(() => new Set()));
    const typeSnapshotsRef = React.useRef<string[]>(queries.map(() => ""));
    // Stable hook factories — created once per slot, never recreated.
    // Starts empty; populated synchronously on first render for all slots.
    const typeHookFactoriesRef = React.useRef<Array<() => string>>([]);

    // Detect query text/slot changes and reset stale content. Runs synchronously during render
    // (writing to refs during render is safe in React).
    const prevQueryStringsRef = React.useRef(queries.map((q) => q.query));
    for (let idx = 0; idx < queries.length; idx++) {
        // Create hook factory if missing (first render for all slots, or a new query added).
        if (typeHookFactoriesRef.current[idx] === undefined) {
            if (typeListenersRef.current[idx] === undefined) {
                typeListenersRef.current[idx] = new Set();
                typeSnapshotsRef.current[idx] = "";
            }
            const capturedIdx = idx;
            typeHookFactoriesRef.current[capturedIdx] = () => React.useSyncExternalStore(
                (ln) => {
                    typeListenersRef.current[capturedIdx].add(ln);
                    // Use ?. so that unsubscribing after the slot was trimmed doesn't crash.
                    return () => typeListenersRef.current[capturedIdx]?.delete(ln);
                },
                () => typeSnapshotsRef.current[capturedIdx],
                () => "",
            );
        }

        if (contentPerQuery.current[idx] === undefined) {
            contentPerQuery.current[idx] = new Map();
            hiddenPerQuery.current[idx] = new Set();
        } else if (prevQueryStringsRef.current[idx] !== queries[idx].query) {
            // Query text changed (or index shifted after deletion) — clear stale content.
            // Don't notify listeners here: calling setState on ColumnsHeader while Table
            // is rendering causes a React warning. The header will pick up updated types
            // naturally once new row data arrives.
            contentPerQuery.current[idx] = new Map();
            hiddenPerQuery.current[idx] = new Set();
            typeSnapshotsRef.current[idx] = "";
        }
    }
    // Only trim content/hidden (per-query data). Leave listener/factory arrays untrimmed
    // so that unmounting ColumnsHeader components can still safely unsubscribe.
    contentPerQuery.current.length = queries.length;
    hiddenPerQuery.current.length = queries.length;
    prevQueryStringsRef.current = queries.map((q) => q.query);

    const modelIdsMapping = React.useMemo(() => {
        return new Map(modelIdsAndNamesSorted.map(({ id, name }) => [id, name]));
    }, [modelIdsAndNamesSorted]);

    const modelIds = React.useMemo(() => {
        return modelIdsAndNamesSorted.map(({ id }) => id);
    }, [modelIdsAndNamesSorted]);

    const setModelIds = React.useCallback((newModelIds: string[]) => {
        setModelIdsAndNamesSorted(newModelIds.map((id) => ({
            id,
            name: modelIdsMapping.get(id)!,
        })));
    }, [modelIdsMapping]);

    // Keep effectiveColumnsPerQuery length in sync with queries.
    const effectiveColumnsPerQuery = React.useMemo(() => {
        if (columnsPerQuery.length === queries.length) return columnsPerQuery;
        return queries.map((_, i) => columnsPerQuery[i] ?? null);
    }, [columnsPerQuery, queries.length]);

    // Stable refs for use inside effects without stale closures.
    const effectiveColumnsPerQueryRef = React.useRef(effectiveColumnsPerQuery);
    effectiveColumnsPerQueryRef.current = effectiveColumnsPerQuery;
    const queriesRef = React.useRef(queries);
    queriesRef.current = queries;
    // Keep track of the original unsorted order so we can restore it on sort clear.
    const originalOrderRef = React.useRef(modelIdsAndNames);
    originalOrderRef.current = modelIdsAndNames;

    // Re-sort (or restore) the row order whenever the active sort changes.
    React.useEffect(() => {
        if (currentSorting === null) {
            setModelIdsAndNamesSorted([...originalOrderRef.current]);
            return;
        }
        const [sortQueryIdx, [sortCol, ascending]] = currentSorting;
        const cols = effectiveColumnsPerQueryRef.current[sortQueryIdx];
        if (!cols) return;
        const colIdx = cols.indexOf(sortCol);
        if (colIdx === -1) return;
        const dataType = queriesRef.current[sortQueryIdx]?.columnSpecificDataTypes[sortCol];
        setModelIdsAndNamesSorted((prev) =>
            [...prev].sort((a, b) => {
                const aValues = contentPerQuery.current[sortQueryIdx]?.get(a.id);
                const bValues = contentPerQuery.current[sortQueryIdx]?.get(b.id);
                if (!Array.isArray(aValues)) return ascending ? 1 : -1;
                if (!Array.isArray(bValues)) return ascending ? -1 : 1;
                return sortValue(aValues[colIdx], bValues[colIdx], ascending, dataType);
            }),
        );
    }, [currentSorting]);

    // Recompute row visibility whenever filters change.
    const filtersKey = queries.map((q) => JSON.stringify(q.filters)).join("||");
    React.useEffect(() => {
        queries.forEach((query, idx) => {
            const cols = effectiveColumnsPerQueryRef.current[idx];
            if (!cols) return;
            const hiddenSet = hiddenPerQuery.current[idx];
            const content = contentPerQuery.current[idx];
            for (const [modelId, rowContent] of content.entries()) {
                if (!Array.isArray(rowContent)) continue;
                const row: Record<string, any> = {};
                cols.forEach((col, i) => { row[col] = (rowContent as any[])[i]; });
                const wasHidden = hiddenSet.has(modelId);
                const isHidden = !checkFilters(row, query.filters, query.columnSpecificDataTypes);
                if (wasHidden !== isHidden) {
                    if (isHidden) hiddenSet.add(modelId);
                    else hiddenSet.delete(modelId);
                    const count = hidden.get(modelId) ?? 0;
                    const next = isHidden ? count + 1 : count - 1;
                    if (next <= 0) hidden.delete(modelId);
                    else hidden.set(modelId, next);
                }
            }
        });
        setIncr((i) => i + 1);
    }, [filtersKey]);

    const queryComponents = queries.map((query, idx) => {
        const onSpecificQueryChange = (newQuery: string, newColumnSpecificDataTypes: Record<string, ColumnDataType>) => {
            onQueryChange(newQuery, newColumnSpecificDataTypes, idx);
        };

        const setSorting = (newSorting: [string, boolean] | null) => {
            setCurrentSorting(newSorting === null ? null : [idx, newSorting]);
        };

        const setFilter = (columnName: string, filter: any) => {
            onFilterChange(columnName, filter, idx);
        };

        const setHidden = (modelId: string, show: boolean) => {
            const hiddenCount = hidden.get(modelId) ?? 0;
            const newCount = show ? hiddenCount - 1 : hiddenCount + 1;
            if (newCount <= 0) hidden.delete(modelId);
            else hidden.set(modelId, newCount);
            setIncr((i) => i + 1);
        };

        const updateContent = (modelId: string, newContent: any[] | string, newColumns: string[] | null) => {
            contentPerQuery.current[idx].set(modelId, newContent);

            if (newColumns !== null) {
                const currentColumns = effectiveColumnsPerQuery[idx];
                if (currentColumns === null || (
                    newColumns.length >= currentColumns.length &&
                    JSON.stringify(newColumns) !== JSON.stringify(currentColumns)
                )) {
                    setColumnsPerQuery((prev) => {
                        const next = prev.length === queries.length
                            ? [...prev]
                            : queries.map((_, i) => prev[i] ?? null);
                        next[idx] = newColumns;
                        return next;
                    });
                }

                // Recompute sort order if this query owns the current sort.
                if (currentSorting?.[0] === idx) {
                    const [sortCol, ascending] = currentSorting[1];
                    const colIdx = (effectiveColumnsPerQuery[idx] ?? newColumns).indexOf(sortCol);
                    if (colIdx !== -1) {
                        const sortedIds = modelIds.slice().sort((a, b) => {
                            const aValues = contentPerQuery.current[idx].get(a);
                            const bValues = contentPerQuery.current[idx].get(b);
                            if (aValues === undefined || typeof aValues === "string") return ascending ? 1 : -1;
                            if (bValues === undefined || typeof bValues === "string") return ascending ? -1 : 1;
                            return sortValue(
                                (aValues as any[])[colIdx],
                                (bValues as any[])[colIdx],
                                ascending,
                                query.columnSpecificDataTypes[sortCol],
                            );
                        });
                        setModelIds(sortedIds);
                    }
                }

                // Update per-query visibility using real checkFilters.
                if (Array.isArray(newContent)) {
                    const row: Record<string, any> = {};
                    newColumns.forEach((col, i) => { row[col] = (newContent as any[])[i]; });
                    const hiddenSet = hiddenPerQuery.current[idx];
                    const wasHidden = hiddenSet.has(modelId);
                    const isHidden = !checkFilters(row, query.filters, query.columnSpecificDataTypes);
                    if (wasHidden !== isHidden) {
                        if (isHidden) hiddenSet.add(modelId);
                        else hiddenSet.delete(modelId);
                        setHidden(modelId, !isHidden);
                    }
                }

                // Notify type listeners only when the dominant type per column changes.
                const newTypeKey = computeColumnTypeKey(contentPerQuery.current[idx], newColumns);
                if (newTypeKey !== typeSnapshotsRef.current[idx]) {
                    typeSnapshotsRef.current[idx] = newTypeKey;
                    typeListenersRef.current[idx]?.forEach((ln) => ln());
                }
            }

            setIncr((i) => i + 1);
        };

        return createSqlSyncLayer(
            query.query,
            idx,
            effectiveColumnsPerQuery[idx],
            query.columnSpecificDataTypes,
            query.filters,
            onSpecificQueryChange,
            currentSorting?.[0] === idx ? currentSorting[1] : null,
            setSorting,
            modelIds,
            setFilter,
            updateContent,
            contentPerQuery.current[idx],
            typeHookFactoriesRef.current[idx] ?? (() => ""),
            cellComponent,
            columnsHeaderComponent,
            customTdComponent,
            isLlm,
            firstId,
        );
    });

    // Combine everything nicely.
    const headersWithoutName = queryComponents.map((q) => q[0]);
    const tableRows: JSX.Element[] = [];
    for (const modelId of modelIds) {
        let display = hidden.has(modelId) ? "none" : undefined;
        const name = modelIdsMapping.get(modelId)!;
        if (nameFilter !== "" && !name.toLowerCase().includes(nameFilter.toLowerCase())) {
            display = "none";
        }
        const subCellGroups = queryComponents.map((q) => {
            const cellGroup = q[1].get(modelId);
            if (cellGroup === undefined) {
                return <td></td>;
            }
            return cellGroup;
        });
        tableRows.push(
            <tr style={{ display }} className="border-t border-gray-300 dark:border-gray-600" key={modelId}>
                <NameComponent name={name} modelId={modelId} isLlm={isLlm} />
                {subCellGroups}
            </tr>
        );
    }
    return [headersWithoutName, tableRows] as const;
}
