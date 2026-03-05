import React, { type JSX } from "react";
import type { ColumnDataType } from "../Table";
import { loadSingleRow } from "@/src/sqlEngine";

export type ColumnsHeaderProps = {
    columns: string[] | null;
    query: string;
    queryIdx: number;
    columnSpecificDataTypes: Record<string, ColumnDataType>;
    updateQuery: (query: string, columnSpecificDataTypes: Record<string, ColumnDataType>) => void;
    initialFilter: [string, boolean] | null;
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

function checkFilters(
    _value: any,
    _filter: any,
): boolean {
    // TODO
    return true;
}

function sortColumns(
    _aValues: any[],
    _bValues: any[],
    _currentSorting: [string, boolean] | null,
): number {
    // TODO
    return 0;
}

// Pure function — no hooks. Safe to call in a loop.
function createSqlSyncLayer(
    query: string,
    queryIdx: number,
    columns: string[] | null,
    columnSpecificDataTypes: Record<string, ColumnDataType>,
    onQueryChange: (query: string, columnSpecificDataTypes: Record<string, ColumnDataType>) => void,
    orderForColumn: [string, boolean] | null,
    onSortChange: (v: [string, boolean] | null) => void,
    modelIds: string[],
    onFilterChange: (columnName: string, filter: any) => void,
    updateContent: (modelId: string, newContent: any[] | string, newColumns: string[] | null) => void,
    content: Map<string, any[] | string>,
    cellComponent: (props: CellProps) => any,
    ColumnsHeader: (props: ColumnsHeaderProps) => JSX.Element | JSX.Element[],
    customTdComponent: ((props: CustomTdProps) => JSX.Element) | null,
    isLlm: boolean,
    firstId: string,
) {
    // Sort model IDs based on loaded content.
    let modelIdsSorted: string[];
    if (columns === null) {
        modelIdsSorted = modelIds;
    } else {
        modelIdsSorted = modelIds.slice().sort((a, b) => {
            const aValues = content.get(a);
            const bValues = content.get(b);
            if (aValues === undefined) return -1;
            if (bValues === undefined) return 1;
            if (typeof aValues === "string") {
                if (typeof bValues === "string") return aValues.localeCompare(bValues);
                return -1;
            }
            if (typeof bValues === "string") return 1;
            return sortColumns(aValues as any[], bValues as any[], orderForColumn);
        });
    }

    const columnsHeader = (
        <ColumnsHeader
            columns={columns}
            query={query}
            queryIdx={queryIdx}
            columnSpecificDataTypes={columnSpecificDataTypes}
            updateQuery={onQueryChange}
            initialFilter={orderForColumn}
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

    // Detect query text changes and reset stale content. Done synchronously during render
    // (writing to refs during render is safe in React).
    const prevQueryStringsRef = React.useRef(queries.map((q) => q.query));
    for (let idx = 0; idx < queries.length; idx++) {
        if (contentPerQuery.current[idx] === undefined) {
            contentPerQuery.current[idx] = new Map();
            hiddenPerQuery.current[idx] = new Set();
        } else if (prevQueryStringsRef.current[idx] !== queries[idx].query) {
            contentPerQuery.current[idx] = new Map();
            hiddenPerQuery.current[idx] = new Set();
        }
    }
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
            const hiddenCount = hidden.get(modelId) || 0;
            if (show) {
                hidden.set(modelId, hiddenCount - 1);
            } else {
                hidden.set(modelId, hiddenCount + 1);
            }
            if (hiddenCount === 0) {
                hidden.delete(modelId);
            }
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
                    const sortedIds = modelIds.slice().sort((a, b) => {
                        const aValues = contentPerQuery.current[idx].get(a);
                        const bValues = contentPerQuery.current[idx].get(b);
                        if (aValues === undefined) return -1;
                        if (bValues === undefined) return 1;
                        if (typeof aValues === "string") {
                            if (typeof bValues === "string") return aValues.localeCompare(bValues);
                            return -1;
                        }
                        if (typeof bValues === "string") return 1;
                        return sortColumns(aValues as any[], bValues as any[], currentSorting[1]);
                    });
                    setModelIds(sortedIds);
                }

                // Update per-query visibility.
                const hiddenSet = hiddenPerQuery.current[idx];
                const wasHidden = hiddenSet.has(modelId);
                const isHidden = !checkFilters(newContent, query.filters);
                if (wasHidden !== isHidden) {
                    if (isHidden) hiddenSet.add(modelId);
                    else hiddenSet.delete(modelId);
                    setHidden(modelId, !isHidden);
                }
            }

            setIncr((i) => i + 1);
        };

        return createSqlSyncLayer(
            query.query,
            idx,
            effectiveColumnsPerQuery[idx],
            query.columnSpecificDataTypes,
            onSpecificQueryChange,
            currentSorting?.[0] === idx ? currentSorting[1] : null,
            setSorting,
            modelIds,
            setFilter,
            updateContent,
            contentPerQuery.current[idx],
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
