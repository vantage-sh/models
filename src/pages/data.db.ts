import SQLite3 from "better-sqlite3";
import data from "../data";
import type { APIRoute } from "astro";
import schema from "../sql/schema";
import { tmpdir } from "node:os";
import { readFileSync, rmSync } from "node:fs";

export const prerender = true;

// For development, but doesn't break production since it builds once there.
const bufCache: Map<any, Buffer<ArrayBuffer>> = new Map();

export const GET: APIRoute = () => {
    // Check the cache first
    const cachedValue = bufCache.get(data);
    if (cachedValue) {
        return new Response(cachedValue, {
            status: 200,
            headers: {
                "Content-Type": "application/octet-stream",
            },
        });
    }

    // Create the tables
    const tmpFile = tmpdir() + "/data.db";
    const db = new SQLite3(tmpFile);

    try {
        db.exec(schema);

        // Add the vendors
        const vendorsPrep = db.prepare("INSERT INTO vendors (vendor_id, clean_name, learn_more_url, eu_or_uk_regions) VALUES (?, ?, ?, ?)");
        const vendorRegionsPrep = db.prepare("INSERT INTO vendor_regions (vendor_id, region_code, category, region_name) VALUES (?, ?, ?, ?)");
        for (const [vendorId, vendorData] of Object.entries(data.vendors)) {
            vendorsPrep.run([vendorId, vendorData.cleanName, vendorData.learnMoreUrl, JSON.stringify(vendorData.euOrUKRegions)]);
            for (const [categoryOrEmpty, regions] of Object.entries(vendorData.regionCleanNames)) {
                const category = categoryOrEmpty === "" ? null : categoryOrEmpty;
                for (const [regionCode, regionName] of Object.entries(regions)) {
                    vendorRegionsPrep.run([vendorId, regionCode, category, regionName]);
                }
            }
        }

        // Add the models
        const modelsPrep = db.prepare("INSERT INTO models (model_id, clean_name, brand, company_country_code, selfhostable, reasoning, humanitys_last_exam_percentage, swe_bench_resolved_percentage, skatebench_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        const modelsTokenisersPrep = db.prepare("INSERT INTO models_tokenisers (model_id, tokeniser, url) VALUES (?, ?, ?)");
        const modelsVendorsPrep = db.prepare("INSERT INTO models_vendors (model_id, vendor_id, latency_ms, tokens_per_second, low_capacity) VALUES (?, ?, ?, ?, ?)");
        const modelsVendorsRegionsPrep = db.prepare("INSERT INTO models_vendors_regions (model_id, vendor_id, region_code, input_token_cost, output_token_cost, cached_input_token_cost, cached_output_token_cost) VALUES (?, ?, ?, ?, ?, ?, ?)");
        for (const [modelId, modelData] of Object.entries(data.models)) {
            modelsPrep.run([
                modelId,
                modelData.cleanName,
                modelData.brand,
                modelData.companyCountryCode,
                modelData.selfhostable ? 1 : 0,
                modelData.reasoning ? 1 : 0,
                modelData.humanitysLastExamPercentage ?? null,
                modelData.sweBenchResolvedPercentage ?? null,
                modelData.skatebenchScore ?? null,
            ]);
            switch (modelData.tokeniser?.type) {
                case undefined:
                    break;
                case "site-api":
                    modelsTokenisersPrep.run([modelId, "site-api", modelData.tokeniser.apiUrl]);
                    break;
                case "tiktoken":
                    modelsTokenisersPrep.run([modelId, "tiktoken", modelData.tokeniser.bpePath]);
                    break;
                case "transformers":
                    modelsTokenisersPrep.run([modelId, "transformers", modelData.tokeniser.pretrainedPath]);
                    break;
                default:
                    throw new Error(`Unknown tokeniser type: ${modelData.tokeniser}`);
            }
            for (const vendor of modelData.vendors) {
                modelsVendorsPrep.run([
                    modelId,
                    vendor.vendorRef,
                    vendor.latencyMs || null,
                    vendor.tokensPerSecond || null,
                    vendor.lowCapacity ? 1 : 0,
                ]);
                for (const [regionCode, [inputTokenCost, outputTokenCost, cachedInputTokenCost, cachedOutputTokenCost]] of Object.entries(vendor.regionPricing)) {
                    modelsVendorsRegionsPrep.run([
                        modelId,
                        vendor.vendorRef,
                        regionCode,
                        inputTokenCost,
                        outputTokenCost,
                        cachedInputTokenCost,
                        cachedOutputTokenCost,
                    ]);
                }
            }
        }

        // Add the image models
        const imageModelsPrep = db.prepare("INSERT INTO image_models (model_id, clean_name, brand, company_country_code, selfhostable, supports_negative_prompts) VALUES (?, ?, ?, ?, ?, ?)");
        const imageModelsResolutionsPrep = db.prepare("INSERT INTO image_models_resolutions (model_id, resolution) VALUES (?, ?)");
        const imageModelsVendorsPrep = db.prepare("INSERT INTO image_models_vendors (model_id, vendor_id, latency_ms, low_capacity) VALUES (?, ?, ?, ?)");
        const imageModelsVendorsPricingPrep = db.prepare("INSERT INTO image_models_vendors_pricing (model_id, vendor_id, region_code, resolution, price_per_image, generation_speed_ms) VALUES (?, ?, ?, ?, ?, ?)");
        for (const [modelId, modelData] of Object.entries(data.imageModels || {})) {
            imageModelsPrep.run([
                modelId,
                modelData.cleanName,
                modelData.brand,
                modelData.companyCountryCode,
                modelData.selfhostable ? 1 : 0,
                modelData.supportsNegativePrompts ? 1 : 0,
            ]);
            for (const resolution of modelData.supportedResolutions) {
                imageModelsResolutionsPrep.run([modelId, resolution]);
            }
            for (const vendor of modelData.vendors) {
                imageModelsVendorsPrep.run([
                    modelId,
                    vendor.vendorRef,
                    vendor.latencyMs || null,
                    vendor.lowCapacity ? 1 : 0,
                ]);
                for (const [regionCode, pricingTiers] of Object.entries(vendor.regionPricing)) {
                    for (const tier of pricingTiers) {
                        imageModelsVendorsPricingPrep.run([
                            modelId,
                            vendor.vendorRef,
                            regionCode,
                            tier.resolution,
                            tier.pricePerImage,
                            tier.generationSpeedMs ?? null,
                        ]);
                    }
                }
            }
        }

        // Return the database as a buffer
        db.close();
        const buffer = readFileSync(tmpFile);
        bufCache.set(data, buffer);
        return new Response(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/octet-stream",
            },
        });
    } finally {
        db.close();
        rmSync(tmpFile);
    }
};
