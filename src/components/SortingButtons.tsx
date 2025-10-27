import type { ColumnQuery } from "./Table";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function SortingButtons({
    columnName,
    query,
    updateQuery,
}: {
    columnName: string;
    query: ColumnQuery;
    updateQuery: () => void;
}) {
    const ascending = query.columnOrdering[columnName];

    const setSorting = (asc: boolean | undefined) => {
        if (asc === undefined) {
            delete query.columnOrdering[columnName];
        } else {
            query.columnOrdering[columnName] = asc;
        }
        updateQuery();
    };

    return (
        <div className="flex flex-col ml-1">
            <button
                onClick={() => setSorting(ascending === true ? undefined : true)}
                className="leading-2 p-0 border-none bg-none cursor-pointer"
                aria-label="Sort ascending"
            >
                <ArrowUp size={16} color={ascending === true ? "black" : "gray"} />
            </button>
            <button
                onClick={() => setSorting(ascending === false ? undefined : false)}
                className="leading-2 p-0 border-none bg-none cursor-pointer"
                aria-label="Sort descending"
            >
                <ArrowDown size={16} color={ascending === false ? "black" : "gray"} />
            </button>
        </div>
    );
}
