import React from "react";
import type { ColumnQuery } from "./components/Table";
import { defaultQueries, defaultImageQueries } from "./constants";

type ModelViewType = "llm" | "image";

type State = {
    currency: string;
    nameFilter: string;
    currentSorting: [number, string, boolean] | null;
    queries: ColumnQuery[];
    modelView: ModelViewType;
    imageQueries: ColumnQuery[];
};

const initialState: State = {
    currency: "USD",
    nameFilter: "",
    currentSorting: null,
    queries: defaultQueries.map(({ name, ...dq }) => ({
        ...dq,
        columnOrdering: {},
        columnFilters: {},
    })),
    modelView: "llm",
    imageQueries: defaultImageQueries.map(({ name, ...dq }) => ({
        ...dq,
        columnOrdering: {},
        columnFilters: {},
    })),
};

const currentState: State = { ...initialState };

try {
    const savedState = window?.localStorage ? window.localStorage.getItem("appState") : null;
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        currentState.currency = parsedState.currency || currentState.currency;
        currentState.queries = parsedState.queries || currentState.queries;
        currentState.currentSorting = parsedState.currentSorting || currentState.currentSorting;
        currentState.nameFilter = parsedState.nameFilter || currentState.nameFilter;
        currentState.modelView = parsedState.modelView || currentState.modelView;
        currentState.imageQueries = parsedState.imageQueries || currentState.imageQueries;
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

async function readFromRemoteStorage(): Promise<State | null> {
    // TODO: Implement remote storage reading
    return null;
}

readFromRemoteStorage().then((remoteState) => {
    if (remoteState) {
        currentState.currency = remoteState.currency;
        currentState.queries = remoteState.queries;
        currentState.nameFilter = remoteState.nameFilter;
    }
});

let listenerMap: Map<string, (() => void)[]> = new Map();

export function clearState() {
    currentState.currency = initialState.currency;
    currentState.queries = initialState.queries;
    currentState.currentSorting = null;
    currentState.nameFilter = "";
    currentState.modelView = initialState.modelView;
    currentState.imageQueries = initialState.imageQueries;
    window?.localStorage?.removeItem("appState");
    const oldListeners = listenerMap;
    clearTimeout(nextTimeout);
    nextTimeout = null;
    setUrlId(null);
    listenerMap = new Map();
    oldListeners.forEach((listeners) => {
        listeners.forEach((listener) => listener());
    });
}

export function useStateItem<Key extends keyof State>(key: Key): [State[Key], (newValue: State[Key]| ((prevValue: State[Key]) => State[Key])) => void] {
    const setter = React.useCallback((newValue: State[Key] | ((prevValue: State[Key]) => State[Key])) => {
        if (typeof newValue === "function") {
            newValue = newValue(currentState[key]);
            currentState[key] = newValue;
        }  else {
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
    }, [key]);

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
    );

    return [getter, setter];
}
