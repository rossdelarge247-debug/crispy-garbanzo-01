// === Auth Placeholder ===
// Phase 1: No authentication — all routes are public.
// Phase 2: Replace with a real auth provider (NextAuth.js, Clerk, Auth0, etc.)
//
// To integrate auth:
// 1. Install provider: npm install next-auth (or @clerk/nextjs, etc.)
// 2. Implement getSession() to return the real user session
// 3. Use requireAuth() in server components / API routes to gate access
// 4. Wrap layout.tsx with the provider's session context

export interface User {
  id: string;
  name: string;
  email: string;
  role: "viewer" | "trader" | "admin";
}

export interface Session {
  user: User;
  isAuthenticated: boolean;
}

const demoUser: User = {
  id: "demo-user",
  name: "Demo User",
  email: "demo@tradedaddy.app",
  role: "trader",
};

/** Returns the current session. Phase 1: always returns demo user. */
export async function getSession(): Promise<Session> {
  return {
    user: demoUser,
    isAuthenticated: true,
  };
}

/** Gates a route — returns the session or redirects. Phase 1: always passes. */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  // Phase 2: if (!session.isAuthenticated) redirect("/login");
  return session;
}

/** Checks if the user has a specific role. */
export function hasRole(session: Session, role: User["role"]): boolean {
  const hierarchy: Record<User["role"], number> = {
    viewer: 0,
    trader: 1,
    admin: 2,
  };
  return hierarchy[session.user.role] >= hierarchy[role];
}
