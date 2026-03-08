export const LEARNING_CONFIG = {
  routedSkillCodes: (process.env.NEXT_PUBLIC_ROUTED_SKILL_CODES ?? 'N1.1')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
  diagnosticStrands: (process.env.NEXT_PUBLIC_DIAGNOSTIC_STRANDS ?? 'PV,ADD,MUL,FAC,FDP')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
};

export function isRoutedSkill(skillCode: string): boolean {
  return LEARNING_CONFIG.routedSkillCodes.includes(skillCode.trim().toUpperCase());
}
