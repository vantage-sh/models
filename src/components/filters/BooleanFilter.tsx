import type { ColumnQuery } from "../Table";

export default function BooleanFilter({
    columnName,
    query,
    updateQuery,
}: {
    columnName: string;
    query: ColumnQuery;
    updateQuery: () => void;
}) {
    const currentFilter = query.columnFilters[columnName];

    const setFilter = (value: boolean | undefined) => {
        if (value === undefined) {
            delete query.columnFilters[columnName];
        } else {
            query.columnFilters[columnName] = value;
        }
        updateQuery();
    };

    return (
        <select
            value={currentFilter === undefined ? "any" : currentFilter ? "true" : "false"}
            onChange={(e) => {
                const val = e.target.value;
                if (val === "any") {
                    setFilter(undefined);
                } else if (val === "true") {
                    setFilter(true);
                } else {
                    setFilter(false);
                }
            }}
            className="w-full border text-sm border-gray-300 rounded-md p-1"
        >
            <option value="any">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
        </select>
    );
}
