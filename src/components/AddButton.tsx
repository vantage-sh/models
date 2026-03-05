import React from "react";
import type { ColumnQuery } from "./Table";
import { XIcon, Code2Icon } from "lucide-react";
import SQLModal from "./SQLModal";
import DefaultSelector from "./DefaultSelector";
import VendorSelector from "./VendorSelector";
import type { VendorInfo } from "../dataFormat";
import { useStateItem } from "../state";

export default function AddButton({
    isOpen,
    onClose,
    firstId,
    vendors,
    modelType,
}: {
    isOpen: boolean;
    onClose: () => void;
    firstId: string;
    vendors: Record<string, VendorInfo>;
    modelType: "llm" | "image";
}) {
    const [queries, setQueries] = useStateItem(
        "queries",
        modelType === "llm" ? "/" : "/image-models"
    );
    const [activeTab, setActiveTab] = React.useState<"default" | "vendor">("default");
    const modalRef = React.useRef<HTMLDialogElement>(null);

    const setQueriesAndPurgeLoadedValues = (cb: (prev: ColumnQuery[]) => ColumnQuery[]) =>
        setQueries(cb);

    if (!isOpen) return null;

    return (
        <>
            <SQLModal
                ref={modalRef}
                setQueries={setQueriesAndPurgeLoadedValues}
                exit={() => {
                    if (modalRef.current?.open) {
                        modalRef.current.close();
                        onClose();
                    }
                }}
                firstId={firstId}
            />
            <div className="w-80 shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto">
                <div className="flex items-center justify-between p-3 pb-0">
                    <h3 className="font-semibold text-sm">Add Query</h3>
                    <div className="flex items-center gap-2">
                        <button
                            className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            onClick={() => {
                                modalRef.current?.showModal();
                            }}
                        >
                            <Code2Icon className="w-3.5 h-3.5" />
                            Custom SQL
                        </button>
                        <button
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            onClick={onClose}
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-gray-200 dark:border-gray-700 mt-2">
                    <button
                        className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                            activeTab === "default"
                                ? "border-b-2 border-[#6742d6] text-[#6742d6] dark:border-purple-400 dark:text-purple-300"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                        onClick={() => setActiveTab("default")}
                    >
                        Default Queries
                    </button>
                    <button
                        className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                            activeTab === "vendor"
                                ? "border-b-2 border-[#6742d6] text-[#6742d6] dark:border-purple-400 dark:text-purple-300"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                        onClick={() => setActiveTab("vendor")}
                    >
                        Vendor Queries
                    </button>
                </div>

                <div className="p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {activeTab === "default"
                            ? "Add a column using one of the available default queries. Select a query from the list to turn it on or off."
                            : "Add a column using vendor-specific data. Select a vendor and data type to add."}
                    </p>

                    {activeTab === "default" ? (
                        <DefaultSelector
                            queries={queries}
                            setQueries={setQueriesAndPurgeLoadedValues}
                            modelType={modelType}
                        />
                    ) : (
                        <VendorSelector
                            setQueries={setQueriesAndPurgeLoadedValues}
                            exit={onClose}
                            vendors={vendors}
                            modelType={modelType}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
