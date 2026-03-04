import React, { type JSX } from "react";
import type { ColumnDataType } from "./Table";

type ColunnsHeaderProps = {
    useColumns: () => string[] | null;
    query: string;
    columnSpecificDataTypes: Record<string, ColumnDataType>;
    updateQuery: (query: string, columnSpecificDataTypes: Record<string, ColumnDataType>) => void;
    initialFilter: [string, boolean] | null;  
    onFilterChange: (columnName: string, filter: any) => void;
    onSortChange: (v: [string, boolean] | null) => void;
};

function ColumnsHeader({
    useColumns,
    query,
    columnSpecificDataTypes,
    updateQuery,
    initialFilter,
    onFilterChange,
    onSortChange,
}: ColunnsHeaderProps) {
    const columns = useColumns();
    return null;
}

type CellGroupProps = {
    modelId: string;
    updateContent: (modelId: string, newContent: any[] | string, newColumns: string[] | null) => void;
    query: string;
    useColumns: () => string[] | null;
    columnSpecificDataTypes: Record<string, ColumnDataType>;
    cellComponent: (props: CellProps) => JSX.Element;
};

type CellProps = {
    value: any;
    columnSpecificDataType: ColumnDataType;
};

function CellGroup({
    modelId,
    updateContent,
    query,
    useColumns,
    columnSpecificDataTypes,
    cellComponent: Cell,
}: CellGroupProps) {
    const columns = useColumns();
    const [result, setResult] = React.useState<any[] | string | null>(null);

    React.useEffect(() => {
        // TODO: run the query
        const result: any[] | string = [];
        const newColumns: string[] = [];
        updateContent(modelId, result, newColumns);
        setResult(result);
    }, [query, modelId, updateContent]);

    if (typeof result === "string") {
        if (columns) {
            // Make N-1 blank cells.
            const cells = [
                <td>
                    {result}
                </td>
            ]
            for (let i = 0; i < columns.length - 1; i++) {
                cells.push(<td></td>);
            }
            return cells;
        }
        return <td>{result}</td>;
    }

    if (!columns || !result) {
        return <td></td>
    }

    return columns.map((column, index) => (
        <td key={column}>
            <Cell value={result[index]} columnSpecificDataType={columnSpecificDataTypes[column]} />
        </td>
    ));
}

function checkFilters(
    value: any,
    filter: any,
): boolean {
    // TODO
    return true;
}

function sortColumns(
    aValues: any[],
    bValues: any[],
    currentSorting: [string, boolean] | null,
): number {
    // TODO
    return 0;
}

function createSqlSyncLayer(
    query: string,
    columnSpecificDataTypes: Record<string, ColumnDataType>,
    onQueryChange: (query: string, columnSpecificDataTypes: Record<string, ColumnDataType>) => void,
    orderForColumn: [string, boolean] | null,
    onOrderRecomputed: (modelIds: string[]) => void,
    onSortChange: (v: [string, boolean] | null) => void,
    modelIds: string[],
    filtersPerColumn: Record<string, any>,
    onFilterChange: (columnName: string, filter: any) => void,
    onModelIdShowOrHide: (modelId: string, show: boolean) => void,
    cellComponent: (props: CellProps) => JSX.Element,
) {
    // Handle the columns. These are non-existent initially, but we have a sync layer to handle this.
    // These also must change if the query is changed.
    const columns = React.useMemo(
        () => {
            let columns: string[] | null = null;
            const columnEvents = new Set<() => void>();
            return {
                nonReactRef: () => columns,
                use: () => React.useSyncExternalStore(
                    (ln) => {
                        columnEvents.add(ln);
                        return () => {
                            columnEvents.delete(ln);
                        };
                    },
                    () => columns,
                    () => null,
                ),
                set: (newColumns: string[]) => {
                    columns = newColumns;
                    columnEvents.forEach((ln) => ln());
                },
            };
        },
        [query],
    );

    // Forces a re-render of the components when incremented.
    const [, setIncr] = React.useState(0);

    // Handle if the query is changed.
    const updateQuery = React.useCallback((newQuery: string, newColumnSpecificDataTypes: Record<string, ColumnDataType>) => {
        setIncr((i) => i + 1);
        onQueryChange(newQuery, newColumnSpecificDataTypes);
    }, [onQueryChange]);

    // Create somewhere for the content to be that only changes when the query changes.
    const content = React.useMemo(() => new Map<string, any[] | string>(), [query]);
    const computeIfValueIsHidden = React.useCallback(
        (modelId: string) => {
            const c = content.get(modelId);
            if (c === undefined) {
                return false;
            }
            const cols = columns.nonReactRef();
            if (cols === null) {
                return false;
            }
            for (const col of cols) {
                const filter = filtersPerColumn[col];
                if (filter === undefined) {
                    continue;
                }
                if (!checkFilters(c, filter)) {
                    return true;
                }
            }
            return false;
        },
        [columns, content, filtersPerColumn],
    );
    const hidden = React.useMemo(() => new Set<string>(), [query]);
    const updateContent = React.useCallback(
        (
            modelId: string,
            newContent: any[] | string,
            newColumns: string[] | null,
        ) => {
            // Write the content to the map.
            content.set(modelId, newContent);

            if (newColumns === null) {
                // We don't hide failed loads.
                const was = hidden.delete(modelId);
                if (was) {
                    onModelIdShowOrHide(modelId, true);
                }
            } else {
                // If the columns are present, we can do most other things.
                const currentColumns = columns.nonReactRef();
                if (currentColumns === null || (
                    newColumns.length >= currentColumns.length &&
                    JSON.stringify(newColumns) !== JSON.stringify(currentColumns)
                )) {
                    // We update the columns if they are different and this is longer.
                    columns.set(newColumns);
                }

                // Compute if the value is hidden and if this needs dispatching.
                const currentHiddenState = hidden.has(modelId);
                const newHiddenState = computeIfValueIsHidden(modelId);
                if (currentHiddenState !== newHiddenState) {
                    // We need to dispatch the change and re-render.
                    if (newHiddenState) {
                        hidden.add(modelId);
                    } else {
                        hidden.delete(modelId);
                    }
                    onModelIdShowOrHide(modelId, !newHiddenState);
                }
            }

            // Always re-render.
            setIncr((i) => i + 1);
        },
        [content, columns, computeIfValueIsHidden, hidden, onModelIdShowOrHide],
    );

    // Handle sorting.
    const lastSortRef = React.useRef<string[] | null>(null);
    const currentSortingRef = React.useRef(orderForColumn);
    React.useEffect(() => {
        if (JSON.stringify(currentSortingRef.current) !== JSON.stringify(orderForColumn)) {
            currentSortingRef.current = orderForColumn;
            setIncr((i) => i + 1);
        }
    }, [orderForColumn]);
    const setSorting = React.useCallback((newOrderForColumn: [string, boolean] | null) => {
        currentSortingRef.current = newOrderForColumn;
        onSortChange(newOrderForColumn);
        setIncr((i) => i + 1);
    }, [currentSortingRef, onSortChange]);
    const nonReactColumnsUse = columns.nonReactRef();
    let modelIdsSorted: string[];
    if (nonReactColumnsUse === null) {
        modelIdsSorted = modelIds;
        lastSortRef.current = modelIds.slice();
    } else {
        modelIdsSorted = modelIds.slice().sort((a, b) => {
            const aValues = content.get(a);
            const bValues = content.get(b);
    
            // The undefined is always lower if one exists.
            if (aValues === undefined) {
                return -1;
            }
            if (bValues === undefined) {
                return 1;
            }
    
            // The string is always lower if one exists.
            if (typeof aValues === "string") {
                if (typeof bValues === "string") {
                    return aValues.localeCompare(bValues);
                }
                return -1;
            }
            if (typeof bValues === "string") {
                return 1;
            }
    
            // Call our sorting handler.
            return sortColumns(aValues, bValues, currentSortingRef.current);
        });
        if (JSON.stringify(modelIdsSorted) !== JSON.stringify(lastSortRef.current)) {
            lastSortRef.current = modelIdsSorted;
            onOrderRecomputed(modelIdsSorted);
        }
    }

    // Handle any filter changes.
    const currentFiltersRef = React.useRef(filtersPerColumn);
    React.useEffect(() => {
        if (JSON.stringify(currentFiltersRef.current) !== JSON.stringify(filtersPerColumn)) {
            currentFiltersRef.current = filtersPerColumn;
            setIncr((i) => i + 1);
        }
    }, [filtersPerColumn]);
    const setFilter = React.useCallback((columnName: string, filter: any) => {
        const new_ = { ...currentFiltersRef.current };
        if (filter === undefined) {
            delete new_[columnName];
        } else {
            new_[columnName] = filter;
        }
        currentFiltersRef.current = new_;
        setIncr((i) => i + 1);
        onFilterChange(columnName, filter);
    }, [currentFiltersRef]);

    // Route off to everything.
    const columnsHeader = React.useMemo(() => (
        <ColumnsHeader
            useColumns={columns.use}
            query={query}
            columnSpecificDataTypes={columnSpecificDataTypes}
            updateQuery={updateQuery}
            initialFilter={orderForColumn}
            onFilterChange={setFilter}
            onSortChange={setSorting}
        />
    ), [
        columns.use,
        query,
        columnSpecificDataTypes,
        updateQuery,
        orderForColumn,
        setFilter,
        setSorting,
    ]);
    const cellGroups = React.useMemo(() => {
        const mapping = new Map<string, JSX.Element>();
        for (const modelId of modelIdsSorted) {
            const hidden = computeIfValueIsHidden(modelId);
            if (hidden) {
                continue;
            }
            mapping.set(modelId, (
                <CellGroup
                    modelId={modelId}
                    updateContent={updateContent}
                    query={query}
                    useColumns={columns.use}
                    columnSpecificDataTypes={columnSpecificDataTypes}
                    cellComponent={cellComponent}
                />
            ));
        }
    }, [modelIdsSorted, computeIfValueIsHidden, content, updateContent, query, columnSpecificDataTypes, cellComponent]);

    // Return the columns header and the cell groups.
    return [columnsHeader, cellGroups];
}

export default function useMultiColumnSync(
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
    cellComponent: (props: CellProps) => JSX.Element,
    nameFilter: string,
    modelIdsToNames: Record<string, string>,
) {
    const [modelIds, setModelIds] = React.useState<string[]>(Object.keys(modelIdsToNames).sort());
    const hidden = React.useMemo(() => new Set(), []);
    const [currentSorting, setCurrentSorting] = React.useState<[number, [string, boolean]] | null>(null);

    const queryComponents = React.useMemo(() => {
        return queries.map((query, idx) => {
            const onSpecificQueryChange = React.useCallback((newQuery: string, newColumnSpecificDataTypes: Record<string, ColumnDataType>) => {
                onQueryChange(newQuery, newColumnSpecificDataTypes, idx);
            }, [onQueryChange, idx]);
            const setRecompute = React.useCallback((newModelIds: string[]) => {
                if (currentSorting?.[0] === idx) {
                    setModelIds(newModelIds);
                }
            }, [currentSorting, idx, setModelIds]);
            const setSorting = React.useCallback((newSorting: [string, boolean] | null) => {
                setCurrentSorting(newSorting === null ? null : [idx, newSorting]);
            }, [idx, setCurrentSorting]);
            const setFilter = React.useCallback((columnName: string, filter: any) => {
                onFilterChange(columnName, filter, idx);
            }, [onFilterChange, idx]);
            const setHidden = React.useCallback((modelId: string, show: boolean) => {
                if (show) {
                    hidden.delete(modelId);
                } else {
                    hidden.add(modelId);
                }
            }, [hidden]);
            return createSqlSyncLayer(
                query.query,
                query.columnSpecificDataTypes,
                onSpecificQueryChange,
                currentSorting?.[0] === idx ? currentSorting[1] : null,
                setRecompute,
                setSorting,
                modelIds,
                query.filters,
                setFilter,
                setHidden,
                cellComponent,
            );
        });
    }, [queries, setModelIds, currentSorting, onQueryChange]);

    
}
