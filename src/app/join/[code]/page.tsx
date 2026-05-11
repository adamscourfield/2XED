import { redirect } from 'next/navigation';

/**
 * /join/[code] — shareable student join link.
 *
 * Teachers copy this URL from the "Copy link" button in the live workspace.
 * This page immediately redirects to the student live view with the code
 * pre-filled, so students skip the manual code-entry step.
 *
 * Example: /join/ABC123  →  /student/live?code=ABC123
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  // Normalise to uppercase and strip anything that isn't alphanumeric.
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  redirect(`/student/live?code=${clean}`);
}
