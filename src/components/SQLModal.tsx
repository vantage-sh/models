import React from "react";
import type { ColumnDataType, ColumnQuery } from "./Table";
import { XIcon } from "lucide-react";
import ColumnCustomTypeSelector from "./ColumnCustomTypeSelector";
import Button from "./Button";
import { loadMultipleRows } from "../sqlEngine";

export type SQLModalProps = {
    exit: () => void;
    setQueries: (cb: (prev: ColumnQuery[]) => ColumnQuery[]) => void;
    firstId: string;
};

export const CodeMirror = React.lazy(() => import("./CodeMirror"));

export async function testQuery(query: string, firstId: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const rows = await loadMultipleRows(query, [firstId]);
        if (!rows) {
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
    } catch (e) {
        console.log("Error testing query:", e);
        return {
            ok: false,
            error: `Query failed to execute: ${(e as any).message}`,
        };
    }

    return {
        ok: true,
    };
}

function SQLModalInner({
    exit,
    setQueries,
    firstId,
}: SQLModalProps) {
    const valueRef = React.useRef<string>("");
    const columnCustomTypes = React.useRef<{ [key: string]: ColumnDataType }>({});
    const [output, setOutput] = React.useState<React.JSX.Element | null>(null);

    const submit = React.useCallback((e: React.FormEvent) => {
        e.preventDefault();
        testQuery(valueRef.current, firstId).then((res) => {
            if (!res.ok) {
                setOutput(<span className="text-red-600 mb-4">Error: {res.error}</span>);
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
    }, [columnCustomTypes]);

    return (
        <form className="block max-w-lg" onSubmit={submit}>
            {output && <output>{output}</output>}
            <React.Suspense fallback={<></>}>
                <CodeMirror
                    value={valueRef.current}
                    maxHeight="300px"
                    onChange={(val) => {
                        valueRef.current = val;
                    }}
                />
            </React.Suspense>
            <ColumnCustomTypeSelector
                columnCustomTypes={columnCustomTypes.current}
            />
            <p className="mt-4">
                Define the SQL query you would like to use to get column data. The first parameter
                for queries is the ID of the model in that row.
            </p>
            <p className="mt-4">
                TODO: Query help
            </p>
            <Button className="mt-4">
                Add Columns
            </Button>
        </form>
    )
}

const SQLModal = React.forwardRef<HTMLDialogElement, SQLModalProps>((props, ref) => {
    return (
        <dialog
            ref={ref}
            className="m-auto p-0 rounded-md max-w-lg"
            onClick={() => props.exit()}
            onClose={() => props.exit()}
        >
            <div onClick={e => e.stopPropagation()}>
                <div className="bg-white p-4 block w-full h-full">
                    <header>
                        <div className="flex gap-2 items-center">
                            <form method="dialog">
                                <button type="submit" className="py-4 rounded-md">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </form>
                            <h2 className="text-lg font-bold">Add SQL Columns</h2>
                        </div>
                    </header>
                    <hr className="mt-2 mb-4 border-gray-200" />
                    <SQLModalInner {...props} />
                </div>
            </div>
        </dialog>
    );
});
SQLModal.displayName = "SQLModal";

export default SQLModal;
