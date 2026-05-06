-- Add HINTS_USED to the EscalationReason enum so that LANE_2 assignments
-- caused by hint usage can be recorded with an accurate reason.
ALTER TYPE "EscalationReason" ADD VALUE IF NOT EXISTS 'HINTS_USED';
