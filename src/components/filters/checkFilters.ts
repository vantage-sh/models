import type { ColumnDataType } from "../Table";
import type { OperatorTypes } from "./NumberFilter";

export default function checkFilters(
    row: { [column: string]: any },
    filters: Record<string, any>,
    explicitlySetDataTypes: Record<string, ColumnDataType>
): boolean {
    for (const [col, val] of Object.entries(filters)) {
        const dataType = explicitlySetDataTypes[col];

        if (dataType === "boolean") {
            const rowVal = Boolean(row[col]);
            if (rowVal !== Boolean(val)) {
                return false;
            }
            break;
        }

        const rowVal = row[col];
        if (rowVal === null || rowVal === undefined) {
            // >= 0 is the default/reset state for number filters — treat null as passing.
            if (Array.isArray(val) && val[0] === ">=" && val[1] === 0) continue;
            return false;
        }
        switch (typeof rowVal) {
            case "string": {
                if (!String(rowVal).toLowerCase().includes(String(val).toLowerCase())) {
                    return false;
                }
                break;
            }
            case "number": {
                if (!Array.isArray(val) || val.length !== 2) {
                    break;
                }
                const [op, num] = val as [OperatorTypes, number];
                switch (op) {
                    case ">=":
                        if (!(rowVal >= num)) return false;
                        break;
                    case "<=":
                        if (!(rowVal <= num)) return false;
                        break;
                    case "=":
                        if (!(rowVal === num)) return false;
                        break;
                    case ">":
                        if (!(rowVal > num)) return false;
                        break;
                    case "<":
                        if (!(rowVal < num)) return false;
                        break;
                }
                break;
            }
        }
    }

    return true;
}
