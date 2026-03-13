import React from "react";

const _empty = Symbol("empty");

export default function useOnChangeBetweenRenders<Item, CallbackValue>(
    item: Item,
    computeUniqueValue: (item: Item) => CallbackValue,
    cb: () => void,
    runOnInitialRender: boolean
) {
    const valueRef = React.useRef<CallbackValue | typeof _empty>(_empty);

    const new_ = computeUniqueValue(item);

    if (valueRef.current === _empty) {
        if (runOnInitialRender) cb();
        valueRef.current = new_;
        return;
    }

    if (valueRef.current !== new_) {
        cb();
        valueRef.current = new_;
    }
}
