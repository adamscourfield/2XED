# De-hardcode Implementation Tickets (v1)

## DH-01 Subject routing de-hardcode
- Remove hard subject slug guards in diagnostic flows.
- Acceptance: any valid subject slug with data can run diagnostic.

## DH-02 Routed skill config
- Introduce config utility for routed skills + diagnostic strands.
- Acceptance: routed logic uses `isRoutedSkill(skillCode)` only.

## DH-03 DB route policy table
- Add `RoutePolicy` table: subjectId, skillId/code, enabled, fallbackMode, secureRule.
- Acceptance: route assignment reads DB policy first.

## DH-04 Reteach content strict DB mode
- Add `RETEACH_DB_REQUIRED=true` option.
- Acceptance: if missing DB content and strict mode enabled, fail with admin-visible error (not silent fallback).

## DH-05 Reward profile config table
- Add `RewardProfile` + `RewardRule` tables.
- Acceptance: reward grants come from active profile, not code constants.

## DH-06 Admin dynamic filters
- Add skill/subject filters to insight/interventions pages.
- Acceptance: no hardcoded `N1.1`/`ks3-maths` in analytics logic.

## DH-07 Validation + migration checks
- Add startup check script for required config/DB rows.
- Acceptance: clear pass/fail output before go-live.
