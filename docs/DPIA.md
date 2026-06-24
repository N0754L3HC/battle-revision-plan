# Data Protection Impact Assessment (DPIA) - Battle Plan

**Service:** Battle Plan (beattheexam.org) - a revision tracker for UK GCSE & A-Level students
**Controller:** Charis Muzenda, trading as Battle Plan, United Kingdom
**Prepared:** 2026-06-24  ·  **Review:** annually or on any material change
**Status:** Lightweight DPIA (ICO Age Appropriate Design Code - service likely accessed by under-18s)

---

## 1. Why a DPIA?
The service is likely to be accessed by children (GCSE students are typically 14-16; A-Level 16-18). Under UK GDPR Art 35 and the ICO Children's Code, a DPIA is expected for services processing children's data. This documents the processing, risks, and mitigations.

## 2. Description of processing
- **What:** account email, display name (first name only), chosen exam level/subjects/board, self-entered past-paper marks, topic confidence (RAG) ratings, study sessions, optional school name, optional uploaded paper images/PDFs for AI marking.
- **Why:** to let a student track revision progress, see grade estimates, identify weak topics, and (optionally) get AI feedback on their own work.
- **Lawful basis:** performance of a contract (providing the service the user signed up for); consent for optional features (school leaderboard opt-in, AI uploads, analytics).
- **Who has access:** the user; the operator (admin) for support; processors listed below. Data is per-user, isolated by row-level security.
- **Retention:** for the life of the account; deleted on account deletion. Uploaded marking files are deleted immediately after marking.

## 3. Data minimisation (key Children's Code point)
- **No date of birth / age collected** beyond a self-declared year group (Y10-Y13).
- First name only - no full name, address, or phone required.
- No behavioural advertising, no third-party analytics, no tracking cookies, no profiling for marketing.
- High-privacy defaults: profile data private by default; school leaderboard is strictly opt-in.

## 4. Processors / sub-processors (recipients)
| Processor | Purpose | Location / safeguard |
|---|---|---|
| Supabase | Database, auth, file storage | Check project region; SCCs where outside UK/EEA |
| Vercel | App hosting / serverless | SCCs |
| Stripe | Payment processing (Commander tier) | PCI-DSS; SCCs |
| Anthropic (Claude) | AI marking & chat | SCCs; data not used for training (API) |
| Google (Gemini) | AI chat fallback | SCCs |
| Resend | Transactional email | SCCs |

> All AI providers are used via API; confirm in each provider's DPA that API inputs are not used for model training.

## 5. Risks & mitigations
| Risk | Likelihood | Mitigation |
|---|---|---|
| Child enters identifying/sensitive info into AI chat | Med | In-app notice "don't share personal info"; AI output marked non-authoritative (Terms §10) |
| Upload of copyrighted exam material | Med | Terms §9.1 forbids it; upload notice; files deleted after marking |
| Unauthorised access to another student's data | Low | Row-level security; per-column update grants; auth required |
| International transfer of children's data | Low/Med | Confirm processor regions + SCCs (action below) |
| Over-collection | Low | Minimised by design (no DoB, first name only) |

## 6. Outcome
Residual risk is **low**. Processing is necessary, minimised, and privacy-protective by design. Outstanding actions: confirm processor regions/DPAs and SCCs; complete ICO registration; insert controller legal identity.

## 7. Sign-off
Owner: ____________________   Date: __________
