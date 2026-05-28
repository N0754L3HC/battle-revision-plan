# Technical & Feature Documentation: Precision Tutor Lead Marketplace

**Product:** BP-003 — Tutor Lead Marketplace  
**Stack:** React (existing) + Supabase (existing) + Stripe Connect + new tutor portal

---

## System Overview

Three new surfaces bolt onto the existing Battle Plan platform:

1. **Tutor portal** (`/tutors`) — registration, specialism tagging, lead inbox, profile management
2. **Matching engine** — maps student error log topics to tutor specialism tags
3. **Student-side integration** — contextual prompts + anonymous lead briefs + booking flow

The existing student app requires minimal changes (one new component, one new view state).

---

## Data Model

### New tables

```sql
-- Tutor profiles
CREATE TABLE tutors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) UNIQUE,
  display_name    TEXT NOT NULL,
  bio             TEXT,                    -- max 300 chars
  hourly_rate_gbp INTEGER NOT NULL,        -- in pence
  accepts_online  BOOLEAN DEFAULT true,
  accepts_inperson BOOLEAN DEFAULT false,
  location_city   TEXT,
  dbs_verified    BOOLEAN DEFAULT false,
  stripe_account_id TEXT,                  -- Stripe Connect account
  active          BOOLEAN DEFAULT true,
  rating          NUMERIC(3,2),            -- avg of review scores
  total_sessions  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Tutor specialism tags (topic-level granularity)
CREATE TABLE tutor_specialisms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id   UUID REFERENCES tutors(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,               -- e.g. 'Mathematics'
  board      TEXT,                        -- e.g. 'Edexcel', null = any
  topic      TEXT NOT NULL,               -- e.g. 'Integration by Substitution'
  UNIQUE(tutor_id, subject, board, topic)
);

-- Student lead requests
CREATE TABLE lead_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_uid     UUID REFERENCES auth.users(id),
  subject         TEXT NOT NULL,
  board           TEXT,
  error_summary   JSONB NOT NULL,          -- anonymised: {topics, error_types, count}
  grade_band      TEXT,                    -- e.g. 'B'
  score_trend     TEXT,                    -- 'improving'|'stable'|'declining'
  format_pref     TEXT CHECK (format_pref IN ('online','inperson','either')),
  status          TEXT DEFAULT 'open'
                  CHECK (status IN ('open','matched','booked','closed')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Tutor pitches (response to a lead)
CREATE TABLE tutor_pitches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        UUID REFERENCES lead_requests(id),
  tutor_id       UUID REFERENCES tutors(id),
  pitch_text     TEXT NOT NULL,            -- max 300 chars
  proposed_rate  INTEGER,                  -- pence/hr, can differ from profile
  status         TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','declined')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, tutor_id)
);

-- Booked sessions
CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES lead_requests(id),
  tutor_id        UUID REFERENCES tutors(id),
  student_uid     UUID REFERENCES auth.users(id),
  session_number  INTEGER NOT NULL,        -- 1–4 for commission window
  scheduled_at    TIMESTAMPTZ,
  rate_gbp_pence  INTEGER NOT NULL,
  commission_pct  NUMERIC(4,2) DEFAULT 18.0,
  stripe_payment_intent_id TEXT,
  status          TEXT DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','completed','cancelled')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Reviews (post-session)
CREATE TABLE session_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id),
  tutor_id    UUID REFERENCES tutors(id),
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,                        -- optional
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## Matching Engine

### Topic normalisation

Error log topics are free text entered by students ("forgot integration by parts," "got confused with substitution"). The matching engine normalises these to canonical topic tags using a lookup table + fuzzy match.

```typescript
// Edge Function: normalize-topic
const TOPIC_ALIASES: Record<string, string> = {
  'integration by parts':       'Integration: by parts',
  'integrating by parts':       'Integration: by parts',
  'integration by substitution':'Integration: by substitution',
  'chain rule':                 'Differentiation: chain rule',
  'product rule':               'Differentiation: product rule',
  'organic mechanisms':         'Organic Chemistry: mechanisms',
  'fischer esterification':     'Organic Chemistry: mechanisms',
  // ... extensible lookup table
}

export function normalizeTopic(raw: string): string {
  const lower = raw.toLowerCase().trim()
  for (const [alias, canonical] of Object.entries(TOPIC_ALIASES)) {
    if (lower.includes(alias)) return canonical
  }
  return raw // fall back to raw if no match found
}
```

### Match query

When a student submits a lead request, find tutors whose specialism tags overlap with the student's normalised error topics:

```sql
-- RPC: find_matching_tutors(lead_id UUID)
SELECT DISTINCT
  t.id,
  t.display_name,
  t.bio,
  t.hourly_rate_gbp,
  t.accepts_online,
  t.accepts_inperson,
  t.rating,
  t.total_sessions,
  COUNT(ts.topic) AS matching_topic_count
FROM tutors t
JOIN tutor_specialisms ts ON ts.tutor_id = t.id
WHERE t.active = true
  AND t.dbs_verified = true
  AND ts.subject = (SELECT subject FROM lead_requests WHERE id = lead_id)
  AND (ts.board IS NULL OR ts.board = (SELECT board FROM lead_requests WHERE id = lead_id))
  AND ts.topic = ANY(
    SELECT jsonb_array_elements_text(
      (SELECT error_summary->'normalised_topics' FROM lead_requests WHERE id = lead_id)
    )
  )
GROUP BY t.id
ORDER BY matching_topic_count DESC, t.rating DESC NULLS LAST
LIMIT 5;
```

---

## Student-Side Integration

### Trigger condition

After the student logs their 5th error in a single subject within a 14-day window:

```javascript
// In Tracker component, after addError()
const recentSubjectErrors = errors
  .filter(e => e.subject === errSubject && Date.now() - e.ts < 14 * 86400000)

if (recentSubjectErrors.length === 5 && !ls.get(`rbp_tutor_prompt_${errSubject}`, false)) {
  ls.set(`rbp_tutor_prompt_${errSubject}`, true)
  setShowTutorPrompt(errSubject)
}
```

### Tutor prompt card

```jsx
function TutorPromptCard({ subject, errors, C, onDismiss, onSubmit }) {
  const topTopics = getTopTopics(errors.filter(e => e.subject === subject), 3)

  return (
    <div style={{ background: C.surface, border: `1px solid #f97316aa`,
      borderRadius: 10, padding: '14px 18px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316',
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Struggling with {subject}?
      </div>
      <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>
        We've spotted recurring issues in:
      </div>
      <ul style={{ margin: '0 0 12px 16px', padding: 0 }}>
        {topTopics.map(t => (
          <li key={t} style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>{t}</li>
        ))}
      </ul>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
        Want us to find a tutor who specialises in exactly these topics?
        We'll share only your weak areas — no personal details until you choose someone.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSubmit} style={{ background: '#f97316', border: 'none',
          color: '#fff', padding: '8px 16px', borderRadius: 7, fontSize: 13,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Find me a tutor
        </button>
        <button onClick={onDismiss} style={{ background: 'transparent',
          border: `1px solid ${C.border}`, color: C.muted, padding: '8px 12px',
          borderRadius: 7, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          Not now
        </button>
      </div>
    </div>
  )
}
```

### Lead submission

```typescript
// Edge Function: submit-lead
async function submitLead(studentUid: string, subject: string, board: string, errors: Error[]) {
  const topics = errors
    .filter(e => e.subject === subject)
    .map(e => normalizeTopic(e.topic))
  
  const errorTypeCounts = errors
    .filter(e => e.subject === subject)
    .reduce((acc, e) => ({ ...acc, [e.type]: (acc[e.type] ?? 0) + 1 }), {})

  const errorSummary = {
    normalised_topics: [...new Set(topics)],
    error_type_distribution: errorTypeCounts,
    total_errors: errors.filter(e => e.subject === subject).length,
  }

  const { data: lead } = await supabase
    .from('lead_requests')
    .insert({ student_uid: studentUid, subject, board, error_summary: errorSummary })
    .select()
    .single()

  // Notify matched tutors via email (Resend)
  const matches = await findMatchingTutors(lead.id)
  await notifyTutors(matches, lead)

  return lead
}
```

---

## Tutor Portal (`/tutors`)

### Routes

| Route | Component | Access |
|---|---|---|
| `/tutors` | Landing / sign up | Public |
| `/tutors/profile` | Edit profile + specialisms | Tutor auth |
| `/tutors/leads` | Lead inbox | Tutor auth |
| `/tutors/pitch/:leadId` | Submit pitch | Tutor auth |
| `/tutors/sessions` | Session history + earnings | Tutor auth |

### Specialism tagging UI

Tutors select their specialisms from a hierarchical tag picker:

```
Subject → Board (optional) → Topic
[Mathematics] → [Edexcel] → [Integration: by parts ✓] [Integration: by substitution ✓] [Differentiation: chain rule] ...
```

Tags are sourced from the same `TOPIC_ALIASES` lookup table, ensuring student error topics and tutor tags share a canonical vocabulary.

---

## Payment Flow (Stripe Connect)

### Tutor onboarding
1. Tutor completes Stripe Connect Express onboarding (KYC, bank account)
2. `stripe_account_id` stored on `tutors` table

### Session payment
1. Student pays the full session rate via Stripe
2. Battle Plan retains 18% (sessions 1–4), transfers 82% to tutor's Stripe account
3. From session 5 onwards, tutor receives 100% (relationship management ends)

```typescript
// Create payment intent with automatic split
const paymentIntent = await stripe.paymentIntents.create({
  amount: session.rate_gbp_pence,
  currency: 'gbp',
  application_fee_amount: Math.round(session.rate_gbp_pence * 0.18),
  transfer_data: { destination: tutor.stripe_account_id },
})
```

---

## Outcome Tracking

After a tutoring engagement, the student continues logging papers in Battle Plan as normal. A lightweight post-session check-in:

```jsx
// Shown 7 days after session_number === 4 completes
function TutoringOutcomeCard({ tutor, subject, C }) {
  return (
    <div>
      <p>How's your {subject} going since your sessions with {tutor.display_name}?</p>
      <button onClick={() => setView('tracker')}>Log a paper to see your progress</button>
      <button onClick={() => submitReview(tutor.id)}>Leave a review</button>
    </div>
  )
}
```

The score delta (pre-tutoring avg vs post-tutoring avg) is shown on the tutor's public profile as a verified improvement metric.

---

## Implementation Phases

| Phase | Scope | Effort |
|---|---|---|
| 1 | Data model + topic normalisation table | 3 days |
| 2 | Tutor portal: registration, specialism tagging | 1 week |
| 3 | Student-side prompt + lead submission | 3 days |
| 4 | Matching engine + lead notifications (email) | 3 days |
| 5 | Pitch inbox + student acceptance flow | 1 week |
| 6 | Stripe Connect payment split | 1 week |
| 7 | Session tracking + outcome cards + reviews | 1 week |

**Total: ~5 weeks for full marketplace**
