import type { Init, Payload, PayloadResult } from "./sql/worker";
import { createSQLWorker } from "./components/utils/WorkerManager";
import type { DataFormat } from "./dataFormat";

/** Gets the name/ID for a model. */
export function getModelIdsAndNames(data: DataFormat): {id: string; name: string }[] {
    return Object.entries(data.models).map(([modelId, modelData]) => ({
        id: modelId,
        name: modelData.cleanName,
    })).sort((a, b) => a.name.localeCompare(b.name));
}

let loadedDataPromise: Promise<Uint8Array<ArrayBuffer>> | null = null;

async function loadDataDb(): Promise<Uint8Array<ArrayBuffer>> {
    if (loadedDataPromise) {
        return loadedDataPromise;
    }

    loadedDataPromise = fetch("/data.db").then(async (res) => {
        if (!res.ok) {
            throw new Error(`Failed to load data.db: ${res.status} ${res.statusText}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    });

    return loadedDataPromise;
}

function asyncIfWindow<T>(fn: () => Promise<T>): Promise<T> {
    if (typeof window !== "undefined") {
        return fn();
    }
    return Promise.resolve(null as T);
}

const poolPromise = asyncIfWindow(async () => createSQLWorker<Init, Payload, PayloadResult>(
    () => new Worker(new URL("./sql/worker.ts", import.meta.url), { type: "module" }),
    await loadDataDb(),
));

const queryCache = new Map<string, Map<string, { [column: string]: any }>>();

/** Loads a single row. */
export async function loadSingleRow(query: string, modelId: string): Promise<{ [column: string]: any } | null> {
    let modelCache = queryCache.get(query);
    let modelCacheRes = modelCache?.get(modelId) as { [column: string]: any } | undefined | null;
    if (modelCacheRes) {
        return modelCacheRes;
    }

    const pool = await poolPromise;
    const [resId, res] = await pool([0, query, modelId]);
    if (resId === 0) {
        throw new Error(res);
    }
    if (resId !== 1) {
        throw new Error(`Unexpected response ID for single row query: ${resId}`);
    }

    if (res !== null) {
        if (!modelCache) {
            modelCache = new Map<string, { [column: string]: any }>();
            queryCache.set(query, modelCache);
        }
        modelCache.set(modelId, res);
    }

    return res;
}

/** Loads multiple rows. */
export async function loadMultipleRows(query: string, args?: any[]): Promise<{ [column: string]: any }[]> {
    const pool = await poolPromise;

    const [resId, res] = await pool([1, query, args ?? []]);
    if (resId === 0) {
        throw new Error(res);
    }
    if (resId !== 2) {
        throw new Error(`Unexpected response ID for multiple rows query: ${resId}`);
    }

    return res;
}
