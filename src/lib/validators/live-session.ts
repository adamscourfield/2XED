import { z } from 'zod';

export const CreateLiveSessionSchema = z.object({
  classroomId: z.string().min(1),
  subjectSlug: z.string().min(1),
  skillCode: z.string().min(1).optional(),
});

export const UpdateLiveSessionSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
  phase: z.enum(['DIAGNOSTIC', 'EXPLANATION', 'SHADOW_CHECK', 'REVIEW']).optional(),
});

export const HandbackSchema = z.object({
  participantId: z.string().min(1),
});

export const LaneStudentSchema = z.object({
  participantId: z.string(),
  studentUserId: z.string(),
  studentName: z.string(),
  masteryProbability: z.number().min(0).max(1),
  currentExplanationRouteType: z.string().nullable(),
  escalationReason: z.enum(['SHADOW_CHECK_FAILED', 'ANCHOR_FAILED', 'MISCONCEPTION_FAILED', 'SCAFFOLDED_CORRECT', 'MANUAL_TEACHER']).nullable(),
  isUnexpectedFailure: z.boolean(),
  waitingMinutes: z.number().min(0),
  holdingAtFinalCheck: z.boolean(),
});

export const LaneGroupSchema = z.object({
  count: z.number().int().min(0),
  students: z.array(LaneStudentSchema),
});

export const LaneViewResponseSchema = z.object({
  lane1: LaneGroupSchema,
  lane2: LaneGroupSchema,
  lane3: LaneGroupSchema.extend({
    reteachAlert: z.boolean(),
    reteachMessage: z.string().nullable(),
  }),
  totalParticipants: z.number().int().min(0),
  unassigned: z.number().int().min(0),
});

export type CreateLiveSessionInput = z.infer<typeof CreateLiveSessionSchema>;
export type UpdateLiveSessionInput = z.infer<typeof UpdateLiveSessionSchema>;
export type HandbackInput = z.infer<typeof HandbackSchema>;
export type LaneStudent = z.infer<typeof LaneStudentSchema>;
export type LaneGroup = z.infer<typeof LaneGroupSchema>;
export type LaneViewResponse = z.infer<typeof LaneViewResponseSchema>;
