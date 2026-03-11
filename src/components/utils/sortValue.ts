import type { ColumnDataType } from "../Table";

export default function sortValue(
    aVal: any,
    bVal: any,
    ascending: boolean,
    dataType: ColumnDataType | undefined
): number {
    let comparison = 0;

    // Null/undefined values are always at the end
    if (aVal === null || aVal === undefined) {
        return 1;
    }
    if (bVal === null || bVal === undefined) {
        return -1;
    }

    if (dataType === "boolean") {
        const aBool = Boolean(aVal);
        const bBool = Boolean(bVal);
        comparison = aBool === bBool ? 0 : aBool ? 1 : -1;
    } else if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
    } else {
        const aStr = String(aVal);
        const bStr = String(bVal);
        comparison = aStr.localeCompare(bStr);
    }

    return ascending ? comparison : -comparison;
}
