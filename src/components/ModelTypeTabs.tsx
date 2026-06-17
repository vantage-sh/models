import { navigate } from "astro:transitions/client";
import React from "react";

const tabs: { path: string; label: string }[] = [
    { path: "/", label: "LLM" },
    { path: "/image-gen", label: "Image Gen" },
];

function usePath() {
    return React.useSyncExternalStore(
        (onStoreChange) => {
            window.addEventListener("popstate", onStoreChange);
            return () => window.removeEventListener("popstate", onStoreChange);
        },
        () => window.location.pathname,
        () => ""
    );
}

function removeTrailingSlash(path: string) {
    return path.replace(/\/$/, "");
}

export default function ModelTypeTabs() {
    const path = usePath();

    return (
        <div className="flex gap-1 bg-[#5a38b8] rounded-md p-1">
            {tabs.map((tab: { path: string; label: string }) => (
                <button
                    key={tab.path}
                    onClick={() => navigate(`${import.meta.env.PUBLIC_BASE_PATH ?? ""}${tab.path}`)}
                    className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                        removeTrailingSlash(path) ===
                        removeTrailingSlash(`${import.meta.env.PUBLIC_BASE_PATH ?? ""}${tab.path}`)
                            ? "bg-white dark:bg-gray-800 text-[#6742d6] dark:text-purple-300"
                            : "text-white/80 hover:text-white hover:bg-[#7a52e6]"
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
