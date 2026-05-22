-- ═══════════════════════════════════════════════════════════════════
-- NutriCase SaaS — Supabase Schema
-- Execute este arquivo no SQL Editor do seu projeto Supabase
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. PROFILES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  full_name   TEXT,
  role        TEXT        NOT NULL DEFAULT 'nutritionist'
                          CHECK (role IN ('admin', 'nutritionist')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. CASES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cases (
  id                       TEXT        PRIMARY KEY,
  title                    TEXT        NOT NULL,
  categoria                TEXT,
  dificuldade              TEXT,
  faixa_etaria             TEXT,
  tempo_estimado_minutos   INTEGER     DEFAULT 25,
  active                   BOOLEAN     NOT NULL DEFAULT TRUE,
  json_data                JSONB       NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. SESSIONS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id     TEXT        NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'submitted', 'evaluated')),
  messages    JSONB       NOT NULL DEFAULT '[]',
  conduct     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. EVALUATIONS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evaluations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score_total  INTEGER     NOT NULL DEFAULT 0 CHECK (score_total >= 0 AND score_total <= 100),
  scores       JSONB       NOT NULL DEFAULT '{}',
  feedback     JSONB       NOT NULL DEFAULT '{}',
  omissoes     JSONB       NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- ── PROFILES policies ───────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (TRUE);

-- ── CASES policies ──────────────────────────────────────────────────
CREATE POLICY "Authenticated users can read active cases"
  ON public.cases FOR SELECT
  USING (auth.role() = 'authenticated' AND active = TRUE);

CREATE POLICY "Admins can read all cases"
  ON public.cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert cases"
  ON public.cases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update cases"
  ON public.cases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete cases"
  ON public.cases FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── SESSIONS policies ───────────────────────────────────────────────
CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ── EVALUATIONS policies ────────────────────────────────────────────
CREATE POLICY "Users can view own evaluations"
  ON public.evaluations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evaluations"
  ON public.evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════
-- INDEXES (performance)
-- ══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_sessions_user_id   ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_case_id   ON public.sessions(case_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status    ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_evaluations_session ON public.evaluations(session_id);
CREATE INDEX IF NOT EXISTS idx_cases_active       ON public.cases(active);

-- ══════════════════════════════════════════════════════════════════
-- TRIGGER: auto-update updated_at
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ══════════════════════════════════════════════════════════════════
-- PROMOTE USER TO ADMIN (run manually for yourself)
-- Substitua 'seu@email.com' pelo seu email
-- ══════════════════════════════════════════════════════════════════
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'seu@email.com';
