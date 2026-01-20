import type { ColumnDataType } from "./components/Table";

function singleValue(key: string, niceName: string, dataType?: ColumnDataType) {
    return {
        name: niceName,
        query: `SELECT ${key} AS \`${niceName}\` FROM models
    WHERE model_id = ?`,
        columnExplicitlySetDataTypes: dataType ? { [niceName]: dataType } : {},
    };
}

const llmVendors = {
    name: "Vendors",
    query: `SELECT GROUP_CONCAT(vendors.clean_name, ', ') AS \`Vendors\`
    FROM models_vendors
    JOIN vendors ON models_vendors.vendor_id = vendors.vendor_id
    WHERE models_vendors.model_id = ?`,
    columnExplicitlySetDataTypes: {},
}

export const defaultQueries = [
    singleValue("company", "Company"),
    llmVendors,
    singleValue("company_country_code", "Company Country Code", "country"),
    singleValue("selfhostable", "Self-hostable", "boolean"),
    singleValue("reasoning", "Supports Reasoning", "boolean"),
    singleValue("reasoning_tier", "Reasoning Tier"),
    singleValue("max_input_tokens", "Max Input Tokens"),
    singleValue("max_output_tokens", "Max Output Tokens"),
    singleValue("training_cutoff", "Training Cutoff"),
    singleValue("release_date", "Release Date"),
    singleValue("humanitys_last_exam_percentage", "Humanity's Last Exam %"),
    singleValue("swe_bench_resolved_percentage", "SWE-Bench Resolved %"),
    singleValue("skatebench_score", "SkateBench Score"),
];

// Image model default queries
function imageSingleValue(key: string, niceName: string, dataType?: ColumnDataType) {
    return {
        name: niceName,
        query: `SELECT ${key} AS \`${niceName}\` FROM image_models
    WHERE model_id = ?`,
        columnExplicitlySetDataTypes: dataType ? { [niceName]: dataType } : {},
    };
}

const imageVendors = {
    name: "Vendors",
    query: `SELECT GROUP_CONCAT(vendors.clean_name, ', ') AS \`Vendors\`
    FROM image_models_vendors
    JOIN vendors ON image_models_vendors.vendor_id = vendors.vendor_id
    WHERE image_models_vendors.model_id = ?`,
    columnExplicitlySetDataTypes: {},
};

export const defaultImageQueries = [
    imageSingleValue("company", "Company"),
    imageVendors,
    imageSingleValue("company_country_code", "Company Country Code", "country"),
    {
        name: "Resolutions",
        query: `SELECT GROUP_CONCAT(resolution, ', ') AS \`Resolutions\`
    FROM image_models_resolutions
    WHERE model_id = ?`,
        columnExplicitlySetDataTypes: {},
    },
    {
        name: "Price (1024x1024)",
        query: `SELECT price_per_image AS \`Price (1024x1024)\`
    FROM image_models_vendors_pricing
    WHERE model_id = ? AND resolution = '1024x1024'
    LIMIT 1`,
        columnExplicitlySetDataTypes: { "Price (1024x1024)": "currency" as ColumnDataType },
    },
    imageSingleValue("supports_negative_prompts", "Negative Prompts", "boolean"),
];
