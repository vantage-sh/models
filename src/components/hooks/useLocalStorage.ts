import React from "react";

export default function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = React.useState<T>(initialValue);

    React.useEffect(() => {
        const item = window.localStorage.getItem(key);
        if (item) {
            setStoredValue(JSON.parse(item));
        } else {
            window.localStorage.setItem(key, JSON.stringify(initialValue));
        }
    }, [key, initialValue]);

    const setValue = React.useCallback((value: T | ((prev: T) => T)) => {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
    }, [key]);

    return [storedValue, setValue];
}
