-- ============================================================
-- PAKISTAN FLOOD MONITORING PORTAL — SUPABASE SCHEMA
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor
-- STEP 1: Enable PostGIS extension first
-- Go to: Database > Extensions > Search "postgis" > Enable
-- ============================================================

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ──────────────────────────────────────────────────────────────
-- TABLE: districts
-- Pakistan administrative districts with geometry and demographics
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS districts (
    id              SERIAL PRIMARY KEY,
    name_en         TEXT NOT NULL,
    name_ur         TEXT,
    province        TEXT NOT NULL,
    division        TEXT,
    geom            GEOMETRY(MULTIPOLYGON, 4326),
    total_population BIGINT DEFAULT 0,
    total_buildings  INTEGER DEFAULT 0,
    area_sqkm        NUMERIC(12, 4),
    hazard_score     NUMERIC(5, 2) DEFAULT 0,
    hazard_class     TEXT DEFAULT 'Low' CHECK (hazard_class IN ('Low', 'Moderate', 'High', 'Severe')),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_districts_geom ON districts USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_districts_province ON districts (province);
CREATE INDEX IF NOT EXISTS idx_districts_hazard_class ON districts (hazard_class);

-- ──────────────────────────────────────────────────────────────
-- TABLE: river_stations
-- Real-time gauge monitoring stations on Pakistan's rivers
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS river_stations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_name     TEXT NOT NULL,
    station_code     TEXT UNIQUE,
    river_name       TEXT NOT NULL,
    province         TEXT NOT NULL,
    latitude         NUMERIC(10, 6) NOT NULL,
    longitude        NUMERIC(10, 6) NOT NULL,
    location         GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (
                         ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                     ) STORED,
    warning_level_m  NUMERIC(8, 2),
    danger_level_m   NUMERIC(8, 2),
    current_level_m  NUMERIC(8, 2) DEFAULT 0,
    discharge_cusecs NUMERIC(12, 2) DEFAULT 0,
    flood_status     TEXT DEFAULT 'Normal' CHECK (
                         flood_status IN ('Normal', 'Low Flood', 'Medium Flood', 'High Flood', 'Very High Flood')
                     ),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_river_stations_location ON river_stations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_river_stations_river ON river_stations (river_name);
CREATE INDEX IF NOT EXISTS idx_river_stations_status ON river_stations (flood_status);

-- ──────────────────────────────────────────────────────────────
-- TABLE: river_historical_readings
-- Time-series gauge readings for trend analysis
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS river_historical_readings (
    id               BIGSERIAL PRIMARY KEY,
    station_id       UUID NOT NULL REFERENCES river_stations(id) ON DELETE CASCADE,
    gauge_height_m   NUMERIC(8, 2),
    discharge_cusecs NUMERIC(12, 2),
    recorded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_readings_station_time ON river_historical_readings (station_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_recorded_at ON river_historical_readings (recorded_at DESC);

-- ──────────────────────────────────────────────────────────────
-- TABLE: flood_events
-- SAR-derived flood extent polygons
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flood_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date          DATE NOT NULL,
    satellite_sensor    TEXT DEFAULT 'Sentinel-1 SAR',
    geom                GEOMETRY(MULTIPOLYGON, 4326),
    affected_area_sqkm  NUMERIC(12, 4) DEFAULT 0,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flood_events_geom ON flood_events USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_flood_events_date ON flood_events (event_date DESC);

-- ──────────────────────────────────────────────────────────────
-- TABLE: district_flood_impact
-- Per-district impact summary for each flood event
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS district_flood_impact (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                 UUID REFERENCES flood_events(id) ON DELETE CASCADE,
    district_id              INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    affected_population      BIGINT DEFAULT 0,
    affected_buildings_count INTEGER DEFAULT 0,
    inundated_sqkm           NUMERIC(12, 4) DEFAULT 0,
    risk_score               TEXT DEFAULT 'Low' CHECK (risk_score IN ('Low', 'Moderate', 'High', 'Severe')),
    computed_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impact_event ON district_flood_impact (event_id);
CREATE INDEX IF NOT EXISTS idx_impact_district ON district_flood_impact (district_id);
CREATE INDEX IF NOT EXISTS idx_impact_risk ON district_flood_impact (risk_score);

-- ──────────────────────────────────────────────────────────────
-- VIEW: v_district_current_status
-- Convenience view joining districts with latest flood impact
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_district_current_status AS
SELECT
    d.id,
    d.name_en,
    d.province,
    d.geom,
    d.total_population,
    d.total_buildings,
    d.area_sqkm,
    d.hazard_score,
    d.hazard_class,
    COALESCE(i.affected_population, 0)        AS affected_population,
    COALESCE(i.affected_buildings_count, 0)   AS affected_buildings,
    COALESCE(i.inundated_sqkm, 0)             AS inundated_sqkm,
    COALESCE(i.risk_score, 'Low')             AS risk_score
FROM districts d
LEFT JOIN LATERAL (
    SELECT *
    FROM district_flood_impact dfi
    WHERE dfi.district_id = d.id
    ORDER BY dfi.computed_at DESC
    LIMIT 1
) i ON TRUE;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: update_updated_at trigger
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_districts_updated_at
    BEFORE UPDATE ON districts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_river_stations_updated_at
    BEFORE UPDATE ON river_stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE river_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE river_historical_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE flood_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_flood_impact ENABLE ROW LEVEL SECURITY;

-- Allow public read access for the dashboard
CREATE POLICY "Allow public read" ON districts FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON river_stations FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON river_historical_readings FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON flood_events FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON district_flood_impact FOR SELECT USING (true);
