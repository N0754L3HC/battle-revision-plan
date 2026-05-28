# Technical & Feature Documentation: School White-Label Platform

**Product:** BP-004 — School White-Label  
**Stack:** React (existing) + Supabase (existing) + new teacher/admin portals

---

## System Overview

Four surfaces in total:

1. **Student app** — existing Battle Plan, minimal changes (sharing consent toggle, school branding)
2. **Teacher portal** (`/teacher`) — class overview, heatmaps, individual student views, alerts
3. **School admin panel** (`/school-admin`) — class management, teacher accounts, branding
4. **Weekly digest email** — automated summary sent to teachers every Monday

All data flows from the existing student score/error tables. No changes to student-side data collection.

---

## Data Model

### New tables

```sql
-- Schools
CREATE TABLE schools (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  type         TEXT CHECK (type IN ('state','independent','fe_college','academy')),
  urn          TEXT UNIQUE,                  -- Unique Reference Number (DfE)
  licence_tier TEXT CHECK (tier IN ('department','full_sixth_form','multi_campus')),
  licence_start DATE,
  licence_end   DATE,
  logo_url     TEXT,
  accent_color TEXT DEFAULT '#c27c60',       -- for branded student app
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Class groups (links students to a school and teacher)
CREATE TABLE class_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID REFERENCES schools(id),
  name       TEXT NOT NULL,                  -- e.g. 'Year 13 Maths Set 1'
  subject    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Student–class membership
CREATE TABLE class_memberships (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID REFERENCES class_groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id),
  sharing_consent BOOLEAN DEFAULT false,     -- student must consent
  joined_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Teacher accounts
CREATE TABLE teachers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) UNIQUE,
  school_id  UUID REFERENCES schools(id),
  name       TEXT NOT NULL,
  role       TEXT DEFAULT 'teacher'
             CHECK (role IN ('teacher','head_of_department','school_admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Teacher–class assignments
CREATE TABLE teacher_classes (
  teacher_id UUID REFERENCES teachers(id),
  class_id   UUID REFERENCES class_groups(id),
  PRIMARY KEY (teacher_id, class_id)
);

-- Alert rules and triggered alerts
CREATE TABLE student_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID REFERENCES auth.users(id),
  class_id     UUID REFERENCES class_groups(id),
  alert_type   TEXT CHECK (alert_type IN ('no_papers_14d','score_drop_10','recurring_topic')),
  subject      TEXT,
  detail       JSONB,                        -- e.g. {"topic":"Integration","count":5}
  acknowledged BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

### Modified tables

```sql
-- Add school linkage to user_profiles (nullable — only set for school users)
ALTER TABLE user_profiles
  ADD COLUMN school_id UUID REFERENCES schools(id),
  ADD COLUMN join_code TEXT;               -- 6-char code to join a class
```

---

## Row-Level Security

Teachers can only read data from students in their assigned classes, and only if the student has given sharing consent:

```sql
-- Scores (existing table, add RLS policy)
CREATE POLICY "teacher_read_consented_scores" ON scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_memberships cm
      JOIN teacher_classes tc ON tc.class_id = cm.class_id
      JOIN teachers t ON t.id = tc.teacher_id
      WHERE cm.student_id = scores.user_id
        AND cm.sharing_consent = true
        AND t.user_id = auth.uid()
    )
  );

-- Same pattern for errors table
```

---

## Teacher Portal (`/teacher`)

### Authentication

Teachers sign in with their school email via Supabase Auth (magic link). School email domain is validated against `schools` table on first login.

### Views

#### 1. Class Overview

```jsx
function ClassOverview({ classId, C }) {
  // Fetched via RPC: get_class_summary(class_id)
  // Returns: array of { student_id, display_name, subject, latest_score,
  //           avg_score, paper_count, last_paper_date, trend, grade_band }

  const getStatus = (student) => {
    if (!student.last_paper_date) return 'no-data'
    const daysSince = daysBetween(student.last_paper_date, new Date())
    if (daysSince > 14) return 'inactive'
    if (student.trend === 'declining') return 'at-risk'
    return 'on-track'
  }

  const STATUS_COLOR = {
    'on-track': '#22c55e',
    'at-risk':  '#ef4444',
    'inactive': '#f97316',
    'no-data':  '#6b7280',
  }

  return (
    <div>
      {students.map(s => (
        <div key={s.student_id} style={{ display: 'flex', alignItems: 'center',
          gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%',
            background: STATUS_COLOR[getStatus(s)] }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.display_name}</div>
            <div style={{ fontSize: 12, color: C.muted }}>
              {s.paper_count} papers · last {daysBetween(s.last_paper_date, new Date())}d ago
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: gradeColor(s.grade_band) }}>
              {s.grade_band}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>{s.avg_score}% avg</div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

#### 2. Topic Weakness Heatmap

```sql
-- RPC: get_class_topic_heatmap(class_id UUID, subject TEXT)
-- Returns top 15 topics by error frequency across the class

SELECT
  e.topic,
  e.type AS error_type,
  COUNT(*) AS error_count,
  COUNT(DISTINCT e.user_id) AS student_count
FROM errors e
JOIN class_memberships cm ON cm.student_id = e.user_id
WHERE cm.class_id = class_id
  AND cm.sharing_consent = true
  AND e.subject = subject
GROUP BY e.topic, e.type
ORDER BY error_count DESC
LIMIT 15;
```

Rendered as a colour-coded table:

```
Topic                          | Students | Errors | Type
------------------------------ | -------- | ------ | ------
Integration: by substitution   |    12    |   34   | method [████████░░]
Organic: mechanisms            |    10    |   27   | forgot [███████░░░]
Differentiation: chain rule    |     8    |   19   | calc   [█████░░░░░]
```

#### 3. Individual Student View

Full read-only mirror of the student's own Analytics + Tracker view, with teacher-specific overlays (alert history, engagement score).

#### 4. Alert Inbox

```jsx
function AlertInbox({ classId, C }) {
  // Pulled from student_alerts where class_id matches and acknowledged = false

  const ALERT_MESSAGES = {
    'no_papers_14d': s => `${s.name} hasn't logged a paper in 14+ days`,
    'score_drop_10': s => `${s.name}'s score dropped 10+ points on last paper`,
    'recurring_topic': s => `${s.name} has ${s.detail.count} errors in ${s.detail.topic}`,
  }

  return alerts.map(a => (
    <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 0',
      borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 13, color: C.text, flex: 1 }}>
        {ALERT_MESSAGES[a.alert_type](a)}
      </div>
      <button onClick={() => acknowledgeAlert(a.id)}
        style={{ fontSize: 12, color: C.muted, background: 'transparent',
          border: `1px solid ${C.border}`, borderRadius: 5, padding: '3px 10px',
          cursor: 'pointer', fontFamily: 'inherit' }}>
        Done
      </button>
    </div>
  ))
}
```

---

## Alert Engine (Supabase Edge Function)

Runs daily at 07:00 via pg_cron:

```typescript
// Edge Function: generate-alerts
async function generateAlerts() {
  const { data: memberships } = await supabase
    .from('class_memberships')
    .select('student_id, class_id')
    .eq('sharing_consent', true)

  for (const { student_id, class_id } of memberships) {
    // Check 1: no papers in 14 days
    const { data: recentPapers } = await supabase
      .from('scores')
      .select('created_at')
      .eq('user_id', student_id)
      .gte('created_at', daysAgo(14))

    if (!recentPapers?.length) {
      await upsertAlert(student_id, class_id, 'no_papers_14d', {})
    }

    // Check 2: score drop of 10+ points
    const { data: lastTwo } = await supabase
      .from('scores')
      .select('pct')
      .eq('user_id', student_id)
      .order('created_at', { ascending: false })
      .limit(2)

    if (lastTwo?.length === 2 && lastTwo[0].pct - lastTwo[1].pct <= -10) {
      await upsertAlert(student_id, class_id, 'score_drop_10', {
        from: lastTwo[1].pct, to: lastTwo[0].pct
      })
    }

    // Check 3: recurring topic (3+ errors in same topic in 7 days)
    const { data: errors } = await supabase
      .from('errors')
      .select('topic')
      .eq('user_id', student_id)
      .gte('created_at', daysAgo(7))

    const topicCounts = errors?.reduce((acc, e) =>
      ({ ...acc, [e.topic]: (acc[e.topic] ?? 0) + 1 }), {}) ?? {}

    for (const [topic, count] of Object.entries(topicCounts)) {
      if (count >= 3) {
        await upsertAlert(student_id, class_id, 'recurring_topic', { topic, count })
      }
    }
  }
}
```

---

## Weekly Digest Email

Sent every Monday at 08:00 to all teachers with active classes. Uses Resend for delivery.

**Format (plain text + HTML):**

```
Battle Plan — Weekly Class Summary
Week ending [date]

Year 13 Maths Set 1 (18 students)
──────────────────────────────────
Class average this week:  71%  (↑3% vs last week)
Most active student:      [name] — 5 papers logged
Students needing attention:
  ⚠ [name] — no papers in 16 days
  ⚠ [name] — score dropped from 74% to 61%

Top weak topics across class:
  1. Integration: by substitution (12 errors, 8 students)
  2. Organic: mechanisms (9 errors, 6 students)

View full dashboard → [link]
```

---

## School Admin Panel (`/school-admin`)

| Feature | Description |
|---|---|
| Class management | Create classes, assign teachers, generate student join codes |
| Student roster | View all school students, their class membership, consent status |
| Teacher management | Invite teachers, assign roles (teacher / HOD / admin) |
| Branding | Upload school logo, set accent colour (applied to student app for school-linked users) |
| Usage report | Exportable CSV: papers logged per student, date range filter |
| Billing | Stripe Customer Portal — manage annual licence subscription |

---

## Student Join Flow

1. Teacher creates a class in school admin → gets a 6-character join code (e.g. `MX7K2P`)
2. Student enters code in Account settings → joins the class
3. Student sees consent dialog: "Your teacher [name] at [school] will see your past paper scores and error log. You can opt out at any time."
4. Student accepts → `sharing_consent = true`

---

## White-Label Branding

When a student is linked to a school with a logo and accent colour, the student app applies the school's branding:

```javascript
// In App.jsx boot sequence, after loading user_profiles
if (user_profile.school_id) {
  const { data: school } = await supabase
    .from('schools')
    .select('logo_url, accent_color, name')
    .eq('id', user_profile.school_id)
    .single()

  if (school) {
    document.documentElement.style.setProperty('--school-accent', school.accent_color)
    // Store in state for rendering school badge in nav
    setSchool(school)
  }
}
```

---

## Implementation Phases

| Phase | Scope | Effort |
|---|---|---|
| 1 | Data model + RLS policies + student consent flow | 3 days |
| 2 | Student join code flow + class membership | 2 days |
| 3 | Teacher portal: class overview + individual view | 1.5 weeks |
| 4 | Topic heatmap + alert inbox | 1 week |
| 5 | Alert engine (Edge Function + pg_cron) | 3 days |
| 6 | Weekly digest email (Resend template) | 2 days |
| 7 | School admin panel (class mgmt + branding) | 1 week |
| 8 | Stripe subscription billing | 3 days |

**Total: ~6 weeks for full platform**
