import { PlusIcon } from "lucide-react";
import CurrencyPicker from "./CurrencyPicker";

export default function PortalRoot() {
    return (
        <>
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
