# Business Proposal: Precision Tutor Lead Marketplace

**Prepared by:** Battle Plan  
**Date:** May 2026  
**Proposal ref:** BP-003

---

## Executive Summary

Every existing tutoring marketplace (MyTutor, Tutorful, Superprof) works the same way: student says "I need help with Chemistry," tutors list themselves, and a manual match is made. Battle Plan has something none of them have — a real-time, objective record of exactly where each student is losing marks, at the topic level, right now. This proposal turns that error log into a precision lead-generation engine: students get matched with tutors who specialise in their exact weaknesses, tutors pay for leads that are prequalified with objective performance data, and Battle Plan takes a commission. No generic matching. No wasted sessions.

---

## The Problem

### For students
Tutoring is expensive (£30–80/hr). Students often waste the first 1–3 sessions explaining their weaknesses to a tutor who then spends time diagnosing. A student who has logged "I keep losing marks on Integration by Substitution — method errors" has already done the diagnosis. They need execution, not assessment.

### For tutors
Quality lead generation is the bottleneck for independent tutors. They pay tutoring platforms £20–50/month for a listing and then compete on price with 200 others. The leads they get are vague ("I want help with Maths") and convert poorly. A lead that says "student is scoring 58% on Edexcel Maths Paper 2, 9 errors logged in Integration and Differential Equations over the past 3 weeks" is worth 5x a generic enquiry.

### For tutoring platforms
Existing platforms have no performance data. They can't tell a tutor if a student improved after sessions. They can't verify that a tutor actually specialises in what they claim.

---

## The Opportunity

- 1.2 million A-level students in the UK
- ~35% use private tutoring (SUTTON Trust, 2024) — ~420,000 potential users
- Average tutoring spend: £800–£2,400 per student per year
- Independent tutors: 60,000+ in the UK, most without reliable lead generation
- No competitor uses objective performance data for matching

---

## How It Works

### Student side (free)

1. Student logs past paper scores and errors as they already do in Battle Plan
2. After logging 5+ errors in a subject, a contextual prompt appears: **"Want help with this? We'll find you a tutor who specialises in exactly this."**
3. Student confirms interest and shares their error log summary (no personal details yet)
4. Battle Plan sends a concise brief to matched tutors: subject, board, weak topics, grade trajectory, preferred session format (online/in-person), time zone

### Tutor side (paid per lead or commission)

1. Tutors register on Battle Plan Tutor Portal
2. Set their specialisms at topic level (not just subject level) — e.g. "Edexcel A-level Maths: Integration, Differential Equations, Mechanics"
3. Set their rate, availability, and whether they accept online/in-person
4. Receive leads that match their specialism profile
5. Submit a short pitch (3 sentences max) to the student
6. If the student books, Battle Plan takes 18% of the first 4 sessions

### The match

A student's Battle Plan error log maps directly to tutor specialism tags. A student with 12 errors in "Organic Chemistry — mechanism errors" matches tutors tagged with "AQA Chemistry: Organic mechanisms." This is not an AI guess — it is a direct lookup.

---

## Revenue Model

| Source | Mechanism | Rate |
|---|---|---|
| Commission (primary) | 18% of sessions 1–4 | Per booking |
| Premium tutor listing | Enhanced profile, priority in results | £15/mo |
| Lead pack (alternative) | Tutors buy 10 leads upfront | £8/lead |

**Session economics:**
- Average session: £45
- 18% commission: £8.10 per session
- 4 sessions per new booking: £32.40 per student conversion
- Conversion rate target: 25% of leads

**Year 1 target:** 2,000 student–tutor matches → £64,800 commission revenue  
**Year 2 target:** 8,000 matches + premium listing revenue → £310,000

---

## Go-to-Market

**Phase 1 — Tutor supply (months 1–2):**  
Recruit 200 tutors before launching the student-facing product. Partner with a tutor community (e.g. Edexcel teacher Facebook groups, TES tutors forum). Offer first 3 months free for early-adopter tutors.

**Phase 2 — Student demand (months 3–4):**  
Enable the "find a tutor" prompt in the app. Start with Maths and Chemistry — highest tutoring demand, highest error log density.

**Phase 3 — Feedback loop (months 5–12):**  
After each tutoring engagement, student logs follow-up past paper scores. Show the improvement delta on the tutor's profile. This becomes a quality signal that drives more bookings to high-performing tutors.

---

## Competitive Advantage

- **Objective data, not self-reported need.** Tutors know exactly what to prepare before the first session.
- **Post-session verification.** Follow-up scores in Battle Plan show whether the tutoring worked — a quality signal no platform has.
- **Tutor specialisation at topic level.** Not "Maths tutor" — "Edexcel integration and differential equations tutor."
- **Timing.** The prompt appears at exactly the moment a student is confronting their weakness — highest conversion moment possible.

---

## Risks

| Risk | Mitigation |
|---|---|
| Chicken-and-egg: no tutors before students and vice versa | Build tutor supply first, 60-day head start |
| Tutors bypassing the platform after initial match | Session 1 is booked through Battle Plan; ongoing relationship is harder to track but sessions 1–4 commission covers CAC |
| Student privacy (sharing error logs with tutors) | Error log summary shared anonymously until student accepts a tutor |
| Quality control on tutors | DBS check requirement, rate review after 10 sessions |

---

## Ask

Initial investment required: **£22,000**

- £6,000: Tutor portal development (registration, specialism tagging, lead inbox)
- £8,000: Matching engine + student-side prompt integration
- £4,000: Payment processing setup (Stripe Connect for split payments)
- £4,000: Tutor recruitment and early community building
