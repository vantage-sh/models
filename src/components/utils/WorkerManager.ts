function flatPromise<T>(): [(value: T) => void, (reason?: any) => void, Promise<T>] {
    let resolve: (value: T) => void;
    let reject: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return [(x) => resolve!(x), (x) => reject!(x), promise];
}

class IndividualWorker<InitArg, Payload, ExpectedResult> {
    private worker: Worker | null = null;
    private initDone = false;
    private runners: [
        Payload,
        (value: ExpectedResult) => void,
        (reason?: any) => void,
    ][] = [];

    constructor(private workerGenerator: () => Worker) {}

    private async processRunners(worker: Worker) {
        const oldRunners = this.runners;
        this.runners = [];

        await new Promise<void>((baseResolve, baseReject) => {
            const payloads = oldRunners.map(([payload]) => payload);
            worker.onerror = (error) => {
                for (const [,, reject] of oldRunners) {
                    reject(error);
                }
                baseReject(error);
            };
            worker.onmessage = (event) => {
                const allResults = event.data as ExpectedResult[];
                for (let i = 0; i < oldRunners.length; i++) {
                    const [, resolve] = oldRunners[i];
                    resolve(allResults[i]);
                }
                baseResolve();
            };
            worker.postMessage(payloads);
        });

        if (this.runners.length > 0) {
            await this.processRunners(worker);
        }
    }

    async execute(payload: Payload): Promise<ExpectedResult> {
        if (!this.initDone) {
            throw new Error("Not initialised");
        }

        const [resolve, reject, promise] = flatPromise<ExpectedResult>();
        this.runners.push([payload, resolve, reject]);

        if (!this.worker) {
            return promise;
        }
        const worker = this.worker;
        this.worker = null;

        await new Promise((resolve) => setTimeout(resolve, 1));
        try {
            await this.processRunners(worker);
        } finally {
            this.worker = worker;
        }

        return promise;
    }

    async initialise(arg: InitArg) {
        if (this.initDone) {
            throw new Error("Initialise already called");
        }
        this.initDone = true;

        const worker = this.workerGenerator();
        const rp = new Promise<void>((resolve, reject) => {
            worker.onmessage = () => {
                resolve();
            };
            worker.onerror = (error) => {
                reject(error);
            };
            worker.postMessage(arg);
        });
        try {
            await rp;
            this.worker = worker;
        } catch (e) {
            worker.terminate();
            throw e;
        } finally {
            worker.onerror = null;
            worker.onmessage = null;
        }
    }
}

export async function createSQLWorker<InitArg, Payload, ExpectedResult>(
    workerGenerator: () => Worker,
    initArg: InitArg,
) {
    const worker = new IndividualWorker<InitArg, Payload, ExpectedResult>(workerGenerator);
    await worker.initialise(initArg);
    return (payload: Payload) => worker.execute(payload);
}

const _unset = Symbol("unset");

export function workerMessageHandler<InitArg, InitResult, Payload, ExpectedResult>(
    init: (arg: InitArg) => Promise<InitResult>,
    handlePayload: (initResult: InitResult, payload: Payload) => Promise<ExpectedResult>,
) {
    let initResult: any = _unset;

    return async (event: MessageEvent) => {
        if (initResult === _unset) {
            initResult = await init(event.data);
            postMessage(null);
            return;
        }

        const results = await Promise.all((event.data as Payload[]).map(async (payload) => {
            return handlePayload(initResult, payload);
        }));
        postMessage(results);
    };
}
