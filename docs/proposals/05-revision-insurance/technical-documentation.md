# Technical & Feature Documentation: Revision Insurance

**Product:** BP-005 — Grade Guarantee / Revision Insurance  
**Stack:** React (existing) + Supabase (existing) + Stripe + Cloudinary (photo upload) + Resend

---

## System Overview

Four new surfaces layered onto the existing app:

1. **Eligibility tracker** — real-time display of student's progress toward insurance eligibility
2. **Purchase flow** — eligibility check → policy creation → Stripe payment
3. **Claims portal** — results upload, manual review queue, payout processing
4. **Admin claims dashboard** — internal tool for reviewing and approving/denying claims

---

## Data Model

```sql
-- Insurance policies
CREATE TABLE insurance_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES auth.users(id),
  purchased_at    TIMESTAMPTZ DEFAULT now(),
  premium_pence   INTEGER NOT NULL DEFAULT 2000,  -- £20.00
  covered_subjects TEXT[] NOT NULL,               -- subjects insured (max 2)
  target_grades   JSONB NOT NULL,                 -- e.g. {"Mathematics":"A*","Chemistry":"A"}
  stripe_payment_intent_id TEXT NOT NULL,
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active','claimed','expired','refunded')),
  eligibility_snapshot JSONB NOT NULL,            -- snapshot of eligibility at purchase time
  exam_year       INTEGER NOT NULL DEFAULT 2026
);

-- Eligibility snapshots (computed daily)
CREATE TABLE eligibility_status (
  student_id        UUID REFERENCES auth.users(id) PRIMARY KEY,
  papers_logged     INTEGER DEFAULT 0,
  longest_gap_days  INTEGER DEFAULT 0,
  score_trend       TEXT,          -- 'improving'|'stable'|'declining'
  is_eligible       BOOLEAN DEFAULT false,
  papers_needed     INTEGER DEFAULT 0,   -- how many more to become eligible
  computed_at       TIMESTAMPTZ DEFAULT now()
);

-- Claims
CREATE TABLE insurance_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       UUID REFERENCES insurance_policies(id),
  student_id      UUID REFERENCES auth.users(id),
  subject         TEXT NOT NULL,
  target_grade    TEXT NOT NULL,
  achieved_grade  TEXT NOT NULL,
  results_photo_url TEXT NOT NULL,   -- Cloudinary URL
  submitted_at    TIMESTAMPTZ DEFAULT now(),
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','denied','paid')),
  reviewer_notes  TEXT,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID,              -- admin user_id
  payout_pence    INTEGER DEFAULT 10000,  -- £100.00
  payout_reference TEXT              -- Stripe transfer or PayPal ID
);
```

---

## Eligibility Engine

### Computation (daily Edge Function + on-demand)

```typescript
// Edge Function: compute-eligibility
// Runs daily via pg_cron, and on-demand when student views their eligibility status

interface EligibilityResult {
  isEligible: boolean
  papersLogged: number
  papersNeeded: number
  longestGapDays: number
  scoreTrend: 'improving' | 'stable' | 'declining'
  blockers: string[]
}

async function computeEligibility(studentId: string): Promise<EligibilityResult> {
  const WINDOW_DAYS = 60
  const MIN_PAPERS = 8
  const MAX_GAP_DAYS = 10

  const cutoff = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString()

  // Pull papers in window
  const { data: papers } = await supabase
    .from('scores')
    .select('pct, created_at')
    .eq('user_id', studentId)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })

  const papersLogged = papers?.length ?? 0
  const papersNeeded = Math.max(0, MIN_PAPERS - papersLogged)

  // Compute longest gap
  let longestGap = 0
  for (let i = 1; i < (papers?.length ?? 0); i++) {
    const gap = daysBetween(papers![i-1].created_at, papers![i].created_at)
    longestGap = Math.max(longestGap, gap)
  }

  // Score trend (simple linear regression on pct)
  const trend = computeTrend(papers?.map(p => p.pct) ?? [])

  const blockers: string[] = []
  if (papersLogged < MIN_PAPERS) blockers.push(`Log ${papersNeeded} more papers`)
  if (longestGap > MAX_GAP_DAYS) blockers.push(`Gap of ${longestGap} days detected — keep consistent`)
  if (trend === 'declining') blockers.push('Score trend is declining — reverse it to qualify')

  return {
    isEligible: blockers.length === 0,
    papersLogged,
    papersNeeded,
    longestGapDays: longestGap,
    scoreTrend: trend,
    blockers,
  }
}

function computeTrend(pcts: number[]): 'improving' | 'stable' | 'declining' {
  if (pcts.length < 3) return 'stable'
  const first = pcts.slice(0, Math.floor(pcts.length / 2))
  const last  = pcts.slice(Math.ceil(pcts.length / 2))
  const firstAvg = first.reduce((a, b) => a + b, 0) / first.length
  const lastAvg  = last.reduce((a, b) => a + b, 0) / last.length
  if (lastAvg - firstAvg > 3) return 'improving'
  if (firstAvg - lastAvg > 3) return 'declining'
  return 'stable'
}
```

---

## Eligibility Tracker UI

Shown in the Account view and as a persistent card in Analytics once the student has logged 3+ papers:

```jsx
function InsuranceEligibilityCard({ eligibility, C }) {
  const { isEligible, papersLogged, papersNeeded, longestGapDays, scoreTrend, blockers } = eligibility

  const progressPct = Math.min(100, Math.round((papersLogged / 8) * 100))

  return (
    <div style={{ background: C.surface, border: `1px solid ${isEligible ? '#22c55e44' : C.border}`,
      borderRadius: 10, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: isEligible ? '#22c55e' : C.muted,
            textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Revision Insurance
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 2 }}>
            {isEligible ? 'You qualify!' : 'Building eligibility…'}
          </div>
        </div>
        {isEligible && (
          <button onClick={() => setView('insurance-purchase')}
            style={{ background: '#22c55e', border: 'none', color: '#fff',
              padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit' }}>
            Get cover — £20
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Papers logged (need 8)</span>
          <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{papersLogged}/8</span>
        </div>
        <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`,
            background: isEligible ? '#22c55e' : C.accent,
            borderRadius: 2, transition: 'width 1s ease' }} />
        </div>
      </div>

      {/* Status indicators */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatusChip
          label={`Gap: ${longestGapDays}d max`}
          ok={longestGapDays <= 10}
          C={C}
        />
        <StatusChip
          label={`Trend: ${scoreTrend}`}
          ok={scoreTrend !== 'declining'}
          C={C}
        />
      </div>

      {!isEligible && blockers.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
          To qualify: {blockers.join(' · ')}
        </div>
      )}
    </div>
  )
}

function StatusChip({ label, ok, C }) {
  return (
    <div style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4,
      background: ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
      color: ok ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
      {ok ? '✓' : '✗'} {label}
    </div>
  )
}
```

---

## Purchase Flow

### Step 1 — Eligibility gate

```typescript
// Edge Function: check-and-create-policy
async function createPolicy(studentId: string, coveredSubjects: string[], targetGrades: Record<string, string>) {
  // Re-verify eligibility server-side (client-side check is UX only)
  const eligibility = await computeEligibility(studentId)
  if (!eligibility.isEligible) {
    throw new Error('Student does not meet eligibility requirements')
  }

  // Enforce max 2 subjects
  if (coveredSubjects.length > 2) {
    throw new Error('Maximum 2 subjects per policy')
  }

  // Create Stripe Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 2000,  // £20.00
    currency: 'gbp',
    metadata: { studentId, coveredSubjects: JSON.stringify(coveredSubjects) },
    description: 'Battle Plan Revision Insurance',
  })

  // Create policy record (status: pending until payment confirmed)
  await supabase.from('insurance_policies').insert({
    student_id: studentId,
    covered_subjects: coveredSubjects,
    target_grades: targetGrades,
    stripe_payment_intent_id: paymentIntent.id,
    eligibility_snapshot: eligibility,
    exam_year: 2026,
  })

  return { clientSecret: paymentIntent.client_secret }
}
```

### Step 2 — Payment (Stripe Elements in-app)

Standard Stripe card payment UI embedded in the Battle Plan app. On `payment_intent.succeeded` webhook, update policy `status` to `'active'`.

### Step 3 — Confirmation

```jsx
function InsurancePurchaseConfirmation({ policy, C }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>
        You're covered.
      </div>
      <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 320, margin: '0 auto' }}>
        If you miss your target in {policy.covered_subjects.join(' or ')}, we'll pay you £100.
        Keep revising — you've got this.
      </div>
    </div>
  )
}
```

---

## Claims Portal

### Results day flow

Shown in-app from 1 August, for all active policies:

```jsx
function ClaimsView({ policy, C }) {
  const [subject, setSubject] = useState(policy.covered_subjects[0])
  const [achievedGrade, setAchievedGrade] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const targetGrade = policy.target_grades[subject]
  const isClaimable = gradeRank(achievedGrade) < gradeRank(targetGrade)

  const handleSubmit = async () => {
    const photoUrl = await uploadToCloudinary(photoFile)
    await supabase.from('insurance_claims').insert({
      policy_id: policy.id,
      student_id: policy.student_id,
      subject,
      target_grade: targetGrade,
      achieved_grade: achievedGrade,
      results_photo_url: photoUrl,
    })
    setSubmitted(true)
  }

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>
        Submit a claim
      </div>
      <select value={subject} onChange={e => setSubject(e.target.value)}>
        {policy.covered_subjects.map(s => <option key={s}>{s}</option>)}
      </select>
      <div>Your target was: {targetGrade}</div>
      <select value={achievedGrade} onChange={e => setAchievedGrade(e.target.value)}>
        {['A*','A','B','C','D','E','U'].map(g => <option key={g}>{g}</option>)}
      </select>
      {isClaimable && (
        <>
          <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} />
          <button onClick={handleSubmit}>Submit claim (£100)</button>
        </>
      )}
    </div>
  )
}
```

---

## Admin Claims Dashboard (`/admin/claims`)

| Column | Value |
|---|---|
| Student | Anonymous ID (no name shown to reviewer unless needed) |
| Subject | The claimed subject |
| Target / Achieved | e.g. A* / B |
| Photo | Linked thumbnail → full size on click |
| Submitted | Timestamp |
| Status | pending / approved / denied |
| Action | Approve (triggers £100 payout) / Deny (requires note) |

### Payout on approval

```typescript
// Stripe — send to student's saved payment method, or PayPal email
async function processPayout(claimId: string) {
  await stripe.payouts.create({
    amount: 10000,  // £100.00
    currency: 'gbp',
    // Or: use Stripe Issuing / PayPal Payouts API for direct-to-student transfer
  })

  await supabase.from('insurance_claims')
    .update({ status: 'paid', payout_reference: payout.id })
    .eq('id', claimId)
}
```

---

## Implementation Phases

| Phase | Scope | Effort |
|---|---|---|
| 1 | Eligibility engine + `eligibility_status` table + daily cron | 4 days |
| 2 | Eligibility tracker UI card in Analytics + Account | 2 days |
| 3 | Purchase flow: eligibility gate + Stripe Elements + policy creation | 1 week |
| 4 | Stripe webhook handler (payment confirmation) | 1 day |
| 5 | Claims portal: results upload + Cloudinary integration | 1 week |
| 6 | Admin claims dashboard + payout trigger | 4 days |
| 7 | Confirmation emails (policy, claim received, payout sent) | 2 days |

**Total: ~5 weeks for full product**
