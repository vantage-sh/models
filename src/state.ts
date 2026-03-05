import React from "react";
import type { ColumnQuery } from "./components/Table";
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

const initialLlmState: State = {
    currency: "USD",
    nameFilter: "",
    currentSorting: null,
    queries: initialQueries,
};

const currentLlmState: State = JSON.parse(JSON.stringify(initialLlmState));

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
const currentImageState: State = JSON.parse(JSON.stringify(initialImageState));

try {
    const savedState = window?.localStorage ? window.localStorage.getItem("appState_llms") : null;
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        currentLlmState.currency = parsedState.currency || currentLlmState.currency;
        currentLlmState.queries = parsedState.queries || currentLlmState.queries;
        currentLlmState.currentSorting =
            parsedState.currentSorting || currentLlmState.currentSorting;
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

const END_IS_IMAGE_PATH = /\/image-gen\/?$/;

async function writeToRemoteStorage(state: State) {
    const u = new URL(window.location.href);
    const type_ = END_IS_IMAGE_PATH.test(u.pathname) ? "image" : "llm";
    const res = await fetch("https://modelskv.vantage-api.com/", {
        method: "POST",
        body: JSON.stringify({
            t: type_,
            state: state,
        }),
    });
    if (!res.ok) {
        console.error(
            `Failed to write to remote storage: ${res.status} ${res.statusText} ${await res.text()}`
        );
    }
    u.searchParams.set("id", await res.text());
    window.history.replaceState({}, "", u.toString());
}

async function readFromRemoteStorage(): Promise<{
    t: "llm" | "image";
    state: State;
} | null> {
    const u = new URL(window.location.href);
    const id = u.searchParams.get("id");
    if (!id) {
        return null;
    }
    const res = await fetch(`https://modelskv.vantage-api.com/${encodeURIComponent(id)}`);
    if (!res.ok) {
        console.error(
            `Failed to read from remote storage: ${res.status} ${res.statusText} ${await res.text()}`
        );
        return null;
    }
    return res.json();
}

if (typeof window !== "undefined") {
    readFromRemoteStorage().then((remoteState) => {
        if (remoteState) {
            const o = remoteState.t === "llm" ? currentLlmState : currentImageState;
            o.currency = remoteState.state.currency;
            o.queries = remoteState.state.queries;
            o.nameFilter = remoteState.state.nameFilter || o.nameFilter;
            o.currentSorting = remoteState.state.currentSorting || o.currentSorting;
            listenerMap.forEach((listeners) => {
                listeners.forEach((listener) => listener());
            });
        }
    });
}

let listenerMap: Map<string, (() => void)[]> = new Map();

export function clearState() {
    const u = new URL(window.location.href);
    const isLlm = !END_IS_IMAGE_PATH.test(u.pathname);
    const o = isLlm ? currentLlmState : currentImageState;
    o.currency = JSON.parse(
        JSON.stringify(isLlm ? initialLlmState.currency : initialImageState.currency)
    );
    o.queries = JSON.parse(
        JSON.stringify(isLlm ? initialLlmState.queries : initialImageState.queries)
    );
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
    key: Key,
    path: string
): [State[Key], (newValue: State[Key] | ((prevValue: State[Key]) => State[Key])) => void] {
    const isLlm = !END_IS_IMAGE_PATH.test(path);
    const currentState = isLlm ? currentLlmState : currentImageState;
    const initialState = isLlm ? initialLlmState : initialImageState;

    const setter = React.useCallback(
        (newValue: State[Key] | ((prevValue: State[Key]) => State[Key])) => {
            if (typeof newValue === "function") {
                newValue = newValue(currentState[key]);
                currentState[key] = newValue;
            } else {
                currentState[key] = newValue;
            }
            window?.localStorage?.setItem(`appState_${isLlm ? "llms" : "images"}`, JSON.stringify(currentState));
            doDebounce(() => {
                writeToRemoteStorage(currentState);
            }, 500);
            const listeners = listenerMap.get(key);
            if (listeners) {
                listeners.forEach((listener) => listener());
            }
        },
        [key, isLlm]
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
        () => currentState[key],
        () => initialState[key]
    );

    return [getter, setter];
}
