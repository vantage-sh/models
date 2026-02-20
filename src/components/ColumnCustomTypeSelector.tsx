import React from "react";
import type { ColumnDataType } from "./Table";
import { PencilIcon, TrashIcon, PlusIcon } from "lucide-react";

type ColumnCustomTypeSelectorProps = {
    columnCustomTypes: {
        [key: string]: ColumnDataType;
    };
};

export default function ColumnCustomTypeSelector({
    columnCustomTypes,
}: ColumnCustomTypeSelectorProps) {
    const [columnKeys, setColumnKeys] = React.useState(() => Object.keys(columnCustomTypes));
    const [newColName, setNewColName] = React.useState("");
    const [newColType, setNewColType] = React.useState<ColumnDataType | "other">("other");
    const [isAdding, setIsAdding] = React.useState(false);

    React.useEffect(() => {
        setColumnKeys(Object.keys(columnCustomTypes));
    }, [columnCustomTypes]);

    const handleTypeChange = React.useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const { name } = e.target.dataset;
            const newType = e.target.value as ColumnDataType | "other";
            if (newType === "other") {
                delete columnCustomTypes[name!];
            } else {
                columnCustomTypes[name!] = newType;
            }
        },
        [columnCustomTypes]
    );

    const addColumn = React.useCallback(() => {
        const trimmed = newColName.trim();
        if (trimmed && !columnKeys.includes(trimmed)) {
            if (newColType !== "other") {
                columnCustomTypes[trimmed] = newColType;
            }
            setColumnKeys((prev) => [...prev, trimmed]);
            setNewColName("");
            setNewColType("other");
            setIsAdding(false);
        }
    }, [newColName, newColType, columnKeys, columnCustomTypes]);

    return (
        <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Define a custom column type in the query.
            </p>

            {columnKeys.length > 0 && (
                <table className="w-full text-sm mb-2">
                    <thead>
                        <tr>
                            <th className="border dark:border-gray-600 px-2 py-1.5 text-left font-medium text-xs">
                                Column Name
                            </th>
                            <th className="border dark:border-gray-600 px-2 py-1.5 text-left font-medium text-xs">
                                Data Type
                            </th>
                            <th className="border dark:border-gray-600 w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {columnKeys.map((col, idx) => (
                            <tr key={col}>
                                <td className="border dark:border-gray-600 px-2 py-1">
                                    <div className="flex items-center gap-1.5">
                                        <PencilIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                        <span className="text-sm">{col}</span>
                                    </div>
                                </td>
                                <td className="border dark:border-gray-600 px-2 py-1">
                                    <select
                                        data-name={col}
                                        defaultValue={columnCustomTypes[col] || "other"}
                                        onChange={handleTypeChange}
                                        className="border dark:border-gray-600 dark:bg-gray-800 px-1 py-0.5 text-sm rounded"
                                    >
                                        <option value="other">SQL Native</option>
                                        <option value="boolean">Boolean</option>
                                        <option value="currency">Currency</option>
                                    </select>
                                </td>
                                <td className="border dark:border-gray-600 px-1 py-1 text-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            delete columnCustomTypes[col];
                                            setColumnKeys((prev) =>
                                                prev.filter((_, i) => i !== idx)
                                            );
                                        }}
                                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-0.5"
                                        title="Remove"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {isAdding ? (
                <div className="flex items-center gap-2 mt-2">
                    <input
                        type="text"
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addColumn();
                            }
                            if (e.key === "Escape") {
                                setIsAdding(false);
                                setNewColName("");
                                setNewColType("other");
                            }
                        }}
                        placeholder="Give it a name"
                        className="flex-1 px-2 py-1 text-sm border dark:border-gray-600 bg-white dark:bg-gray-800 rounded"
                        autoFocus
                    />
                    <select
                        className="border dark:border-gray-600 dark:bg-gray-800 px-1 py-1 text-sm rounded"
                        value={newColType}
                        onChange={(e) => setNewColType(e.target.value as ColumnDataType | "other")}
                    >
                        <option value="other">SQL Native</option>
                        <option value="boolean">Boolean</option>
                        <option value="currency">Currency</option>
                    </select>
                    <button
                        type="button"
                        onClick={addColumn}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                    >
                        Add
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsAdding(false);
                            setNewColName("");
                            setNewColType("other");
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                    >
                        Cancel
                    </button>
                </div>
            ) : (
                <button
                    aria-label="Add Custom Column Type"
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-1"
                >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Add Custom Column Type
                </button>
            )}
        </div>
    );
}
