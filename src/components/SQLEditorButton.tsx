import React from "react";
import type { ColumnDataType, ColumnQuery } from "./Table";
import { PencilIcon, XIcon } from "lucide-react";
import { CodeMirror, testQuery } from "./SQLModal";
import ColumnCustomTypeSelector from "./ColumnCustomTypeSelector";
import Button from "./Button";
import { loadSingleRow } from "../sqlEngine";
import { detectColumnRename, migrateColumnConfigs } from "./utils/migrateColumnConfigs";
import QueryHelp from "./QueryHelp";

type SQLEditorButtonProps = {
    query: ColumnQuery;
    firstId: string;
    updateQuery: (rerunQuery: boolean) => void;
};

export default function SQLEditorButton({ query, firstId, updateQuery }: SQLEditorButtonProps) {
    // FIXME: This button is not working as expected. It should update state properly, but it doesn't.
    return null;

    const ref = React.useRef<HTMLDialogElement>(null);
    const valueRef = React.useRef<string>(query.query);
    const columnCustomTypes = React.useRef<{ [key: string]: ColumnDataType }>({
        ...query.columnExplicitlySetDataTypes,
    });
    const [output, setOutput] = React.useState<React.JSX.Element | null>(null);

    const exit = React.useCallback(() => {
        if (ref.current && ref.current.open) {
            ref.current.close();
        }
        valueRef.current = query.query;
        columnCustomTypes.current = { ...query.columnExplicitlySetDataTypes };
        setOutput(null);
    }, []);

    const submit = React.useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();

            let oldRow: { [column: string]: any } | null = null;
            try {
                oldRow = await loadSingleRow(query.query, firstId);
            } catch {
                oldRow = null;
            }

            const res = await testQuery(valueRef.current, firstId);
            if (!res.ok) {
                setOutput(
                    <span className="text-red-600 dark:text-red-400 mb-4">Error: {res.error}</span>
                );
                return;
            }

            if (oldRow && res.row) {
                const rename = detectColumnRename(oldRow, res.row);
                if (rename) {
                    migrateColumnConfigs(query, rename.oldName, rename.newName);
                    if (rename.oldName in columnCustomTypes.current) {
                        columnCustomTypes.current[rename.newName] =
                            columnCustomTypes.current[rename.oldName];
                        delete columnCustomTypes.current[rename.oldName];
                    }
                }
            }

            query.query = valueRef.current;
            query.columnExplicitlySetDataTypes = {
                ...columnCustomTypes.current,
            };
            updateQuery(true);
            exit();
        },
        [columnCustomTypes, firstId, query, updateQuery]
    );

    return (
        <>
            <dialog
                ref={ref}
                className="m-auto p-0 rounded-lg max-w-lg w-full text-left font-normal bg-white dark:bg-gray-800 dark:text-gray-100 backdrop:bg-black/50 shadow-xl"
                onClick={exit}
                onClose={exit}
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
                            <h2 className="text-lg font-bold">Edit SQL</h2>
                        </header>
                        <form className="block" onSubmit={submit}>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Modify the SQL query used to generate this column's data. Changes
                                will update how values are calculated and displayed.
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
                            <ColumnCustomTypeSelector
                                columnCustomTypes={columnCustomTypes.current}
                            />
                            <Button className="mt-4">Save Changes</Button>
                        </form>
                    </div>
                </div>
            </dialog>
            <button
                className="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title="Edit SQL Query"
                onClick={() => {
                    ref.current?.showModal();
                }}
            >
                <PencilIcon size={16} />
            </button>
        </>
    );
}
