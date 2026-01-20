import React from "react";
import { ChevronDownIcon } from "lucide-react";

export default function QueryHelp({ showParameterHelp = true }: { showParameterHelp?: boolean }) {
    return (
        <details className="mt-4 text-sm">
            <summary className="cursor-pointer select-none flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ChevronDownIcon className="w-4 h-4 transition-transform details-open:rotate-180" />
                <span>Query Help</span>
            </summary>
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                {showParameterHelp && (
                    <section className="mb-3">
                        <h4 className="font-semibold mb-1">How queries work</h4>
                        <p className="mb-2">
                            Your query runs once per row with{" "}
                            <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">?</code>{" "}
                            replaced by the model ID. Use{" "}
                            <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                                WHERE model_id = ?
                            </code>{" "}
                            to filter to the current row.
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Example:{" "}
                            <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                                SELECT company FROM models WHERE model_id = ?
                            </code>
                        </p>
                    </section>
                )}

                <section>
                    <h4 className="font-semibold mb-2">Available Tables</h4>

                    <div className="space-y-3">
                        <div>
                            <h5 className="font-medium text-gray-800 dark:text-gray-200">models</h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Core model information
                            </p>
                            <div className="text-xs grid grid-cols-2 gap-x-2">
                                <span>
                                    <code>model_id</code> (PK)
                                </span>
                                <span>
                                    <code>clean_name</code>
                                </span>
                                <span>
                                    <code>company</code>
                                </span>
                                <span>
                                    <code>company_country_code</code>
                                </span>
                                <span>
                                    <code>selfhostable</code>
                                </span>
                                <span>
                                    <code>reasoning</code>
                                </span>
                                <span>
                                    <code>humanitys_last_exam_percentage</code>
                                </span>
                                <span>
                                    <code>swe_bench_resolved_percentage</code>
                                </span>
                                <span>
                                    <code>skatebench_score</code>
                                </span>
                            </div>
                        </div>

                        <div>
                            <h5 className="font-medium text-gray-800 dark:text-gray-200">
                                vendors
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Cloud providers
                            </p>
                            <div className="text-xs grid grid-cols-2 gap-x-2">
                                <span>
                                    <code>vendor_id</code> (PK)
                                </span>
                                <span>
                                    <code>clean_name</code>
                                </span>
                                <span>
                                    <code>learn_more_url</code>
                                </span>
                                <span>
                                    <code>eu_or_uk_regions</code>
                                </span>
                            </div>
                        </div>

                        <div>
                            <h5 className="font-medium text-gray-800 dark:text-gray-200">
                                models_vendors
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Model availability per vendor
                            </p>
                            <div className="text-xs grid grid-cols-2 gap-x-2">
                                <span>
                                    <code>model_id</code>
                                </span>
                                <span>
                                    <code>vendor_id</code>
                                </span>
                                <span>
                                    <code>latency_ms</code>
                                </span>
                                <span>
                                    <code>tokens_per_second</code>
                                </span>
                                <span>
                                    <code>low_capacity</code>
                                </span>
                            </div>
                        </div>

                        <div>
                            <h5 className="font-medium text-gray-800 dark:text-gray-200">
                                models_vendors_regions
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Pricing per region
                            </p>
                            <div className="text-xs grid grid-cols-2 gap-x-2">
                                <span>
                                    <code>model_id</code>
                                </span>
                                <span>
                                    <code>vendor_id</code>
                                </span>
                                <span>
                                    <code>region_code</code>
                                </span>
                                <span>
                                    <code>input_token_cost</code>
                                </span>
                                <span>
                                    <code>output_token_cost</code>
                                </span>
                                <span>
                                    <code>cached_input_token_cost</code>
                                </span>
                                <span>
                                    <code>cached_output_token_cost</code>
                                </span>
                            </div>
                        </div>

                        <div>
                            <h5 className="font-medium text-gray-800 dark:text-gray-200">
                                models_tokenizers
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Tokenizer information
                            </p>
                            <div className="text-xs grid grid-cols-2 gap-x-2">
                                <span>
                                    <code>model_id</code> (PK)
                                </span>
                                <span>
                                    <code>tokenizer</code>
                                </span>
                                <span>
                                    <code>url</code>
                                </span>
                            </div>
                        </div>

                        <div>
                            <h5 className="font-medium text-gray-800 dark:text-gray-200">
                                vendor_regions
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Region details per vendor
                            </p>
                            <div className="text-xs grid grid-cols-2 gap-x-2">
                                <span>
                                    <code>vendor_id</code>
                                </span>
                                <span>
                                    <code>region_code</code>
                                </span>
                                <span>
                                    <code>category</code>
                                </span>
                                <span>
                                    <code>region_name</code>
                                </span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </details>
    );
}
