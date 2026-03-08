# AX Implementation Sprint (v2)

## Day 1
1. Rename player-facing reward language to AX.
2. Add compact AX HUD component to LearnSession + DiagnosticRunClient.
3. Hook HUD to `getUserGamificationSummary` values.

## Day 2
1. Add micro animation hooks for question correct/incorrect.
2. Add milestone hooks for route complete + secure transition.
3. Add reduced-motion toggle support.

## Day 3
1. Wire anti-spam safeguard in reward grant pipeline.
2. Add event logging for HUD interactions.
3. QA pass for visual clarity and performance.

## Acceptance criteria
- Question remains most prominent UI element.
- AX visible on all question screens.
- Every answer produces immediate feedback response.
- No frame drops on mid-range devices in normal mode.
