-- Supabase Database Migration: Create errands table with Row Level Security (RLS)

-- 1. Create public.errands table
CREATE TABLE IF NOT EXISTS public.errands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    note TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    radius_m INTEGER DEFAULT 100,
    is_done BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for performance on user_id lookups
CREATE INDEX IF NOT EXISTS errands_user_id_idx ON public.errands(user_id);
CREATE INDEX IF NOT EXISTS errands_created_at_idx ON public.errands(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.errands ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies allowing authenticated users to manage ONLY their own rows
CREATE POLICY "Users can view their own errands"
    ON public.errands
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own errands"
    ON public.errands
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own errands"
    ON public.errands
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own errands"
    ON public.errands
    FOR DELETE
    USING (auth.uid() = user_id);
