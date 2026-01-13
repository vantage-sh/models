import { useStateItem } from "../state";

type ModelViewType = "llm" | "image";

const tabs: { id: ModelViewType; label: string }[] = [
    { id: "llm", label: "LLM" },
    { id: "image", label: "Image Gen" },
];

export default function ModelTypeTabs() {
    const [modelView, setModelView] = useStateItem("modelView");

    return (
        <div className="flex gap-1 bg-[#5a38b8] rounded-md p-1">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setModelView(tab.id)}
                    className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                        modelView === tab.id
                            ? "bg-white text-[#6742d6]"
                            : "text-white/80 hover:text-white hover:bg-[#7a52e6]"
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
