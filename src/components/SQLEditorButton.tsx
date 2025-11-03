import React from "react";
import type { ColumnDataType, ColumnQuery } from "./Table";
import { PencilIcon, XIcon } from "lucide-react";
import { CodeMirror, testQuery } from "./SQLModal";
import ColumnCustomTypeSelector from "./ColumnCustomTypeSelector";
import Button from "./Button";

type SQLEditorButtonProps = {
    query: ColumnQuery;
    firstId: string;
    updateQuery: () => void;
};

export default function SQLEditorButton({ query, firstId, updateQuery }: SQLEditorButtonProps) {
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

    const submit = React.useCallback((e: React.FormEvent) => {
        e.preventDefault();
        testQuery(valueRef.current, firstId).then((res) => {
            if (!res.ok) {
                setOutput(<span className="text-red-600 mb-4">Error: {res.error}</span>);
                return;
            }

            query.query = valueRef.current;
            query.columnExplicitlySetDataTypes = {
                ...columnCustomTypes.current,
            };
            updateQuery();
            exit();
        });
    }, [columnCustomTypes]);

    return (
        <>
            <dialog
                ref={ref}
                className="m-auto p-0 rounded-md max-w-lg text-left font-normal"
                onClick={exit}
                onClose={exit}
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
                                <h2 className="text-lg font-bold">Edit SQL</h2>
                            </div>
                        </header>
                        <hr className="mt-2 mb-4 border-gray-200" />
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
                                Save Changes
                            </Button>
                        </form>
                    </div>
                </div>
            </dialog>
            <button
                className="ml-2 px-2 py-1 text-xs rounded hover:bg-gray-100 transition"
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
