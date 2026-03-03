import type { DataFormat, Model, ImageModel } from "@/src/dataFormat";
import dataJson from "../../public/data.json";

const data = dataJson as unknown as DataFormat;

export const BASE_URL = import.meta.env.PUBLIC_BASE_URL || "https://www.vantage.sh";

/**
 * Convert company name to URL-friendly slug
 * e.g., "Stability AI" -> "stability-ai"
 */
export function slugifyCompany(company: string): string {
    return company
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}

/**
 * Convert slug back to company name by finding matching company
 */
export function unslugifyCompany(slug: string, companies: string[]): string | undefined {
    return companies.find((company) => slugifyCompany(company) === slug);
}

/**
 * Get unique LLM companies with their slugs
 */
export function getLLMCompanies(): { company: string; slug: string }[] {
    const companies = new Set<string>();
    for (const model of Object.values(data.models)) {
        companies.add(model.company);
    }
    return Array.from(companies)
        .sort()
        .map((company) => ({ company, slug: slugifyCompany(company) }));
}

/**
 * Get unique image model companies with their slugs
 */
export function getImageModelCompanies(): { company: string; slug: string }[] {
    const companies = new Set<string>();
    for (const model of Object.values(data.imageModels)) {
        companies.add(model.company);
    }
    return Array.from(companies)
        .sort()
        .map((company) => ({ company, slug: slugifyCompany(company) }));
}

/**
 * Get all LLM models for a specific company
 */
export function getModelsByCompany(company: string): [string, Model][] {
    return Object.entries(data.models).filter(([_, model]) => model.company === company);
}

/**
 * Get all image models for a specific company
 */
export function getImageModelsByCompany(company: string): [string, ImageModel][] {
    return Object.entries(data.imageModels).filter(([_, model]) => model.company === company);
}

/**
 * Format token price as per-million tokens
 * e.g., 0.000001 -> "$1.00"
 */
export function formatPrice(pricePerToken: number | null): string {
    if (pricePerToken === null) {
        return "N/A";
    }
    const pricePerMillion = pricePerToken * 1_000_000;
    return `$${pricePerMillion.toFixed(2)}`;
}

/**
 * Format image price per image
 */
export function formatImagePrice(pricePerImage: number): string {
    return `$${pricePerImage.toFixed(4)}`;
}

/**
 * Get vendor clean name from vendor ref
 */
export function getVendorName(vendorRef: string): string {
    const vendor = data.vendors[vendorRef];
    return vendor?.cleanName || vendorRef;
}

/**
 * Get region clean name from vendor and region code
 */
export function getRegionName(vendorRef: string, regionCode: string): string {
    const vendor = data.vendors[vendorRef];
    if (!vendor) return regionCode;

    // Try empty category first (most common)
    const regionName = vendor.regionCleanNames[""]?.[regionCode];
    if (regionName) return regionName;

    // Search all categories
    for (const category of Object.values(vendor.regionCleanNames)) {
        if (category[regionCode]) {
            return category[regionCode];
        }
    }
    return regionCode;
}

export { data };
