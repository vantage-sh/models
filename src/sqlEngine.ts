import type { Init, Payload, PayloadResult } from "./sql/worker";
import { createSQLWorker } from "./components/utils/WorkerManager";
import type { DataFormat } from "./dataFormat";

const LS_CACHE_PREFIX = "sqlc:";
const LS_SIZE_KEY = "sqlc:_size";
const LS_MAX_BYTES = 3 * 1024 * 1024;

function hashStr(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
        h = (((h << 5) + h) ^ s.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(36);
}

function hashBytes(data: Uint8Array): string {
    let h = 5381;
    for (let i = 0; i < data.length; i++) {
        h = (((h << 5) + h) ^ data[i]) | 0;
    }
    return (h >>> 0).toString(36);
}

function lsGet(key: string): any {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return undefined;
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
}

function lsGetSize(): number {
    try {
        return parseInt(localStorage.getItem(LS_SIZE_KEY) ?? "0", 10) || 0;
    } catch {
        return 0;
    }
}

function lsGc(): void {
    try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(LS_CACHE_PREFIX)) keys.push(k);
        }
        for (const k of keys) localStorage.removeItem(k);
        localStorage.setItem(LS_SIZE_KEY, "0");
    } catch {
        // ignore
    }
}

function lsSet(key: string, value: any): void {
    try {
        const serialized = JSON.stringify(value);
        const entryBytes = (key.length + serialized.length) * 2;
        if (lsGetSize() + entryBytes > LS_MAX_BYTES) {
            lsGc();
        }
        localStorage.setItem(key, serialized);
        localStorage.setItem(LS_SIZE_KEY, String(lsGetSize() + entryBytes));
    } catch {
        // Storage full or unavailable — silently ignore
    }
}

/** Gets the name/ID for LLM models. */
export function getModelIdsAndNames(data: DataFormat): { id: string; name: string }[] {
    return Object.entries(data.models)
        .map(([modelId, modelData]) => ({
            id: modelId,
            name: modelData.cleanName,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/** Gets the name/ID for image generation models. */
export function getImageModelIdsAndNames(data: DataFormat): { id: string; name: string }[] {
    return Object.entries(data.imageModels || {})
        .map(([modelId, modelData]) => ({
            id: modelId,
            name: modelData.cleanName,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/** Returns the subset of vendors that have at least one image generation model. */
export function getImageVendors(data: DataFormat): Record<string, (typeof data.vendors)[string]> {
    const vendorRefs = new Set<string>();
    for (const model of Object.values(data.imageModels || {})) {
        for (const v of model.vendors) {
            vendorRefs.add(v.vendorRef);
        }
    }
    const filtered: Record<string, (typeof data.vendors)[string]> = {};
    for (const ref of vendorRefs) {
        if (data.vendors[ref]) {
            filtered[ref] = data.vendors[ref];
        }
    }
    return filtered;
}

let loadedDataPromise: Promise<Uint8Array<ArrayBuffer>> | null = null;
let dbHashPromise: Promise<string> | null = null;

async function loadDataDbHash(): Promise<string> {
    if (!dbHashPromise) {
        dbHashPromise = loadDataDb().then(hashBytes);
    }
    return dbHashPromise;
}

async function loadDataDb(): Promise<Uint8Array<ArrayBuffer>> {
    if (loadedDataPromise) {
        return loadedDataPromise;
    }

    loadedDataPromise = fetch(`${import.meta.env.PUBLIC_BASE_PATH ?? ""}/data.db`).then(
        async (res) => {
            if (!res.ok) {
                throw new Error(`Failed to load data.db: ${res.status} ${res.statusText}`);
            }
            const arrayBuffer = await res.arrayBuffer();
            return new Uint8Array(arrayBuffer);
        }
    );

    return loadedDataPromise;
}

function asyncIfWindow<T>(fn: () => Promise<T>): Promise<T> {
    if (typeof window !== "undefined") {
        return fn();
    }
    return Promise.resolve(null as T);
}

const poolPromise = asyncIfWindow(async () =>
    createSQLWorker<Init, Payload, PayloadResult>(
        () => new Worker(new URL("./sql/worker.ts", import.meta.url), { type: "module" }),
        await loadDataDb()
    )
);

const queryCache = new Map<string, Map<string, { [column: string]: any }>>();

/** Loads a single row. Pass `cache: true` to persist results in localStorage across page loads. */
export async function loadSingleRow(
    query: string,
    modelId: string,
    options?: { cache?: boolean }
): Promise<{ [column: string]: any } | null> {
    let modelCache = queryCache.get(query);
    let modelCacheRes = modelCache?.get(modelId) as { [column: string]: any } | undefined | null;
    if (modelCacheRes) {
        return modelCacheRes;
    }

    if (options?.cache) {
        const dbHash = await loadDataDbHash();
        const lsKey = LS_CACHE_PREFIX + dbHash + ":" + hashStr(query) + ":" + modelId;
        const cached = lsGet(lsKey);
        if (cached !== undefined) {
            if (!modelCache) {
                modelCache = new Map<string, { [column: string]: any }>();
                queryCache.set(query, modelCache);
            }
            modelCache.set(modelId, cached);
            return cached;
        }
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

        if (options?.cache) {
            const dbHash = await loadDataDbHash();
            const lsKey = LS_CACHE_PREFIX + dbHash + ":" + hashStr(query) + ":" + modelId;
            lsSet(lsKey, res);
        }
    }

    return res;
}

/** Loads multiple rows. */
export async function loadMultipleRows(
    query: string,
    args?: any[]
): Promise<{ [column: string]: any }[]> {
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
