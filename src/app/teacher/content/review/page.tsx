import { redirect } from 'next/navigation';

/** @deprecated Use `/teacher/content/booklet-review` — kept for bookmarks. */
export default function TeacherContentReviewRedirectPage() {
  redirect('/teacher/content/booklet-review');
}
