-- Supabase Migration: Create errand_locations table for multi-location errand support

-- 1. Create public.errand_locations table
CREATE TABLE IF NOT EXISTS public.errand_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    errand_id UUID NOT NULL REFERENCES public.errands(id) ON DELETE CASCADE,
    label TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    radius_m INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for fast lookups by errand_id
CREATE INDEX IF NOT EXISTS errand_locations_errand_id_idx ON public.errand_locations(errand_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.errand_locations ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policy allowing users to manage locations of their own errands
CREATE POLICY "Users can manage locations of their own errands"
    ON public.errand_locations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.errands
            WHERE errands.id = errand_locations.errand_id
            AND errands.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.errands
            WHERE errands.id = errand_locations.errand_id
            AND errands.user_id = auth.uid()
        )
    );

-- 5. One-time data preservation migration step:
-- Copy each existing errand's lat, lng, radius_m into a new row in errand_locations
INSERT INTO public.errand_locations (errand_id, label, lat, lng, radius_m)
SELECT 
    id AS errand_id,
    NULL AS label,
    lat,
    lng,
    COALESCE(radius_m, 100) AS radius_m
FROM public.errands
WHERE NOT EXISTS (
    SELECT 1 FROM public.errand_locations WHERE errand_locations.errand_id = errands.id
);
