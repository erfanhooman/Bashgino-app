/**
 * Session store: who is signed in and which workspace they are inside.
 *
 * One store, because the shell, the data hooks and the API client all need the
 * same answer and three copies of "am I a coach" is how a trainee ends up seeing
 * the admin panel.
 *
 * Tokens never live here — they are in SecureStore behind `services/api/client`.
 * This store holds the *user* and the *active membership*, and persists only the
 * chosen workspace id (a preference, not a secret).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type { LoginResponse, MembershipRole, OrganizationType, User } from "@bashgino/types";

import { ApiError, clearTokens, loadTokens, setSessionExpiredHandler } from "@/services/api/client";
import * as api from "@/services/api/endpoints";

const ACTIVE_ORG_KEY = "bashgino.active_org_id";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType;
  role: MembershipRole;
}

export type SessionStatus = "booting" | "anonymous" | "authenticated";

interface SessionState {
  status: SessionStatus;
  user: User | null;
  workspaces: Workspace[];
  activeOrg: Workspace | null;
  /** Last bootstrap failure, shown on the login screen instead of a silent loop. */
  bootstrapError: string | null;
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setActiveOrg: (orgId: string) => Promise<void>;
  reloadWorkspaces: () => Promise<void>;
}

/** `my-organizations` may expand the organization or return just its id. */
function toWorkspace(entry: unknown): Workspace | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, any>;
  const org = record.organization && typeof record.organization === "object" ? record.organization : record;
  const id = org?.id ?? record.organization;
  if (!id) return null;
  return {
    id: String(id),
    name: String(org?.name ?? "فضای کاری"),
    slug: String(org?.slug ?? ""),
    organization_type: (org?.organization_type ?? "SOLO_STUDIO") as OrganizationType,
    role: (record.role ?? "COACH") as MembershipRole,
  };
}

export const useSession = create<SessionState>((set, get) => ({
  status: "booting",
  user: null,
  workspaces: [],
  activeOrg: null,
  bootstrapError: null,

  bootstrap: async () => {
    // A 401 that survives the refresh pass means the session is gone for good;
    // the store has to stop claiming otherwise or every screen renders empty.
    setSessionExpiredHandler(() => {
      set({ status: "anonymous", user: null, activeOrg: null, workspaces: [] });
    });

    try {
      const tokens = await loadTokens();
      if (!tokens.access && !tokens.refresh) {
        set({ status: "anonymous" });
        return;
      }

      const [me, memberships] = await Promise.all([api.getMe(), api.getMyOrganizations()]);
      const workspaces = (memberships ?? [])
        .map(toWorkspace)
        .filter((entry): entry is Workspace => Boolean(entry));

      const storedOrgId = await AsyncStorage.getItem(ACTIVE_ORG_KEY);
      const activeOrg =
        workspaces.find((workspace) => workspace.id === storedOrgId) ?? workspaces[0] ?? null;

      set({ status: "authenticated", user: me, workspaces, activeOrg, bootstrapError: null });
    } catch (error) {
      // A network failure must not silently sign the user out — the tokens may be
      // perfectly valid and the server simply unreachable (the app is often used
      // in a gym basement). Only an auth rejection clears the session.
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await clearTokens();
        set({
          status: "anonymous",
          user: null,
          activeOrg: null,
          workspaces: [],
          bootstrapError: null,
        });
        return;
      }
      const cachedUser = get().user;
      set({
        status: cachedUser ? "authenticated" : "anonymous",
        bootstrapError:
          error instanceof Error ? error.message : "اتصال به سرور برقرار نشد.",
      });
    }
  },

  login: async (username, password) => {
    const response = await api.login(username, password);
    const memberships = await api.getMyOrganizations().catch(() => []);
    const workspaces = (memberships ?? [])
      .map(toWorkspace)
      .filter((entry): entry is Workspace => Boolean(entry));

    // Trust the server's active organization when it names one of ours; a
    // manager of two gyms otherwise lands in whichever row the API sorted first.
    const preferred = response.active_organization
      ? workspaces.find((workspace) => workspace.id === response.active_organization?.id)
      : undefined;
    const storedOrgId = await AsyncStorage.getItem(ACTIVE_ORG_KEY);
    const activeOrg = preferred ?? workspaces.find((w) => w.id === storedOrgId) ?? workspaces[0] ?? null;
    if (activeOrg) await AsyncStorage.setItem(ACTIVE_ORG_KEY, activeOrg.id);

    set({
      status: "authenticated",
      user: response.user,
      workspaces,
      activeOrg,
      bootstrapError: null,
    });
    return response;
  },

  logout: async () => {
    try {
      await api.logout();
    } finally {
      await AsyncStorage.removeItem(ACTIVE_ORG_KEY);
      set({ status: "anonymous", user: null, workspaces: [], activeOrg: null });
    }
  },

  refreshUser: async () => {
    const me = await api.getMe();
    set({ user: me });
  },

  setActiveOrg: async (orgId) => {
    const target = get().workspaces.find((workspace) => workspace.id === orgId);
    if (!target) return;
    await AsyncStorage.setItem(ACTIVE_ORG_KEY, target.id);
    set({ activeOrg: target });
  },

  reloadWorkspaces: async () => {
    const memberships = await api.getMyOrganizations();
    const workspaces = (memberships ?? [])
      .map(toWorkspace)
      .filter((entry): entry is Workspace => Boolean(entry));
    const current = get().activeOrg;
    const activeOrg = workspaces.find((workspace) => workspace.id === current?.id) ?? workspaces[0] ?? null;
    set({ workspaces, activeOrg });
  },
}));

/** The role that owns the current workspace — never the user's own opinion. */
export function useRole(): MembershipRole | null {
  return useSession((state) => state.activeOrg?.role ?? null);
}

export function useOrgId(): string | null {
  return useSession((state) => state.activeOrg?.id ?? null);
}

/**
 * Which shell the account gets. `ORG_ADMIN` is a gym manager by default and can
 * switch to the coaching desk; a trainee only ever sees the trainee shell.
 */
export function usePanel(): "coach" | "trainee" | "none" {
  const status = useSession((state) => state.status);
  const role = useRole();
  if (status !== "authenticated") return "none";
  if (!role) return "none";
  return role === "CLIENT" ? "trainee" : "coach";
}
