import React from "react";
import { defaultQueries, defaultImageQueries } from "../constants";
import type { ColumnQuery } from "./Table";

export default function DefaultSelector({
    queries,
    setQueries,
    modelType,
}: {
    queries: ColumnQuery[];
    setQueries: (cb: (prev: ColumnQuery[]) => ColumnQuery[]) => void;
    modelType: "llm" | "image";
}) {
    const availableDefaults = modelType === "llm" ? defaultQueries : defaultImageQueries;

    const checkedQueries = React.useMemo(() => {
        return availableDefaults
            .filter((dq) => queries.find((q) => q.query === dq.query))
            .map((dq) => dq.name);
    }, [queries, availableDefaults]);

    const handleChange = React.useCallback(
        (name: string) => {
            const dq = availableDefaults.find((dq) => dq.name === name);
            if (!dq) return;
            if (checkedQueries.includes(name)) {
                setQueries((prev) => prev.filter((q) => q.query !== dq.query));
            } else {
                setQueries((prev) => {
                    const filter = prev.filter((q) => q.query !== dq.query);
                    const newQuery = {
                        ...dq,
                        columnFilters: {},
                        columnOrdering: {},
                    };
                    // Insert at the correct position based on the order in availableDefaults
                    const defaultIdx = availableDefaults.findIndex((d) => d.name === name);
                    let insertIdx = 0;
                    for (let i = 0; i < filter.length; i++) {
                        const existingIdx = availableDefaults.findIndex(
                            (d) => d.query === filter[i].query
                        );
                        if (existingIdx !== -1 && existingIdx < defaultIdx) {
                            insertIdx = i + 1;
                        }
                    }
                    return [...filter.slice(0, insertIdx), newQuery, ...filter.slice(insertIdx)];
                });
            }
        },
        [checkedQueries, availableDefaults]
    );

    return (
        <div className="flex flex-col gap-0.5">
            {availableDefaults.map((dq) => {
                const isChecked = checkedQueries.includes(dq.name);
                return (
                    <label
                        key={dq.name}
                        className="flex items-center gap-2.5 py-1.5 px-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors"
                    >
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleChange(dq.name)}
                            className="w-4 h-4 rounded flex-shrink-0"
                            style={{ accentColor: "#7c3aed" }}
                        />
                        <span className="text-sm">{dq.name}</span>
                    </label>
                );
            })}
        </div>
    );
}
