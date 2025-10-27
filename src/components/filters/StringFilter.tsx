import React from "react";
import type { ColumnQuery } from "../Table";

export default function StringFilter({
    columnName,
    query,
    updateQuery,
}: {
    columnName: string;
    query: ColumnQuery;
    updateQuery: () => void;
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
                updateQuery();
            }}
            className="w-full border text-sm border-gray-300 rounded-md p-1"
            aria-label={`Filter ${columnName}`}
        />
    );
}
