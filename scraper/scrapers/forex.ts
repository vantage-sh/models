import { writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

type CurrencyInfo = {
    code: string;
    name: string;
    rate: number;
};

type PartialCurrencyInfo = {
    rate: number;
    name: string;
};

export default async function scrapeForexData() {
    const data = await fetch("https://www.floatrates.com/daily/usd.json").then((r) => {
        if (!r.ok) {
            throw new Error(`Failed to fetch forex data: ${r.status} ${r.statusText}`);
        }
        return r.json() as Promise<Record<string, CurrencyInfo>>;
    });
    const currencyInfo: Record<string, PartialCurrencyInfo> = {};
    for (const [code, info] of Object.entries(data)) {
        currencyInfo[code] = {
            rate: info.rate,
            name: info.name,
        };
    }
    currencyInfo.USD = {
        rate: 1,
        name: "US Dollar",
    };

    const selfPath = dirname(fileURLToPath(import.meta.url));
    const dataJsonPath = join(selfPath, "..", "..", "src", "forex.json");
    await writeFile(dataJsonPath, JSON.stringify(currencyInfo, null, 2));
    console.log(`Wrote forex data to ${dataJsonPath}`);
}
