export default `CREATE TABLE vendors (
    vendor_id TEXT PRIMARY KEY,
    clean_name TEXT NOT NULL,
    learn_more_url TEXT,
    eu_or_uk_regions JSON NOT NULL,
    usa_regions JSON NOT NULL
);

CREATE TABLE vendor_regions (
    vendor_id TEXT NOT NULL,
    region_code TEXT,
    category TEXT,
    region_name TEXT NOT NULL,
    PRIMARY KEY (vendor_id, region_code)
);

CREATE INDEX idx_vendor_regions_vendor_id ON vendor_regions (vendor_id);

CREATE TABLE models (
    model_id TEXT PRIMARY KEY,
    clean_name TEXT NOT NULL,
    company TEXT NOT NULL,
    company_country_code TEXT NOT NULL,
    selfhostable BOOLEAN NOT NULL,
    reasoning BOOLEAN NOT NULL,
    reasoning_tier TEXT,
    max_input_tokens INTEGER,
    max_output_tokens INTEGER,
    training_cutoff TEXT,
    release_date TEXT,
    humanitys_last_exam_percentage REAL,
    swe_bench_resolved_percentage REAL,
    skatebench_score REAL
);

CREATE TABLE models_tokenizers (
    model_id TEXT PRIMARY KEY,
    tokenizer TEXT NOT NULL,
    url TEXT NOT NULL,
    FOREIGN KEY (model_id) REFERENCES models(model_id)
);

CREATE TABLE models_vendors (
    model_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    latency_ms INTEGER,
    tokens_per_second INTEGER,
    low_capacity BOOLEAN NOT NULL,
    PRIMARY KEY (model_id, vendor_id)
);

CREATE INDEX idx_models_vendors_model_id ON models_vendors (model_id);

CREATE TABLE models_vendors_regions (
    model_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    region_code TEXT NOT NULL,
    input_token_cost REAL NOT NULL,
    output_token_cost REAL NOT NULL,
    cached_input_token_cost REAL,
    cached_output_token_cost REAL,
    FOREIGN KEY (model_id) REFERENCES models(model_id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    PRIMARY KEY (model_id, vendor_id, region_code)
);

CREATE INDEX idx_models_vendors_regions_model_id ON models_vendors_regions (model_id);

-- Image generation models
CREATE TABLE image_models (
    model_id TEXT PRIMARY KEY,
    clean_name TEXT NOT NULL,
    company TEXT NOT NULL,
    company_country_code TEXT NOT NULL,
    selfhostable BOOLEAN NOT NULL,
    supports_negative_prompts BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE image_models_resolutions (
    model_id TEXT NOT NULL,
    resolution TEXT NOT NULL,
    PRIMARY KEY (model_id, resolution),
    FOREIGN KEY (model_id) REFERENCES image_models(model_id)
);

CREATE INDEX idx_image_models_resolutions_model_id ON image_models_resolutions (model_id);

CREATE TABLE image_models_vendors (
    model_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    latency_ms INTEGER,
    low_capacity BOOLEAN NOT NULL DEFAULT 0,
    price_source TEXT NOT NULL DEFAULT 'scraped',
    price_verified_at TEXT,
    PRIMARY KEY (model_id, vendor_id),
    FOREIGN KEY (model_id) REFERENCES image_models(model_id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
);

CREATE INDEX idx_image_models_vendors_model_id ON image_models_vendors (model_id);

CREATE TABLE image_models_vendors_pricing (
    model_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    region_code TEXT NOT NULL,
    resolution TEXT NOT NULL,
    price_per_image REAL NOT NULL,
    generation_speed_ms INTEGER,
    PRIMARY KEY (model_id, vendor_id, region_code, resolution),
    FOREIGN KEY (model_id) REFERENCES image_models(model_id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
);

CREATE INDEX idx_image_models_vendors_pricing_model_id ON image_models_vendors_pricing (model_id);
`;
