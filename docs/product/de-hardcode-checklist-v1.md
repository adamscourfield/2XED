# De-hardcode Checklist (v1)

Goal: move learning-critical behavior from code constants into DB/config.

## 1) Subject handling
- [x] Remove hard check `subjectSlug === 'ks3-maths'` from diagnostic pages
- [ ] Move admin insight/content routes to dynamic subject selection (not route-name locked)

## 2) Routed-skill logic
- [x] Replace `if (skillCode === 'N1.1')` with config-driven skill gating
- [x] Add `NEXT_PUBLIC_ROUTED_SKILL_CODES` config (CSV)
- [ ] Store per-skill route policy in DB (preferred) instead of env

## 3) Diagnostic strands
- [x] Replace hardcoded `['PV','ADD','MUL','FAC','FDP']` with config-driven list
- [x] Add `NEXT_PUBLIC_DIAGNOSTIC_STRANDS` config (CSV)
- [ ] Move strand policy to DB by subject/version

## 4) Reteach content
- [x] DB-backed explanation routes exist
- [ ] Remove code fallback reteach content from production path
- [ ] Add content-completeness validation in admin panel

## 5) Reward economy
- [ ] Move reward table from code to DB/config table
- [ ] Add versioned reward profile (A/B test support)

## 6) Analytics filters
- [ ] Remove hardcoded N1.1-only filters from admin views
- [ ] Add skill/strand/date filter controls in UI

## 7) Release gate
- [ ] No learning-path decisions rely on fixed skill code literals
- [ ] No production route lock to one subject slug
- [ ] Config/DB defaults documented and seeded
