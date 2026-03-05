import React, { type JSX } from "react";
import type { ColumnDataType } from "../Table";
import { loadSingleRow } from "@/src/sqlEngine";

export type ColumnsHeaderProps = {
    useColumns: () => string[] | null;
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
    useColumns: () => string[] | null;
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
    useColumns,
    columnSpecificDataTypes,
    cellComponent: Cell,
    customTdComponent,
    isLlm,
}: CellGroupProps) {
    const columns = useColumns();
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
            // Load from the database
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
            // Make N-1 blank cells.
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
    queryIdx: number,
    columnSpecificDataTypes: Record<string, ColumnDataType>,
    onQueryChange: (query: string, columnSpecificDataTypes: Record<string, ColumnDataType>) => void,
    orderForColumn: [string, boolean] | null,
    onOrderRecomputed: (modelIds: string[]) => void,
    onSortChange: (v: [string, boolean] | null) => void,
    modelIds: string[],
    filtersPerColumn: Record<string, any>,
    onFilterChange: (columnName: string, filter: any) => void,
    onModelIdShowOrHide: (modelId: string, show: boolean) => void,
    cellComponent: (props: CellProps) => any,
    ColumnsHeader: (props: ColumnsHeaderProps) => JSX.Element | JSX.Element[],
    customTdComponent: ((props: CustomTdProps) => JSX.Element) | null,
    isLlm: boolean,
    firstId: string,
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
            queryIdx={queryIdx}
            columnSpecificDataTypes={columnSpecificDataTypes}
            updateQuery={updateQuery}
            initialFilter={orderForColumn}
            onFilterChange={setFilter}
            onSortChange={setSorting}
            key={queryIdx}
            isLlm={isLlm}
            firstId={firstId}
        />
    ), [
        columns.use,
        query,
        queryIdx,
        columnSpecificDataTypes,
        updateQuery,
        orderForColumn,
        setFilter,
        setSorting,
        queryIdx,
        isLlm,
    ]);
    const cellGroups = React.useMemo(() => {
        const mapping = new Map<string, JSX.Element>();
        for (const modelId of modelIdsSorted) {
            mapping.set(modelId, (
                <CellGroup
                    modelId={modelId}
                    updateContent={updateContent}
                    query={query}
                    useColumns={columns.use}
                    columnSpecificDataTypes={columnSpecificDataTypes}
                    cellComponent={cellComponent}
                    queryIdx={queryIdx}
                    customTdComponent={customTdComponent}
                    isLlm={isLlm}
                    key={queryIdx}
                />
            ));
        }
        return mapping;
    }, [modelIdsSorted, updateContent, query, columnSpecificDataTypes, cellComponent, queryIdx, customTdComponent, isLlm]);

    // Return the columns header and the cell groups.
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

    const modelIdsMapping = React.useMemo(() => {
        return new Map(modelIdsAndNamesSorted.map(({ id, name }) => [id, name]));
    }, [modelIdsAndNamesSorted]);

    const modelIds = React.useMemo(() => {
        return modelIdsAndNamesSorted.map(({ id }) => id);
    }, [modelIdsAndNamesSorted]);
    const [, setIncr] = React.useState(0);

    const setModelIds = React.useCallback((newModelIds: string[]) => {
        setModelIdsAndNamesSorted(newModelIds.map((id) => ({
            id,
            name: modelIdsMapping.get(id)!,
        })));
    }, [modelIdsMapping, setModelIdsAndNamesSorted]);

    const queryComponents = queries.map((query, idx) => {
        const onSpecificQueryChange = (newQuery: string, newColumnSpecificDataTypes: Record<string, ColumnDataType>) => {
            onQueryChange(newQuery, newColumnSpecificDataTypes, idx);
        };

        const setRecompute = (newModelIds: string[]) => {
            if (currentSorting?.[0] === idx) {
                setModelIds(newModelIds);
            }
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

        return createSqlSyncLayer(
            query.query,
            idx,
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
        let display = hidden.has(modelId) ? "none" : "block";
        const name = modelIdsMapping.get(modelId)!;
        if (nameFilter !== "" && !name.toLowerCase().includes(nameFilter.toLowerCase())) {
            display = "none";
        }
        const subCellGroups = queryComponents.map((q) => {
            const cellGroup = q[1].get(modelId);
            if (cellGroup === undefined) {
                // Loading. This is a empty cell.
                return <td></td>;
            }
            return cellGroup;
        });
        tableRows.push(
            <tr style={{ display }} key={modelId}>
                <NameComponent name={name} modelId={modelId} isLlm={isLlm} />
                {subCellGroups}
            </tr>
        );
    }
    return [headersWithoutName, tableRows] as const;
}
