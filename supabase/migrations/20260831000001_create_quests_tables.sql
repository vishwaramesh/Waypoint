-- Supabase Migration: Create quests and quest_stops tables with RLS

-- 1. Create public.quests table
CREATE TABLE IF NOT EXISTS public.quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create public.quest_stops table
CREATE TABLE IF NOT EXISTS public.quest_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    note TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    radius_m INTEGER NOT NULL DEFAULT 100,
    is_done BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS quests_user_id_idx ON public.quests(user_id);
CREATE INDEX IF NOT EXISTS quest_stops_quest_id_idx ON public.quest_stops(quest_id);
CREATE INDEX IF NOT EXISTS quest_stops_order_idx ON public.quest_stops(quest_id, order_index);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_stops ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for quests
CREATE POLICY "Users can manage their own quests"
    ON public.quests
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. RLS Policies for quest_stops (scoped through parent quest's user_id)
CREATE POLICY "Users can manage stops of their own quests"
    ON public.quest_stops
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.quests
            WHERE quests.id = quest_stops.quest_id
            AND quests.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.quests
            WHERE quests.id = quest_stops.quest_id
            AND quests.user_id = auth.uid()
        )
    );
