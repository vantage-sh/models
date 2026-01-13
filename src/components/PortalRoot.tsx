import { PlusIcon } from "lucide-react";
import CurrencyPicker from "./CurrencyPicker";
import ModelTypeTabs from "./ModelTypeTabs";

export default function PortalRoot() {
    return (
        <>
            <ModelTypeTabs />
            <div className="w-px h-6 bg-white/30 mx-3" />
            <button onClick={() => {
                document.getElementById("add-button")?.click();
            }} className="mr-2 py-1 px-2 border border-gray-400 rounded cursor-pointer">
                <PlusIcon className="inline mr-1" size={16} />
                Add Query
            </button>
            <CurrencyPicker />
        </>
    );
}
