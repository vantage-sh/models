import React from "react";
import type { ColumnQuery } from "../Table";

export default function StringFilter({
    columnName,
    query,
    updateQuery,
}: {
    columnName: string;
    query: ColumnQuery;
    updateQuery: (rerunQuery: boolean) => void;
}) {
    const [filterValue, setFilterValue] = React.useState<string>(
        query.columnFilters[columnName] || ""
    );

    return (
        <input
            type="text"
            value={filterValue}
            onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                    delete query.columnFilters[columnName];
                } else {
                    query.columnFilters[columnName] = val;
                }
                setFilterValue(val);
                updateQuery(false);
            }}
            className="w-full border text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md p-1 placeholder:text-gray-500 dark:placeholder:text-gray-400 placeholder:font-light"
            aria-label={`Filter ${columnName}`}
            placeholder={`Filter by ${columnName}...`}
        />
    );
}
