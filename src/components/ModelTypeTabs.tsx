export default function ModelTypeTabs({ isLlm }: { isLlm: boolean }) {
    return (
        <div className="flex gap-1 bg-[#5a38b8] rounded-md p-1">
            <a
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors text-white text-center w-full flex items-center justify-center ${
                    isLlm
                        ? "bg-white dark:bg-gray-800 text-[#6742d6] dark:text-purple-300"
                        : "text-white/80 hover:text-white hover:bg-[#7a52e6]"
                }`}
                href={import.meta.env.PUBLIC_BASE_PATH ?? "/"}
            >
                LLM
            </a>
            <a
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors text-white text-center ${
                    !isLlm
                        ? "bg-white dark:bg-gray-800 text-[#6742d6] dark:text-purple-300"
                        : "text-white/80 hover:text-white hover:bg-[#7a52e6]"
                }`}
                href={`${import.meta.env.PUBLIC_BASE_PATH ?? ""}/image-gen`}
            >
                Image Gen
            </a>
        </div>
    );
}
