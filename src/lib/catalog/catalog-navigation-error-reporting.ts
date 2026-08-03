import "server-only";

export function isIntentionalOfflineCatalogError(
  error: unknown,
  offlineBuildEnabled = process.env.LOGIMARKET_OFFLINE_BUILD === "1"
): boolean {
  if (!offlineBuildEnabled) return false;

  let currentError = error;
  let depth = 0;
  const maxDepth = 8;
  const seen = new Set();

  while (currentError && depth < maxDepth) {
    if (seen.has(currentError)) break;
    seen.add(currentError);

    if (typeof currentError === "object" && currentError !== null) {
      const errObj = currentError as Record<string, unknown>;
      
      const code = errObj.code;
      const address = errObj.address;
      const port = errObj.port;

      if (code === "ECONNREFUSED" && address === "127.0.0.1" && port === 1) {
        return true;
      }

      if ("cause" in errObj) {
        currentError = errObj.cause;
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
