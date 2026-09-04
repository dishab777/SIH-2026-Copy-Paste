-- ==============================================================================
-- NEXUS: Public Procurement Platform for Government Innovation Pilots
-- Database Schema for Supabase PostgreSQL
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('GOVERNMENT', 'STARTUP', 'EVALUATOR');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'challenge_status') THEN
        CREATE TYPE challenge_status AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'milestone_status') THEN
        CREATE TYPE milestone_status AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- 3. TABLES

-- Users table (extends Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    full_name TEXT NOT NULL,
    department_name TEXT,
    dpiit_number TEXT,
    tech_tags TEXT[] DEFAULT '{}'::TEXT[],
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    problem_statement TEXT NOT NULL,
    kpis JSONB NOT NULL DEFAULT '[]'::JSONB,
    tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    status challenge_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Pilots table
CREATE TABLE IF NOT EXISTS public.pilots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    startup_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    total_value NUMERIC(14, 2) NOT NULL CHECK (total_value >= 0),
    validation_score INTEGER CHECK (validation_score >= 0 AND validation_score <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Milestones table
CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pilot_id UUID NOT NULL REFERENCES public.pilots(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    payment_percentage NUMERIC(5, 2) NOT NULL CHECK (payment_percentage >= 0 AND payment_percentage <= 100),
    status milestone_status NOT NULL DEFAULT 'PENDING',
    evidence_url TEXT,
    payment_authorized BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON public.users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_tech_tags ON public.users USING GIN (tech_tags);

CREATE INDEX IF NOT EXISTS idx_challenges_author ON public.challenges(author_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_tags ON public.challenges USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_pilots_challenge ON public.pilots(challenge_id);
CREATE INDEX IF NOT EXISTS idx_pilots_startup ON public.pilots(startup_id);

CREATE INDEX IF NOT EXISTS idx_milestones_pilot ON public.milestones(pilot_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- 5. STORAGE BUCKET INITIALIZATION
-- Bucket for milestone evidence uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('milestone-evidence', 'milestone-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to read profile details
CREATE POLICY "Allow public read of verified users and basic profiles"
    ON public.users FOR SELECT
    USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "Allow individual user profile updates"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Allow insert on user registration
CREATE POLICY "Allow insert during auth registration"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Challenge policies
CREATE POLICY "Challenges viewable by authenticated users"
    ON public.challenges FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Government users can create challenges"
    ON public.challenges FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid() AND public.users.role = 'GOVERNMENT'
        )
    );

CREATE POLICY "Government users can update their challenges"
    ON public.challenges FOR UPDATE
    TO authenticated
    USING (author_id = auth.uid());

-- Pilot policies
CREATE POLICY "Pilots viewable by participants and evaluators"
    ON public.pilots FOR SELECT
    TO authenticated
    USING (
        startup_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.challenges c
            WHERE c.id = challenge_id AND c.author_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'EVALUATOR'
        )
    );

CREATE POLICY "Government users can create pilots"
    ON public.pilots FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid() AND public.users.role = 'GOVERNMENT'
        )
    );

CREATE POLICY "Government & Evaluators can update pilots"
    ON public.pilots FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.challenges c
            WHERE c.id = challenge_id AND c.author_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'EVALUATOR'
        )
    );

-- Milestone policies
CREATE POLICY "Milestones viewable by authenticated participants"
    ON public.milestones FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Startups and Government can update milestones"
    ON public.milestones FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pilots p
            JOIN public.challenges c ON c.id = p.challenge_id
            WHERE p.id = pilot_id AND (p.startup_id = auth.uid() OR c.author_id = auth.uid())
        )
    );

-- Audit log policies
CREATE POLICY "Audit logs readable by government and evaluators"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid() AND public.users.role IN ('GOVERNMENT', 'EVALUATOR')
        )
    );

CREATE POLICY "Audit logs insertable by authenticated users"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = actor_id);

-- Storage bucket access policies
CREATE POLICY "Public read milestone evidence"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'milestone-evidence');

CREATE POLICY "Authenticated users can upload milestone evidence"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'milestone-evidence');
