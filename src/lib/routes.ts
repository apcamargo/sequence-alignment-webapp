import { DEFAULT_SCORING, MATRIX_GROUPS } from "./alignment/constants";

export const NAV_ROUTES = [
  { route: "/", label: "Sequence alignment" },
  { route: "/practice", label: "Alignment practice" },
  { route: "/matrices", label: "Scoring matrices" },
] as const;

type RoutePath = (typeof NAV_ROUTES)[number]["route"];

const MATRIX_QUERY_PARAM = "matrix";
const BUILTIN_MATRIX_NAME_SET = new Set<string>(
  MATRIX_GROUPS.flatMap((group) => group.options),
);

export function withBase(
  route: RoutePath,
  baseUrl: string = import.meta.env.BASE_URL,
): string {
  if (route === "/") {
    return baseUrl;
  }

  const basePrefix = baseUrl === "/" ? "" : baseUrl.replace(/\/$/, "");

  return `${basePrefix}${route}`;
}

export function normalizeRoutePath(pathname: string): string {
  if (!pathname) {
    return "/";
  }

  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

function normalizeMatrixName(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase();

  if (normalized && BUILTIN_MATRIX_NAME_SET.has(normalized)) {
    return normalized;
  }

  return DEFAULT_SCORING.matrixName;
}

export function getScoringMatricesHref(
  matrixName: string,
  baseUrl: string = import.meta.env.BASE_URL,
): string {
  const params = new URLSearchParams({
    [MATRIX_QUERY_PARAM]: normalizeMatrixName(matrixName),
  });

  return `${withBase("/matrices", baseUrl)}?${params.toString()}`;
}

export function getMatrixNameFromSearch(search: string): string {
  const params = new URLSearchParams(search);

  return normalizeMatrixName(params.get(MATRIX_QUERY_PARAM));
}
