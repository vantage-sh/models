import React from "react";
import type { ColumnDataType, ColumnQuery } from "./components/Table";
import { defaultQueries, defaultImageQueries } from "./constants";

type State = {
    currency: string;
    nameFilter: string;
    currentSorting: [number, string, boolean] | null;
    queries: ColumnQuery[];
};

const initialQueries = defaultQueries.map(({ name, ...dq }) => ({
    ...dq,
    columnOrdering: {},
    columnFilters: {},
}));

initialQueries.push({
    columnOrdering: {},
    columnFilters: {},
    columnExplicitlySetDataTypes: {
        "Average Cost per 1K Input Tokens": "currency" as ColumnDataType,
    },
    query: `SELECT AVG(input_token_cost * 1000) AS \`Average Cost per 1K Input Tokens\`
    FROM models_vendors_regions
    WHERE model_id = ?`,
});

initialQueries.push({
    columnOrdering: {},
    columnFilters: {},
    columnExplicitlySetDataTypes: {
        "Average Cost per 1K Output Tokens": "currency" as ColumnDataType,
    },
    query: `SELECT AVG(output_token_cost * 1000) AS \`Average Cost per 1K Output Tokens\`
    FROM models_vendors_regions
    WHERE model_id = ?`,
});

const initialLlmState: State = {
    currency: "USD",
    nameFilter: "",
    currentSorting: null,
    queries: initialQueries,
};

const currentLlmState: State = { ...initialLlmState };

const initialImageState: State = {
    currency: "USD",
    nameFilter: "",
    currentSorting: null,
    queries: defaultImageQueries.map(({ name, ...dq }) => ({
        ...dq,
        columnOrdering: {},
        columnFilters: {},
    })),
};
const currentImageState: State = { ...initialImageState };

try {
    const savedState = window?.localStorage ? window.localStorage.getItem("appState_llms") : null;
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        currentLlmState.currency = parsedState.currency || currentLlmState.currency;
        currentLlmState.queries = parsedState.queries || currentLlmState.queries;
        currentLlmState.currentSorting = parsedState.currentSorting || currentLlmState.currentSorting;
        currentLlmState.nameFilter = parsedState.nameFilter || currentLlmState.nameFilter;
    }
} catch {
    // Ignore errors
}

let nextTimeout: any = null;

function doDebounce(fn: () => void, delay: number) {
    if (nextTimeout) {
        clearTimeout(nextTimeout);
    }
    nextTimeout = setTimeout(() => {
        fn();
        nextTimeout = null;
    }, delay);
}

function setUrlId(id: string | null) {
    const url = new URL(window.location.href);
    if (id) {
        url.searchParams.set("id", id);
    } else {
        url.searchParams.delete("id");
    }
    window.history.replaceState({}, "", url.toString());
}

async function writeToRemoteStorage(state: State) {
    // TODO: Implement remote storage saving
}

async function readFromRemoteStorage(): Promise<{
    t: "llm" | "image";
    state: State;
} | null> {
    // TODO: Implement remote storage reading
    return null;
}

readFromRemoteStorage().then((remoteState) => {
    if (remoteState) {
        const o = remoteState.t === "llm" ? currentLlmState : currentImageState;
        o.currency = remoteState.state.currency;
        o.queries = remoteState.state.queries;
        o.nameFilter = remoteState.state.nameFilter;
    }
});

let listenerMap: Map<string, (() => void)[]> = new Map();

export function clearState() {
    const isLlm = window.location.pathname === "/";
    const o = isLlm ? currentLlmState : currentImageState;
    o.currency = isLlm ? initialLlmState.currency : initialImageState.currency;
    o.queries = isLlm ? initialLlmState.queries : initialImageState.queries;
    o.currentSorting = null;
    o.nameFilter = "";
    window?.localStorage?.removeItem(`appState_${isLlm ? "llms" : "images"}`);
    const oldListeners = listenerMap;
    clearTimeout(nextTimeout);
    nextTimeout = null;
    setUrlId(null);
    listenerMap = new Map();
    oldListeners.forEach((listeners) => {
        listeners.forEach((listener) => listener());
    });
}

export function useStateItem<Key extends keyof State>(
    key: Key
): [State[Key], (newValue: State[Key] | ((prevValue: State[Key]) => State[Key])) => void] {
    const isLlm = window.location.pathname === "/";
    const currentState = isLlm ? currentLlmState : currentImageState;

    const setter = React.useCallback(
        (newValue: State[Key] | ((prevValue: State[Key]) => State[Key])) => {
            if (typeof newValue === "function") {
                newValue = newValue(currentState[key]);
                currentState[key] = newValue;
            } else {
                currentState[key] = newValue;
            }
            window?.localStorage?.setItem("appState", JSON.stringify(currentState));
            doDebounce(() => {
                writeToRemoteStorage(currentState);
            }, 500);
            const listeners = listenerMap.get(key);
            if (listeners) {
                listeners.forEach((listener) => listener());
            }
        },
        [key]
    );

    const getter = React.useSyncExternalStore(
        (onStoreChange) => {
            let listeners = listenerMap.get(key);
            if (!listeners) {
                listeners = [];
                listenerMap.set(key, listeners);
            }
            listeners.push(onStoreChange);
            return () => {
                const listeners = listenerMap.get(key);
                if (listeners) {
                    const index = listeners.indexOf(onStoreChange);
                    if (index !== -1) {
                        listeners.splice(index, 1);
                    }
                }
            };
        },
        () => currentState[key]
    );

    return [getter, setter];
}
