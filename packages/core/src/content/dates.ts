/** Shows an ISO date (YYYY-MM-DD) as DD/MM/YYYY, the way the interface writes dates. Anything else comes back unchanged. */
export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}
