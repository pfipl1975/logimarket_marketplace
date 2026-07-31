import { getLocaleFromPath } from "./route-classification";

export function buildLoginRedirectUrl(currentUrl: URL): URL {
  const url = currentUrl;
  const locale = getLocaleFromPath(url.pathname);
  
  const loginUrl = new URL(url.toString());
  loginUrl.pathname = locale === "pl" ? "/login" : `/${locale}/login`;
  
  // Clear any existing search params
  loginUrl.search = "";
  
  // set search params securely without manual encoding
  loginUrl.searchParams.set("next", url.pathname + url.search);
  
  return loginUrl;
}
