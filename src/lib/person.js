import { useAuth } from "@/auth-context";

/** Whose age and sex apply to a walk: another person's profile, or the account holder's settings. */
export function usePerson(profileId) {
  const user = useAuth()?.user;
  if (profileId != null) return (user?.profiles ?? []).find((p) => p.id === profileId) ?? null;
  return user?.settings ?? null;
}
