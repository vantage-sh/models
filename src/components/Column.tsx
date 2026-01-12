import React from "react";

export default function Column({
    initialWidth,
    updateWidth,
    columnType,
    children,
    className,
    colSpan,
}: {
    initialWidth: number;
    updateWidth: (newWidth: number) => void;
    columnType: "th" | "td";
    children: React.ReactNode;
    className?: string;
    colSpan?: number;
}) {
    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = initialWidth;

        function onMouseMove(e: MouseEvent) {
            const newWidth = startWidth + (e.clientX - startX);
            updateWidth(newWidth);
        }

        function onMouseUp() {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }, [initialWidth]);

    const Tag = columnType;
    return (
        new Array({ length: colSpan || 1 }).map((_, i) => (
            <Tag
                className={`${className} relative align-bottom`}
                style={{ width: initialWidth, minWidth: initialWidth }}
                key={i}
            >
                <div className="px-2 flex flex-col h-full">
                    {children}
                </div>
                <div 
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-gray-200 hover:opacity-50 transition-all duration-150" 
                    onMouseDown={handleMouseDown} 
                />
            </Tag>
        ))
    )
}
