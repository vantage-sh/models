import { workerMessageHandler } from "../components/utils/WorkerManager";
import initSqlJs, { type Database, type Statement } from "sql.js";
import sqlWasm from "sql.js/dist/sql-wasm.wasm?url";

export type Init = Uint8Array;
export type Payload = [0, string, string] | [1, string, any[]];
export type PayloadResult = [0, string] | [1, { [column: string]: any } | null] | [2, { [column: string]: any }[]];

const compilationCache = new Map<string, Statement>();

self.onmessage = workerMessageHandler(
    async (payload: Init) => {
        const SQL = await initSqlJs({
            locateFile: () => sqlWasm,
        });
        return new SQL.Database(payload);
    },
    async (db: Database, payload: Payload): Promise<PayloadResult> => {
        let query = compilationCache.get(payload[1]);
        if (query) {
            compilationCache.delete(payload[1]);
        } else {
            try {
                query = db.prepare(payload[1]);
            } catch (e) {
                return [0, (e as Error).message];
            }
        }

        try {
            if (payload[0] === 0) {
                query.bind([payload[2]]);
                while (query.step()) {
                    return [1, query.getAsObject()];
                }
                return [1, null];
            }
    
            query.bind(payload[2]);
            const res = [];
            while (query.step()) {
                res.push(query.getAsObject());
            }
            return [2, res];
        } catch (e) {
            return [0, (e as Error).message];
        } finally {
            query.reset();
            compilationCache.set(payload[1], query);
        }
    }
);
