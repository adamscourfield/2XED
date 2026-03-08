# Config Vars (v1)

## Learning config
- `NEXT_PUBLIC_ROUTED_SKILL_CODES`
  - CSV of routed skills (default: `N1.1`)
- `NEXT_PUBLIC_DIAGNOSTIC_STRANDS`
  - CSV of strands for diagnostic selector (default: `PV,ADD,MUL,FAC,FDP`)

## Reteach config
- `RETEACH_DB_REQUIRED`
  - `true` => require DB reteach content, throw if missing
  - `false` (default) => allow fallback content

## Reward economy config
- `REWARD_TABLE_JSON`
  - Optional JSON override for reward values.
  - Must be an object keyed by reward event names.

Example:
```json
{
  "diagnostic_item_correct": { "xp": 6, "tokens": 0, "reason": "Diag correct" },
  "route_completed": { "xp": 25, "tokens": 1, "reason": "Route done" }
}
```
