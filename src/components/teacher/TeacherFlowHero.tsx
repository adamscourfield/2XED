import { StudentFlowHero } from '@/components/student/StudentFlowHero';

type Props = {
  eyebrow: string;
  title: string;
  lead?: string;
  variant?: 'full' | 'compact';
  className?: string;
  titleId?: string;
};

/** Re-export with teacher-facing naming; same visual system as student flow hero. */
export function TeacherFlowHero(props: Props) {
  return <StudentFlowHero {...props} />;
}
