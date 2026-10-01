import { useAuthStore } from '../state/authStore';
import { routeGuards, type RouteGuards } from '../domain/guards';

export function useRouteGuards(): RouteGuards & { hasCompletedOnboarding: boolean } {
  const status = useAuthStore((s) => s.status);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  return { ...routeGuards(status, hasCompletedOnboarding), hasCompletedOnboarding };
}
