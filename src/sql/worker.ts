import sqlWasm from "sql.js/dist/sql-wasm.wasm?url";
import initSqlJs, { type Database, type Statement } from "sql.js";

let sqlite3Db: Database | null = null;

const compilationCache = new Map<string, Statement>();

self.onmessage = async (event) => {
    if (!sqlite3Db) {
        const SQL = await initSqlJs({
            locateFile: () => sqlWasm,
        });
        sqlite3Db = new SQL.Database(event.data);
        self.postMessage(null);
        return;
    }

    const [id, query, param] = event.data;
    if (id === 0) {
        let prep = compilationCache.get(query);
        if (!prep) {
            prep = sqlite3Db.prepare(query);
            compilationCache.set(query, prep);
        }
        prep.bind([param]);
        while (prep.step()) {
            const row = prep.getAsObject();
            self.postMessage(row);
            prep.reset();
            return;
        }
        prep.reset();
        self.postMessage(null);
        return;
    }

    let prep = compilationCache.get(query);
    if (!prep) {
        prep = sqlite3Db.prepare(query);
        compilationCache.set(query, prep);
    }
    prep.bind(param);
    const res = [];
    while (prep.step()) {
        res.push(prep.getAsObject());
    }
    prep.reset();
    self.postMessage(res);
};
