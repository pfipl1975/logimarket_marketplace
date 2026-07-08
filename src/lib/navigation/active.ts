export function isNavItemActive(
  pathname: string | null | undefined,
  href: string,
): boolean {
  if (!pathname || !href || isExternalHref(href)) {
    return false;
  }

  const currentPath = normalizePath(pathname);
  const targetPath = normalizePath(href);

  if (targetPath === "/") {
    return currentPath === "/";
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function normalizePath(path: string): string {
  const pathOnly = path.split(/[?#]/, 1)[0] || "/";
  const normalized = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;

  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
}

function isExternalHref(href: string): boolean {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(href)
    || href.startsWith("mailto:")
    || href.startsWith("tel:");
}
