import type { RoutePath } from "../types/game";

export const routes: RoutePath[] = [
  "/login",
  "/home",
  "/map",
  "/base",
  "/battle",
  "/inventory",
  "/report",
];

export function normalizePath(pathname: string): RoutePath {
  return routes.includes(pathname as RoutePath)
    ? (pathname as RoutePath)
    : "/login";
}

export function navigateTo(path: RoutePath) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
