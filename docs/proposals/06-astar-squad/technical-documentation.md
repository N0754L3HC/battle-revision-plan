# Technical & Feature Documentation: A* Squad Community

**Product:** BP-006 — A* Squad Community Subscription  
**Stack:** React (existing) + Supabase (existing) + Stripe + Discord API + Resend

---

## System Overview

Five new components on top of existing Battle Plan:

1. **Application & cohort matching** — student applies, system matches into a cohort
2. **Subscription billing** — Stripe recurring payments, seat management
3. **Discord integration** — auto-provision Discord server channels and roles per cohort
4. **In-app Squad features** — leaderboard, shared paper log, cohort avg overlay
5. **Moderator portal** — session planning, cohort management, resource library

---

## Data Model

```sql
-- Cohorts
CREATE TABLE squads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,              -- e.g. 'Maths A* Squad · Spring 2026 · C1'
  subjects        TEXT[] NOT NULL,            -- ['Mathematics','Chemistry']
  target_grade    TEXT DEFAULT 'A'
                  CHECK (target_grade IN ('A','A*')),
  board           TEXT,                       -- 'AQA','Edexcel','OCR',null=mixed
  capacity        INTEGER DEFAULT 48,
  enrolled_count  INTEGER DEFAULT 0,
  term_start      DATE NOT NULL,
  term_end        DATE NOT NULL,
  discord_guild_id TEXT,                      -- Discord server ID
  discord_invite  TEXT,                       -- invite URL
  status          TEXT DEFAULT 'forming'
                  CHECK (status IN ('forming','active','completed','cancelled')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Squad applications
CREATE TABLE squad_applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID REFERENCES auth.users(id),
  subjects       TEXT[] NOT NULL,
  target_grades  JSONB NOT NULL,             -- {"Mathematics":"A*","Chemistry":"A"}
  board_pref     TEXT,
  motivation     TEXT,                       -- short answer, max 200 chars
  bp_score_avg   NUMERIC(5,2),              -- computed from app scores at time of application
  status         TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','matched','waitlisted','rejected')),
  squad_id       UUID REFERENCES squads(id),
  applied_at     TIMESTAMPTZ DEFAULT now()
);

-- Squad memberships (after matching)
CREATE TABLE squad_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id        UUID REFERENCES squads(id),
  student_id      UUID REFERENCES auth.users(id),
  stripe_subscription_id TEXT NOT NULL,
  discord_user_id TEXT,                      -- set when student links Discord
  leaderboard_opt_in BOOLEAN DEFAULT true,
  joined_at       TIMESTAMPTZ DEFAULT now(),
  left_at         TIMESTAMPTZ,
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active','cancelled','removed')),
  UNIQUE(squad_id, student_id)
);

-- Moderators
CREATE TABLE squad_moderators (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id),
  name         TEXT NOT NULL,
  bio          TEXT,
  subjects     TEXT[],
  university   TEXT,
  a_level_year INTEGER,                      -- year they sat A-levels
  pay_per_cohort_pence INTEGER DEFAULT 15000, -- £150
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Moderator–squad assignments
CREATE TABLE squad_moderator_assignments (
  moderator_id UUID REFERENCES squad_moderators(id),
  squad_id     UUID REFERENCES squads(id),
  weeks        INTEGER DEFAULT 4,            -- how many weeks they lead sessions
  PRIMARY KEY (moderator_id, squad_id)
);

-- Shared paper log (squad-level, opt-in)
CREATE TABLE squad_paper_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id   UUID REFERENCES squads(id),
  student_id UUID REFERENCES auth.users(id),
  subject    TEXT NOT NULL,
  paper_name TEXT NOT NULL,                  -- e.g. "Paper 1: Pure Maths 1 — 2023"
  score_pct  INTEGER,                        -- optional, can hide score
  logged_at  TIMESTAMPTZ DEFAULT now()
);

-- Resource vault
CREATE TABLE squad_resources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id     UUID REFERENCES squads(id),
  uploaded_by  UUID REFERENCES auth.users(id),
  title        TEXT NOT NULL,
  subject      TEXT NOT NULL,
  type         TEXT CHECK (type IN ('notes','mark_scheme_annotation','flashcards','diagram','other')),
  file_url     TEXT NOT NULL,                -- Cloudinary or Supabase Storage
  upvotes      INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

---

## Cohort Matching Algorithm

### Matching criteria (priority order)

1. Subject overlap (must share at least 2 of 3 subjects with cohort)
2. Target grade band (A/A* — gated by application)
3. Exam board (prefer same board; mixed board allowed if no same-board cohort is forming)
4. Application order (earlier applicants placed first)

```typescript
// Edge Function: match-applicant
async function matchApplicant(applicationId: string) {
  const { data: app } = await supabase
    .from('squad_applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  // Find open squads with subject overlap
  const { data: candidates } = await supabase
    .from('squads')
    .select('*, enrolled_count')
    .eq('status', 'forming')
    .lt('enrolled_count', 48)
    .contains('subjects', app.subjects.slice(0, 2))  // at least 2 subject overlap

  if (!candidates?.length) {
    // No open squad — create a new one or add to waitlist
    const shouldCreateNew = await checkIfNewSquadNeeded(app)
    if (shouldCreateNew) {
      const squad = await createNewSquad(app)
      await assignToSquad(app, squad.id)
    } else {
      await supabase.from('squad_applications').update({ status: 'waitlisted' }).eq('id', applicationId)
    }
    return
  }

  // Score each candidate squad
  const scored = candidates.map(squad => ({
    squad,
    score: scoreSquadMatch(app, squad),
  })).sort((a, b) => b.score - a.score)

  await assignToSquad(app, scored[0].squad.id)
}

function scoreSquadMatch(app: Application, squad: Squad): number {
  let score = 0
  const subjectOverlap = app.subjects.filter(s => squad.subjects.includes(s)).length
  score += subjectOverlap * 10
  if (squad.board === app.board_pref) score += 5
  score += (48 - squad.enrolled_count)  // prefer fuller squads (faster to start)
  return score
}
```

---

## Subscription Billing

### Stripe setup

```typescript
// Create subscription when student is matched to a squad
async function createSquadSubscription(studentId: string, squadId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('stripe_customer_id, email')
    .eq('id', studentId)
    .single()

  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ email: profile!.email })
    customerId = customer.id
    await supabase.from('user_profiles').update({ stripe_customer_id: customerId }).eq('id', studentId)
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: process.env.STRIPE_SQUAD_PRICE_ID }],  // £7.99/mo recurring
    metadata: { squadId, studentId },
  })

  await supabase.from('squad_members').insert({
    squad_id: squadId,
    student_id: studentId,
    stripe_subscription_id: subscription.id,
  })

  return subscription.id
}
```

### Cancellation

On `customer.subscription.deleted` webhook:

```typescript
await supabase.from('squad_members')
  .update({ status: 'cancelled', left_at: new Date().toISOString() })
  .eq('stripe_subscription_id', event.data.object.id)

// Remove Discord role via Discord API
await removeDiscordRole(member.discord_user_id, squad.discord_guild_id)
```

---

## Discord Integration

### Per-cohort Discord server structure

Each squad gets its own Discord server (not a channel in a shared server):

```
# welcome
# rules-and-schedule
---
📚 SUBJECTS
# maths-general
# chemistry-general
# shared-resources
---
📊 PERFORMANCE  
# paper-log-this-week
# leaderboard (auto-updated)
---
🏆 SESSIONS
# session-notes
# battle-round-results
---
💬 GENERAL
# off-topic
```

### Auto-provisioning

```typescript
// Edge Function: provision-discord-server
async function provisionSquadDiscord(squadId: string) {
  const { data: squad } = await supabase
    .from('squads')
    .select('*')
    .eq('id', squadId)
    .single()

  // Create server via Discord API
  const guild = await discord.guilds.create({
    name: squad.name,
    // Apply template with pre-defined channel structure
  })

  // Create subject-specific channels
  for (const subject of squad.subjects) {
    await discord.channels.create(guild.id, {
      name: subject.toLowerCase().replace(' ', '-'),
      topic: `${subject} discussion, resources, and questions`,
      parent_id: subjectsCategory.id,
    })
  }

  // Create permanent invite link
  const invite = await discord.invites.create(guild.channels.cache.first().id, { maxAge: 0 })

  // Store in Supabase
  await supabase.from('squads').update({
    discord_guild_id: guild.id,
    discord_invite: `https://discord.gg/${invite.code}`,
  }).eq('id', squadId)
}
```

### Leaderboard bot

A simple Discord bot posts weekly to `#leaderboard`:

```typescript
// Runs every Sunday at 20:00
async function postWeeklyLeaderboard(guildId: string) {
  const { data: squad } = await supabase
    .from('squads')
    .select('id')
    .eq('discord_guild_id', guildId)
    .single()

  const { data: members } = await supabase
    .from('squad_members')
    .select('student_id, discord_user_id')
    .eq('squad_id', squad.id)
    .eq('leaderboard_opt_in', true)

  // Pull each member's papers from this week
  const leaderboard = await Promise.all(members.map(async m => {
    const { data: papers } = await supabase
      .from('scores')
      .select('pct')
      .eq('user_id', m.student_id)
      .gte('created_at', daysAgo(7))

    return {
      discordUserId: m.discord_user_id,
      papersThisWeek: papers?.length ?? 0,
      avgScore: papers?.length ? avg(papers.map(p => p.pct)) : null,
    }
  }))

  const sorted = leaderboard
    .filter(m => m.papersThisWeek > 0)
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))

  const message = [
    '**📊 Weekly Leaderboard**',
    '',
    ...sorted.slice(0, 10).map((m, i) =>
      `${i + 1}. <@${m.discordUserId}> — ${m.papersThisWeek} paper${m.papersThisWeek !== 1 ? 's' : ''} · avg ${m.avgScore?.toFixed(0)}%`
    ),
    '',
    `${members.length - sorted.length} members haven't logged a paper this week — get it done! 💪`,
  ].join('\n')

  await discord.channels.send(leaderboardChannelId, { content: message })
}
```

---

## In-App Squad Features

### Squad leaderboard widget (in Analytics view)

```jsx
function SquadWidget({ squad, myStats, cohortStats, C }) {
  const myPercentile = cohortStats.findIndex(s => s.isMe) / cohortStats.length * 100

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.accent,
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        A* Squad
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted }}>Your avg</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>{myStats.avg}%</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: C.muted }}>Squad avg</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.muted }}>{cohortStats.avg}%</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: C.muted }}>Your rank</div>
          <div style={{ fontSize: 24, fontWeight: 700,
            color: myPercentile <= 20 ? '#22c55e' : C.text }}>
            Top {Math.round(myPercentile)}%
          </div>
        </div>
      </div>
      <a href={squad.discord_invite} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 12, color: C.accent, textDecoration: 'none' }}>
        Open squad Discord →
      </a>
    </div>
  )
}
```

### Shared paper log

```jsx
function SharedPaperLog({ squadId, mySubjects, C }) {
  // Shows which papers cohort members have done, without duplication
  // Helps students avoid doing papers everyone else has already done

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 10 }}>
        Papers your squad has done this week
      </div>
      {papers.map(p => (
        <div key={p.paper_name} style={{ display: 'flex', justifyContent: 'space-between',
          padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 13, color: C.text }}>{p.paper_name}</span>
          <span style={{ fontSize: 12, color: C.muted }}>{p.count} students</span>
        </div>
      ))}
    </div>
  )
}
```

---

## Moderator Portal (`/moderator`)

| Feature | Description |
|---|---|
| My squads | List of assigned squads, member counts, session schedule |
| Session template | Pre-built Google Meet agenda generator for each session type |
| Resource upload | Upload files to the squad resource vault |
| Member activity | Which members haven't logged papers this week (for prompting) |
| Session notes | Post-session notes visible to all members |
| Earnings | Pay tracker: £150/cohort, paid on term completion |

---

## Implementation Phases

| Phase | Scope | Effort |
|---|---|---|
| 1 | Data model + cohort matching algorithm | 4 days |
| 2 | Application flow (student-facing) | 3 days |
| 3 | Stripe recurring subscription + seat management | 1 week |
| 4 | Discord server provisioning + invite flow | 1 week |
| 5 | Discord leaderboard bot | 3 days |
| 6 | In-app Squad widget (analytics overlay, shared paper log) | 1 week |
| 7 | Resource vault (upload, browse, upvote) | 4 days |
| 8 | Moderator portal | 1 week |
| 9 | Onboarding email sequence (welcome, session reminders, weekly digest) | 3 days |

**Total: ~7 weeks for full platform**
