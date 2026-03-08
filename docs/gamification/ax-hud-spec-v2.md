# AX HUD Spec (v2)

## Objective
Keep motivation visible without distracting from the question.

## Placement
Top-right compact HUD in learning/diagnostic screens.

## HUD contents
1. AX balance (always)
2. Streak days (icon + number)
3. Next-level progress mini bar (optional v2.1)

## Interaction
- Tap/click opens mini panel:
  - recent rewards
  - streak explanation
  - next unlock preview

## Display rules
- Visible at all times during question answering.
- Never overlap question text area.
- Keep visual weight below question prominence.

## States
- Loading: skeleton placeholder.
- Sync pulse when AX updates.
- Offline mode: local queued indicator.

## Telemetry
Emit when HUD updates:
- `hud_reward_update_seen`
- `hud_opened`
- `hud_unlock_preview_opened`
