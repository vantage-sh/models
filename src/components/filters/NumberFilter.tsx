import React from "react";
import type { ColumnQuery } from "../Table";

export type OperatorTypes = ">=" | "<=" | "=" | ">" | "<";

export function NumberFilter({
    columnName,
    query,
    updateQuery,
}: {
    columnName: string;
    query: ColumnQuery;
    updateQuery: (rerunQuery: boolean) => void;
}) {
    const [filterValue, setFilterValue] = React.useState<[OperatorTypes, number]>(
        query.columnFilters[columnName] || [">=", 0]
    );

    return (
        <div className="flex">
            <select
                value={filterValue[0]}
                onChange={(e) => {
                    const newOp = e.target.value as OperatorTypes;
                    const newFilter: [OperatorTypes, number] = [newOp, filterValue[1]];
                    query.columnFilters[columnName] = newFilter;
                    setFilterValue(newFilter);
                    updateQuery(false);
                }}
                className="border text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md p-1 mr-1"
                aria-label={`Operator for filtering ${columnName}`}
            >
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="=">=</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
            </select>
            <input
                type="number"
                value={filterValue[1]}
                onChange={(e) => {
                    const newNum = Number(e.target.value);
                    const newFilter: [OperatorTypes, number] = [filterValue[0], newNum];
                    query.columnFilters[columnName] = newFilter;
                    setFilterValue(newFilter);
                    updateQuery(false);
                }}
                className="border text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md p-1 w-full"
                aria-label={`Value for filtering ${columnName}`}
            />
        </div>
    );
}
