import type { DataFormat, Model, ImageModel } from "@/src/dataFormat";
import dataJson from "../../public/data.json";

const data = dataJson as DataFormat;

export const BASE_URL =
    import.meta.env.PUBLIC_BASE_URL || "https://models.vantage.sh";

/**
 * Convert brand name to URL-friendly slug
 * e.g., "Stability AI" -> "stability-ai"
 */
export function slugifyBrand(brand: string): string {
    return brand
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}

/**
 * Convert slug back to brand name by finding matching brand
 */
export function unslugifyBrand(
    slug: string,
    brands: string[]
): string | undefined {
    return brands.find((brand) => slugifyBrand(brand) === slug);
}

/**
 * Get unique LLM brands with their slugs
 */
export function getLLMBrands(): { brand: string; slug: string }[] {
    const brands = new Set<string>();
    for (const model of Object.values(data.models)) {
        brands.add(model.brand);
    }
    return Array.from(brands)
        .sort()
        .map((brand) => ({ brand, slug: slugifyBrand(brand) }));
}

/**
 * Get unique image model brands with their slugs
 */
export function getImageModelBrands(): { brand: string; slug: string }[] {
    const brands = new Set<string>();
    for (const model of Object.values(data.imageModels)) {
        brands.add(model.brand);
    }
    return Array.from(brands)
        .sort()
        .map((brand) => ({ brand, slug: slugifyBrand(brand) }));
}

/**
 * Get all LLM models for a specific brand
 */
export function getModelsByBrand(brand: string): [string, Model][] {
    return Object.entries(data.models).filter(
        ([_, model]) => model.brand === brand
    );
}

/**
 * Get all image models for a specific brand
 */
export function getImageModelsByBrand(brand: string): [string, ImageModel][] {
    return Object.entries(data.imageModels).filter(
        ([_, model]) => model.brand === brand
    );
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
