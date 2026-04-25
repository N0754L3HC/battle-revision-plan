# A* Battle Revision Plan

**A deployed React web app for tracking A-Level exam preparation — live at [battle-revision-plan.vercel.app](https://battle-revision-plan.vercel.app)**

---

## What Is This?

A personalised revision planning tool built and deployed for the 2026 A-Level exam season (Maths, Further Maths, Computer Science). The app tracks past paper completion, exam countdowns, grade boundaries, and weekly revision schedules — all in one place.

Also includes a full friend profile mode covering Chemistry, Physics, and Economics so a friend could use the same app for their subjects.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 (Vite) |
| Language | JavaScript (JSX) |
| Deployment | Vercel |
| State | React hooks (useState, useEffect, useRef) |

---

## Features

- **Live exam countdown timers** — days/hours remaining for each paper
- **Past paper logger** — mark papers done, track per subject
- **Grade boundary reference** — Edexcel 9MA0, 9FM0, OCR H446 boundaries per grade
- **10-week schedule** — day-by-day plan from March to June 2026
- **Friend mode** — parallel profile for Chemistry (AQA), Physics (OCR A), Economics (AQA)
- **Paper recommendations** — surfaces untouched papers ranked by topic gap
- **Responsive** — works on desktop and mobile

---

## Subjects Covered

| Subject | Board | Papers |
|---|---|---|
| Mathematics | Edexcel 9MA0 | P1, P2, P3 |
| Further Mathematics | Edexcel 9FM0 | CP1, CP2, FP1, Decision 1 |
| Computer Science | OCR H446 | Papers 1 & 2 |
| Chemistry | AQA 7405 | Papers 1, 2, 3 |
| Physics | OCR H557 | Components 1, 2, 3 |
| Economics | AQA 7136 | Papers 1, 2, 3 |

---

## How to Run Locally

```bash
git clone https://github.com/N0754L3HC/battle-revision-plan
cd battle-revision-plan
npm install
npm run dev
```

Or visit the live deployment: **[battle-revision-plan.vercel.app](https://battle-revision-plan.vercel.app)**

---

## What This Demonstrates

- **React development** — hooks, effects, ref-based timers, conditional rendering
- **Data modelling** — exam schedules and grade boundaries as structured JS objects
- **CI/CD** — GitHub → Vercel continuous deployment
- **Real-world motivation** — built to solve an actual problem, used daily for exam prep
