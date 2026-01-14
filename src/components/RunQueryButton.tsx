import React from "react";
import { XIcon, PlayIcon } from "lucide-react";
import { loadMultipleRows } from "../sqlEngine";
import QueryHelp from "./QueryHelp";
import Button from "./Button";

const CodeMirror = React.lazy(() => import("./CodeMirror"));

type QueryResult = {
    columns: string[];
    rows: Record<string, unknown>[];
};

function ResultsTable({ result }: { result: QueryResult }) {
    if (result.rows.length === 0) {
        return <p className="text-gray-500 italic">Query returned no rows.</p>;
    }

    return (
        <div className="overflow-auto max-h-80 border border-gray-200 rounded">
            <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                    <tr>
                        {result.columns.map((col) => (
                            <th key={col} className="px-3 py-2 text-left font-medium border-b border-gray-200">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {result.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-gray-100 hover:bg-gray-50">
                            {result.columns.map((col) => (
                                <td key={col} className="px-3 py-2">
                                    {formatValue(row[col])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function formatValue(value: unknown): string {
    if (value === null) return "NULL";
    if (value === undefined) return "";
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value);
}

function RunQueryModal({ onClose }: { onClose: () => void }) {
    const dialogRef = React.useRef<HTMLDialogElement>(null);
    const queryRef = React.useRef<string>("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [result, setResult] = React.useState<QueryResult | null>(null);

    React.useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) {
            dialog.showModal();
        }
    }, []);

    const runQuery = React.useCallback(async () => {
        const query = queryRef.current.trim();
        if (!query) {
            setError("Please enter a query");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const rows = await loadMultipleRows(query);
            if (rows.length === 0) {
                setResult({ columns: [], rows: [] });
            } else {
                const columns = Object.keys(rows[0]);
                setResult({ columns, rows: rows.slice(0, 100) });
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <dialog
            ref={dialogRef}
            className="backdrop:bg-black/50 bg-white rounded-lg shadow-xl p-0 m-auto max-w-3xl w-[calc(100%-2rem)] max-h-[90vh] overflow-hidden"
            onClose={onClose}
            onClick={(e) => {
                if (e.target === dialogRef.current) {
                    onClose();
                }
            }}
        >
            <div className="flex flex-col max-h-[90vh]">
                <header className="flex items-center gap-2 p-4 border-b border-gray-200">
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <XIcon className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-bold">Run SQL Query</h2>
                </header>

                <div className="p-4 overflow-auto flex-1">
                    <React.Suspense fallback={<div className="h-32 bg-gray-100 rounded animate-pulse" />}>
                        <CodeMirror
                            value={queryRef.current}
                            maxHeight="200px"
                            onChange={(val) => {
                                queryRef.current = val;
                            }}
                        />
                    </React.Suspense>

                    <QueryHelp />

                    <div className="mt-4 flex items-center gap-4">
                        <Button onClick={runQuery} disabled={isLoading}>
                            <span className="flex items-center gap-2">
                                <PlayIcon className="w-4 h-4" />
                                {isLoading ? "Running..." : "Run Query"}
                            </span>
                        </Button>
                        {result && (
                            <span className="text-sm text-gray-500">
                                {result.rows.length === 100
                                    ? "Showing first 100 rows"
                                    : `${result.rows.length} row${result.rows.length === 1 ? "" : "s"}`}
                            </span>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className="mt-4">
                            <ResultsTable result={result} />
                        </div>
                    )}
                </div>
            </div>
        </dialog>
    );
}

export default function RunQueryButton() {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="px-4 py-1.5 rounded text-sm font-medium transition-colors text-white/80 hover:text-white hover:bg-[#7a52e6]"
            >
                Run Query
            </button>
            {isOpen && <RunQueryModal onClose={() => setIsOpen(false)} />}
        </>
    );
}
