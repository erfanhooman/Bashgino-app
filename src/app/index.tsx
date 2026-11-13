/**
 * Entry gate.
 *
 * Routes on session state and workspace role: a trainee lands on their workout
 * hub, a coach on the coaching desk, and a manager on the gym dashboard — the
 * same destinations the web shell uses. Rendering it as a redirect (not a
 * screen) keeps it out of the back stack.
 */
import { Redirect } from "expo-router";

import { useSession } from "@/store/session";

export default function Index() {
  const status = useSession((state) => state.status);
  const role = useSession((state) => state.activeOrg?.role ?? null);

  if (status !== "authenticated") return <Redirect href="/login" />;
  if (role === "ORG_ADMIN") return <Redirect href="/dashboard" />;
  if (role === "CLIENT") return <Redirect href="/dashboard" />;
  return <Redirect href="/dashboard" />;
}
