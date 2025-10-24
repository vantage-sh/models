import type { DataFormat } from "./dataFormat";

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

/** Gets the name/ID for a model. */
export function getModelIdsAndNames(data: DataFormat): {id: string; name: string }[] {
    return Object.entries(data.models).map(([modelId, modelData]) => ({
        id: modelId,
        name: modelData.cleanName,
    })).sort((a, b) => a.name.localeCompare(b.name));
}

const queryCache = new Map<string, Map<string, {
    [column: string]: any;
} | null>>();
const workersPool: Worker[] = [];

async function loadWorker(): Promise<Worker> {
    const dataDb = await loadDataDb();
    const worker = new Worker(new URL("./sql/worker.ts", import.meta.url), { type: "module" });
    return new Promise((resolve, reject) => {
        worker.onmessage = () => {
            worker.onmessage = null;
            worker.onerror = null;
            resolve(worker);
        };

        worker.onerror = (error) => {
            worker.onmessage = null;
            worker.onerror = null;
            reject(error);
        };

        worker.postMessage(dataDb);
    });
}

async function initPool() {
    const numWorkers = navigator.hardwareConcurrency || 4;
    for (let i = 0; i < numWorkers; i++) {
        loadWorker().then((worker) => workersPool.push(worker));
    }
}

if (typeof window !== "undefined") {
    initPool();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForFreeWorker() {
    while (true) {
        const worker = workersPool.pop();
        if (worker) {
            return worker;
        }
        await sleep(2);
    }
}

/** Loads a single row. */
export async function loadSingleRow(query: string, modelId: string): Promise<{ [column: string]: any } | null> {
    let modelCache = queryCache.get(query);
    let modelCacheRes = modelCache?.get(modelId);
    if (modelCacheRes) {
        return modelCacheRes;
    }

    const worker = await waitForFreeWorker();
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("SQL query timed out"));
            worker.terminate();
            loadWorker().then((newWorker) => {
                workersPool.push(newWorker);
            });
        }, 1000);

        worker.onmessage = (event) => {
            worker.onmessage = null;
            worker.onerror = null;
            clearTimeout(timeout);
            const result = event.data as { [column: string]: any } | null;
            if (!modelCache) {
                modelCache = new Map<string, { [column: string]: any }>();
                queryCache.set(query, modelCache);
            }
            modelCache.set(modelId, result);
            resolve(result);
            workersPool.push(worker);
        };

        worker.onerror = (error) => {
            worker.onmessage = null;
            worker.onerror = null;
            clearTimeout(timeout);
            reject(error);
            worker.terminate();
            loadWorker().then((newWorker) => {
                workersPool.push(newWorker);
            });
        };

        worker.postMessage([0, query, modelId]);
    });
}

/** Loads multiple rows. */
export async function loadMultipleRows(query: string): Promise<{ [column: string]: any }[]> {
    const worker = await waitForFreeWorker();
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("SQL query timed out"));
            worker.terminate();
            loadWorker().then((newWorker) => {
                workersPool.push(newWorker);
            });
        }, 1000);

        worker.onmessage = (event) => {
            worker.onmessage = null;
            worker.onerror = null;
            clearTimeout(timeout);
            const result = event.data as { [column: string]: any }[];
            resolve(result);
            workersPool.push(worker);
        };
        
        worker.onerror = (error) => {
            worker.onmessage = null;
            worker.onerror = null;
            clearTimeout(timeout);
            reject(error);
            worker.terminate();
            loadWorker().then((newWorker) => {
                workersPool.push(newWorker);
            });
        };

        worker.postMessage([1, query]);
    });
}
