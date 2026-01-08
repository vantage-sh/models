import React from "react";
import type { ColumnQuery, LoadedValues } from "./Table";
import { ToolCase, Warehouse, Wrench } from "lucide-react";
import SQLModal from "./SQLModal";
import DefaultSelector from "./DefaultSelector";
import VendorSelector from "./VendorSelector";
import type { VendorInfo } from "../dataFormat";
import { useStateItem } from "../state";

function SelectionMode({
    queries,
    setQueries,
    exit,
    firstId,
    loadedValuesRows,
    vendors,
    externalClickHandler,
}: {
    queries: ColumnQuery[];
    setQueries: (cb: (prev: ColumnQuery[]) => ColumnQuery[]) => void;
    exit: () => void;
    firstId: string;
    loadedValuesRows: Map<string, LoadedValues>;
    vendors: Record<string, VendorInfo>;
    externalClickHandler: React.RefObject<(() => void) | null>;
}) {
    const [mode, setMode] = React.useState<null | "default" | "vendor">(null);
    const modalRef = React.useRef<HTMLDialogElement>(null);
    const holderRef = React.useRef<HTMLDivElement>(null);
    const [changes, setChanges] = React.useState(0);

    const scrollIntoView = React.useCallback(() => {
        if (holderRef.current) {
            holderRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, []);

    React.useEffect(() => {
        externalClickHandler.current = scrollIntoView;
    }, []);

    React.useLayoutEffect(() => {
        scrollIntoView();
    }, [changes]);

    const closer = (
        <button
            className="text-gray-500 hover:text-gray-800"
            onClick={exit}
            aria-label="Close selection mode"
        >
            ✕
        </button>
    );

    const setQueriesAndPurgeLoadedValues = React.useCallback(
        (cb: (prev: ColumnQuery[]) => ColumnQuery[]) => {
            loadedValuesRows.clear();
            setQueries(cb);
        },
        [setQueries, loadedValuesRows],
    );

    switch (mode) {
        case "default":
            return (
                <div ref={holderRef} className="flex pr-2">
                    {closer}
                    <DefaultSelector
                        queries={queries}
                        setQueries={setQueriesAndPurgeLoadedValues}
                    />
                </div>
            );
        case "vendor":
            return (
                <div ref={holderRef} className="flex pr-2">
                    {closer}
                    <VendorSelector
                        setQueries={setQueriesAndPurgeLoadedValues}
                        exit={exit}
                        vendors={vendors}
                    />
                </div>
            );
    }

    return (
        <div ref={holderRef} className="flex mt-2 pr-2">
            <SQLModal
                ref={modalRef}
                setQueries={setQueriesAndPurgeLoadedValues}
                exit={exit}
                firstId={firstId}
            />
            {closer}
            <div className="ml-4 flex flex-col gap-2">
                <button
                    className="py-1 px-2 flex items-center border border-gray-400 rounded hover:bg-gray-200"
                    onClick={() => {
                        setMode("default");
                        setChanges((c) => c + 1);
                    }}
                >
                    <ToolCase className="inline mr-1" size={16} />
                    Default Queries
                </button>
                <button
                    className="py-1 px-2 flex items-center border border-gray-400 rounded hover:bg-gray-200"
                    onClick={() => {
                        setMode("vendor");
                        setChanges((c) => c + 1);
                    }}
                >
                    <Warehouse className="inline mr-1" size={16} />
                    Vendor Queries
                </button>
                <button
                    className="py-1 px-2 flex items-center border border-gray-400 rounded hover:bg-gray-200"
                    onClick={() => {
                        modalRef.current?.showModal();
                        setChanges((c) => c + 1);
                    }}
                >
                    <Wrench className="inline mr-1" size={16} />
                    Custom SQL
                </button>
            </div>
        </div>
    )
}

export default function AddButton({
    firstId,
    loadedValuesRows,
    vendors,
}: {
    firstId: string;
    loadedValuesRows: Map<string, LoadedValues>;
    vendors: Record<string, VendorInfo>;
}) {
    const [queries, setQueries] = useStateItem("queries");
    const [selectionMode, setSelectionMode] = React.useState(false);
    const externalClickHandler = React.useRef<() => void>(null);

    let innerContent = (
        <button
            className={`py-1 px-2 mt-2 mr-2 border border-gray-400 rounded hover:bg-gray-200 ${selectionMode ? "hidden" : ""}`}
            onClick={() => {
                setSelectionMode((old) => {
                    if (old) {
                        // This is a external click, so we need to call the handler
                        externalClickHandler.current?.();
                    }
                    return true;
                });
            }}
            id="add-button"
        >
            + Add Query
        </button>
    );

    if (selectionMode) {
        innerContent = (
            <>
                {innerContent}
                <SelectionMode
                    queries={queries}
                    setQueries={setQueries}
                    loadedValuesRows={loadedValuesRows}
                    exit={() => {
                        setSelectionMode(false);
                        externalClickHandler.current = null;
                    }}
                    firstId={firstId}
                    vendors={vendors}
                    externalClickHandler={externalClickHandler}
                />
            </>
        );
    }

    return (
        <div aria-atomic="true" aria-live="assertive">
            {innerContent}
        </div>
    );
}
