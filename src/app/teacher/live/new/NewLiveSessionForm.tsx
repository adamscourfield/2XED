'use client';

import { useNewLiveSession } from './useNewLiveSession';
import { NewLiveSessionStep1 } from './NewLiveSessionStep1';
import { NewLiveSessionStep2 } from './NewLiveSessionStep2';
import type { Classroom, Subject, Skill } from './useNewLiveSession';

interface Props {
  classrooms: Classroom[];
  subjects: Subject[];
  skillsBySubject: Skill[];
}

export function NewLiveSessionForm({ classrooms, subjects, skillsBySubject }: Props) {
  const data = useNewLiveSession({ classrooms, subjects, skillsBySubject });

  if (data.step === 1) {
    return (
      <NewLiveSessionStep1
        classrooms={classrooms}
        subjects={subjects}
        skillsBySubject={skillsBySubject}
        data={data}
      />
    );
  }

  return <NewLiveSessionStep2 skillsBySubject={skillsBySubject} data={data} />;
}
