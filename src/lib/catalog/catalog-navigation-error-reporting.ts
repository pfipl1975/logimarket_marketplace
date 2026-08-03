import "server-only";

function safelyReadProperty(value: object, property: PropertyKey): unknown {
  try {
    return Reflect.get(value, property);
  } catch {
    return undefined;
  }
}

export function isIntentionalOfflineCatalogError(
  error: unknown,
  offlineBuildEnabled = process.env.LOGIMARKET_OFFLINE_BUILD === "1"
): boolean {
  if (!offlineBuildEnabled) return false;

  let currentError = error;
  let depth = 0;
  const maxDepth = 8;
  const seen = new Set<unknown>();

  while (currentError && depth < maxDepth) {
    if (seen.has(currentError)) break;
    seen.add(currentError);

    if (typeof currentError === "object" && currentError !== null) {
      const code = safelyReadProperty(currentError, "code");
      const address = safelyReadProperty(currentError, "address");
      const port = safelyReadProperty(currentError, "port");

      if (code === "ECONNREFUSED" && address === "127.0.0.1" && port === 1) {
        return true;
      }

      const cause = safelyReadProperty(currentError, "cause");
      if (cause !== undefined) {
        currentError = cause;
        depth++;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return false;
}

export function reportCatalogNavigationLoadError(error: unknown): void {
  if (isIntentionalOfflineCatalogError(error)) {
    return;
  }
  
  console.error("Failed to load CatalogNavigationLoader", error);
}
