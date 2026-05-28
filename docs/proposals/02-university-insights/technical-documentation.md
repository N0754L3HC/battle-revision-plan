# Technical & Feature Documentation: University Insights Platform

**Product:** BP-002 — University Insights & Admissions Intelligence  
**Stack:** React (existing) + Supabase (existing) + new reporting layer

---

## System Overview

Three distinct surfaces are added on top of the existing Battle Plan data model:

1. **Analytics pipeline** — aggregates and anonymises raw student data into cohort-level metrics
2. **Report generator** — produces downloadable PDF/JSON intelligence reports for institutions
3. **Ad serving layer** — delivers contextual course promotions inside the student app

No changes are required to the existing student-facing UI beyond adding the native ad card component.

---

## Data Model

### Existing tables (no changes)

```
user_profiles     — uid, email, subjects (JSON)
app_config        — key, value
```

### New tables

```sql
-- Cohort snapshots (aggregated, never individual)
CREATE TABLE cohort_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  subject       TEXT NOT NULL,
  board         TEXT NOT NULL,
  region        TEXT,            -- derived from IP at signup, coarse (e.g. 'North West')
  sample_size   INTEGER NOT NULL CHECK (sample_size >= 30), -- minimum k-anonymity
  avg_score_pct NUMERIC(5,2),
  median_score  NUMERIC(5,2),
  p25_score     NUMERIC(5,2),
  p75_score     NUMERIC(5,2),
  top_error_types JSONB,         -- e.g. {"method":0.42,"calc":0.31}
  top_weak_topics JSONB,
  on_track_pct  NUMERIC(5,2),    -- % of students trending toward target grade
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Institutional customers
CREATE TABLE institutions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT CHECK (type IN ('russell_group','post_92','specialist','other')),
  contact_email TEXT NOT NULL,
  tier          TEXT CHECK (tier IN ('reports','advertising','conditional_tracking')),
  contract_start DATE,
  contract_end   DATE,
  annual_value   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Ad campaigns (university course promotions)
CREATE TABLE ad_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID REFERENCES institutions(id),
  course_name     TEXT NOT NULL,
  course_url      TEXT NOT NULL,
  headline        TEXT NOT NULL,     -- max 60 chars
  body            TEXT NOT NULL,     -- max 120 chars
  target_subjects TEXT[],            -- e.g. ['Chemistry','Biology']
  target_grade_min TEXT,             -- e.g. 'B'
  target_grade_max TEXT,             -- e.g. 'A*'
  target_boards   TEXT[],
  budget_pence    INTEGER NOT NULL,
  spent_pence     INTEGER DEFAULT 0,
  cpm_pence       INTEGER NOT NULL,  -- cost per 1000 impressions
  active          BOOLEAN DEFAULT true,
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Ad impressions (for billing and reporting)
CREATE TABLE ad_impressions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES ad_campaigns(id),
  -- No user_id stored — privacy by design
  subject     TEXT,
  grade_band  TEXT,
  board       TEXT,
  view        TEXT,   -- which app view the ad appeared in
  clicked     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Consent tracking
CREATE TABLE analytics_consent (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id),
  opted_in   BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Analytics Pipeline

### Aggregation job (runs nightly via Supabase Edge Function or cron)

**Input:** `rbp_scores_*` (localStorage, synced to Supabase) + `rbp_errors_*` + `user_profiles`

**Process:**

```
1. Pull all opted-in users' scores and errors from the past 30 days
2. Group by: subject × board × region
3. For each group with sample_size >= 30:
   - Calculate statistical metrics (avg, median, P25/P75)
   - Rank top error types by frequency
   - Rank top weak topics by mention count
   - Calculate on_track_pct (users whose score trend is positive or flat toward target)
4. Write to cohort_snapshots
5. Never write groups with sample_size < 30 (k-anonymity floor)
```

**Edge Function: `aggregate-cohorts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  // Pull opted-in users
  const { data: consentedUsers } = await supabase
    .from('analytics_consent')
    .select('user_id')
    .eq('opted_in', true)

  const userIds = consentedUsers?.map(u => u.user_id) ?? []

  // Pull their profiles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, subjects, region')
    .in('id', userIds)

  // ... aggregation logic
  // Write cohort_snapshots
  return new Response('ok')
})
```

---

## Report Generator

Reports are produced as structured JSON → rendered to PDF via a headless browser (Puppeteer on a Vercel Edge Function or a dedicated worker).

### Report schema

```typescript
interface IntelligenceReport {
  generated_at: string
  period: { from: string; to: string }
  institution: string   // recipient name, for header only
  cohorts: CohortSummary[]
  highlights: string[]  // top 3 insights, human-readable
}

interface CohortSummary {
  subject: string
  board: string
  sample_size: number
  avg_score: number
  median_score: number
  quartiles: [number, number]
  top_errors: { type: string; frequency: number }[]
  top_weak_topics: { topic: string; mentions: number }[]
  on_track_pct: number
  trend: 'improving' | 'stable' | 'declining'
}
```

### Report delivery

- Generated on-demand via a password-protected institutional portal (`/institution` route)
- Downloadable as PDF and CSV
- Email delivery via Resend on schedule (quarterly for base tier, monthly for premium)

---

## Ad Serving Layer

### Targeting engine (client-side, privacy-safe)

The ad targeting runs entirely in the student's browser. No individual data leaves the device for targeting purposes.

```javascript
// In App.jsx — before rendering Resources or Exams view
function getEligibleAds(campaigns, userSubjects, userGradeBand, userBoard) {
  return campaigns.filter(c =>
    (!c.target_subjects?.length || c.target_subjects.some(s => userSubjects.includes(s))) &&
    (!c.target_boards?.length   || c.target_boards.includes(userBoard)) &&
    (!c.target_grade_min        || gradeRank(userGradeBand) >= gradeRank(c.target_grade_min)) &&
    (!c.target_grade_max        || gradeRank(userGradeBand) <= gradeRank(c.target_grade_max)) &&
    c.active && c.spent_pence < c.budget_pence
  )
}

const gradeRank = g => ({'U':0,'E':1,'D':2,'C':3,'B':4,'A':5,'A*':6}[g] ?? -1)
```

### Ad card component

Placed at the bottom of the Resources view, one card per session maximum:

```jsx
function AdCard({ ad, C }) {
  const handleClick = async () => {
    await supabase.from('ad_impressions')
      .update({ clicked: true })
      .eq('id', impressionId)
    window.open(ad.course_url, '_blank', 'noopener')
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '14px 18px', opacity: 0.9 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.muted,
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        Sponsored · {ad.institution_name}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        {ad.headline}
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{ad.body}</div>
      <button onClick={handleClick} style={{ fontSize: 12, color: C.accent,
        background: 'transparent', border: `1px solid ${C.accent}`,
        borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
        Find out more
      </button>
    </div>
  )
}
```

### Impression logging

On render of AdCard, log a new `ad_impressions` row with no user_id (privacy by design). Update `spent_pence` on the campaign atomically:

```sql
-- RPC: log_impression(campaign_id, subject, grade_band, board, view)
UPDATE ad_campaigns
SET spent_pence = spent_pence + cpm_pence / 1000
WHERE id = campaign_id
  AND spent_pence < budget_pence;
```

---

## Institutional Portal

Route: `/institution` (separate from `/admin`)

### Features

| Feature | Description |
|---|---|
| Login | Email + magic link (Supabase Auth, institution email domain restricted) |
| Dashboard | Current campaign stats: impressions, clicks, CTR, spend vs budget |
| Report library | Download past intelligence reports (PDF/CSV) |
| Campaign builder | Create new course promotion: targeting, budget, creative |
| Billing | Stripe Customer Portal integration for invoices |

### Access control

```sql
CREATE TABLE institution_users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id),
  user_id        UUID REFERENCES auth.users(id),
  role           TEXT CHECK (role IN ('admin','viewer')),
  UNIQUE(institution_id, user_id)
);
```

Row-Level Security policies restrict all institution data reads to matching `institution_id`.

---

## Consent Flow (Student Side)

Shown once at account creation, revisitable in Account settings:

```
"Help improve higher education research?

We anonymise and aggregate your revision data (never individual scores)
to help universities understand how students study. You'll never be
identified. You can opt out at any time."

[Yes, I'm happy to contribute]  [No thanks]
```

Stored in `analytics_consent`. Opting out removes the user from all future cohort snapshots immediately.

---

## Implementation Phases

| Phase | Scope | Effort |
|---|---|---|
| 1 | Consent flow + analytics pipeline + cohort_snapshots | 2 weeks |
| 2 | Report generator (JSON schema + PDF template) | 1 week |
| 3 | Ad serving layer + AdCard component + impression logging | 1 week |
| 4 | Institutional portal (dashboard + campaign builder + billing) | 3 weeks |
| 5 | Conditional offer tracking (Tier 3) | 2 weeks |

**Total: ~9 weeks for full platform**
