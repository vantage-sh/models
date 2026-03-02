import React from "react";
import type { ColumnDataType, ColumnQuery } from "./Table";
import { XIcon } from "lucide-react";
import ColumnCustomTypeSelector from "./ColumnCustomTypeSelector";
import Button from "./Button";
import { loadMultipleRows } from "../sqlEngine";
import QueryHelp from "./QueryHelp";

export type SQLModalProps = {
    exit: () => void;
    setQueries: (cb: (prev: ColumnQuery[]) => ColumnQuery[]) => void;
    firstId: string;
};

export const CodeMirror = React.lazy(() => import("./CodeMirror"));

export async function testQuery(
    query: string,
    firstId: string
): Promise<{ ok: boolean; error?: string; row?: { [column: string]: any } }> {
    try {
        const rows = await loadMultipleRows(query, [firstId]);
        if (!rows || rows.length === 0) {
            return {
                ok: false,
                error: "No rows returned",
            };
        }
        if (rows.length > 1) {
            return {
                ok: false,
                error: "Query returned more than one row. Please ensure your query returns exactly one row.",
            };
        }
        return {
            ok: true,
            row: rows[0],
        };
    } catch (e) {
        console.log("Error testing query:", e);
        return {
            ok: false,
            error: `Query failed to execute: ${(e as any).message}`,
        };
    }
}

function SQLModalInner({ exit, setQueries, firstId }: SQLModalProps) {
    const valueRef = React.useRef<string>("");
    const columnCustomTypes = React.useRef<{ [key: string]: ColumnDataType }>({});
    const [output, setOutput] = React.useState<React.JSX.Element | null>(null);

    const submit = React.useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            testQuery(valueRef.current, firstId).then((res) => {
                if (!res.ok) {
                    setOutput(
                        <span className="text-red-600 dark:text-red-400 mb-4">
                            Error: {res.error}
                        </span>
                    );
                    return;
                }

                setQueries((prev) => [
                    ...prev,
                    {
                        query: valueRef.current,
                        columnExplicitlySetDataTypes: columnCustomTypes.current,
                        columnFilters: {},
                        columnOrdering: {},
                    },
                ]);
                exit();
            });
        },
        [firstId, setQueries, exit]
    );

    return (
        <form className="block" onSubmit={submit}>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Create a new column using a custom SQL query. The query will define how values for
                this column are calculated and displayed.
            </p>
            {output && <output className="block mb-3">{output}</output>}
            <label className="block text-sm font-medium mb-1.5">Query</label>
            <React.Suspense
                fallback={
                    <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                }
            >
                <CodeMirror
                    value={valueRef.current}
                    maxHeight="300px"
                    onChange={(val) => {
                        valueRef.current = val;
                    }}
                />
            </React.Suspense>
            <QueryHelp />
            <ColumnCustomTypeSelector columnCustomTypes={columnCustomTypes.current} />
            <Button className="mt-4">Add Column</Button>
        </form>
    );
}

const SQLModal = React.forwardRef<HTMLDialogElement, SQLModalProps>((props, ref) => {
    return (
        <dialog
            ref={ref}
            className="m-auto p-0 rounded-lg max-w-lg w-full bg-white dark:bg-gray-800 dark:text-gray-100 backdrop:bg-black/50 shadow-xl"
            onClick={() => props.exit()}
            onClose={() => props.exit()}
        >
            <div onClick={(e) => e.stopPropagation()}>
                <div className="bg-white dark:bg-gray-800 p-5 block w-full h-full">
                    <header className="flex gap-2 items-center mb-4">
                        <form method="dialog">
                            <button
                                type="submit"
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </form>
                        <h2 className="text-lg font-bold">Add SQL Columns</h2>
                    </header>
                    <SQLModalInner {...props} />
                </div>
            </div>
        </dialog>
    );
});
SQLModal.displayName = "SQLModal";

export default SQLModal;
