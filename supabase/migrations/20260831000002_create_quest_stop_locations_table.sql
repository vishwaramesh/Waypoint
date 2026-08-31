-- Supabase Migration: Create quest_stop_locations table with RLS
--
-- Mirrors errand_locations: lets a single quest stop carry multiple
-- alternate target locations (e.g. "either Print Shop A or Print Shop B").
-- Reaching ANY one of a stop's locations marks that stop done and unlocks
-- the next stop in the quest, same semantics as multi-location errands.

-- 1. Create public.quest_stop_locations table
CREATE TABLE IF NOT EXISTS public.quest_stop_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_stop_id UUID NOT NULL REFERENCES public.quest_stops(id) ON DELETE CASCADE,
    label TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    radius_m INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS quest_stop_locations_stop_id_idx ON public.quest_stop_locations(quest_stop_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.quest_stop_locations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy (scoped through parent quest_stop -> quest's user_id)
CREATE POLICY "Users can manage locations of their own quest stops"
    ON public.quest_stop_locations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.quest_stops
            JOIN public.quests ON quests.id = quest_stops.quest_id
            WHERE quest_stops.id = quest_stop_locations.quest_stop_id
            AND quests.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.quest_stops
            JOIN public.quests ON quests.id = quest_stops.quest_id
            WHERE quest_stops.id = quest_stop_locations.quest_stop_id
            AND quests.user_id = auth.uid()
        )
    );

-- 5. One-time backfill: give every existing quest stop its current single
-- location as the first row here, so quests created before this migration
-- keep working exactly as before.
INSERT INTO public.quest_stop_locations (quest_stop_id, label, lat, lng, radius_m)
SELECT id, NULL, lat, lng, radius_m FROM public.quest_stops;
