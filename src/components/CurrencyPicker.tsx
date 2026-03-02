import React from "react";
import { useStateItem } from "../state";
import forexData from "../forex.json";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/src/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type ForexEntry = { rate: number; name: string };

// Sort currencies with common ones first, then alphabetically
const PRIORITY_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"];

const allCurrencies = Object.entries(forexData as Record<string, ForexEntry>);

const priorityCurrencies = allCurrencies
    .filter(([code]) => PRIORITY_CURRENCIES.includes(code.toUpperCase()))
    .sort(([codeA], [codeB]) => {
        return (
            PRIORITY_CURRENCIES.indexOf(codeA.toUpperCase()) -
            PRIORITY_CURRENCIES.indexOf(codeB.toUpperCase())
        );
    });

const otherCurrencies = allCurrencies
    .filter(([code]) => !PRIORITY_CURRENCIES.includes(code.toUpperCase()))
    .sort(([codeA], [codeB]) => codeA.toUpperCase().localeCompare(codeB.toUpperCase()));

export default function CurrencyPicker({
    modelType,
    className,
}: {
    modelType: "llm" | "image";
    className?: string;
}) {
    const [currency, setCurrency] = useStateItem(
        "currency",
        modelType === "llm" ? "/" : "/image-models"
    );
    const [open, setOpen] = React.useState(false);

    const selectedCurrency = allCurrencies.find(([code]) => code === currency);
    const displayValue = selectedCurrency
        ? `${selectedCurrency[0].toUpperCase()} - ${selectedCurrency[1].name}`
        : "Select currency...";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs hover:font-semibold",
                        className ?? "w-[200px]"
                    )}
                >
                    <span className="truncate">{displayValue}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="end">
                <Command>
                    <CommandInput placeholder="Search currency..." />
                    <CommandList>
                        <CommandEmpty>No currency found.</CommandEmpty>
                        <CommandGroup heading="Popular">
                            {priorityCurrencies.map(([code, info]) => (
                                <CommandItem
                                    key={code}
                                    value={`${code} ${info.name}`}
                                    onSelect={() => {
                                        setCurrency(code);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            currency === code ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {code.toUpperCase()} - {info.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandGroup heading="All Currencies">
                            {otherCurrencies.map(([code, info]) => (
                                <CommandItem
                                    key={code}
                                    value={`${code} ${info.name}`}
                                    onSelect={() => {
                                        setCurrency(code);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            currency === code ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {code.toUpperCase()} - {info.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
