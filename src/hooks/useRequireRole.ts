import { router } from "expo-router";
import { useEffect } from "react";

import { useSession } from "@/store/session";
import type { MembershipRole } from "@bashgino/types";

/**
 * Client-side role gate for a route.
 *
 * The tab bar already hides what a role cannot use, but a deep link or a stale
 * navigation state can still land a trainee on the roster. The server remains
 * the authority (every tenant endpoint checks the membership); this only stops
 * the app from *offering* a screen that would answer 403 — the difference between
 * "you are not allowed" and "this app is broken".
 */
export function useRequireRole(allow: MembershipRole[]): boolean {
  const status = useSession((state) => state.status);
  const role = useSession((state) => state.activeOrg?.role ?? null);

  const permitted = status === "authenticated" && Boolean(role) && allow.includes(role as MembershipRole);

  useEffect(() => {
    if (status === "authenticated" && role && !allow.includes(role)) {
      router.replace("/dashboard");
    }
  }, [status, role, allow]);

  return permitted;
}
