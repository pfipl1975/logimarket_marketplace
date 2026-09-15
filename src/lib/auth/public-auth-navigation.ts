export type PublicAuthNavigationState = {
  showLogin: boolean;
  showPartnerPanel: boolean;
  showLogout: boolean;
  loginUrl: string;
  partnerUrl: string;
};

export function getPublicAuthNavigationState(
  isAuth: boolean,
  hasPartnerPanel: boolean,
  locale: string,
): PublicAuthNavigationState {
  const localePrefix = locale === "pl" ? "" : `/${locale}`;
  const partnerUrl = `${localePrefix}/partner`;
  const loginUrl = `${localePrefix}/login?next=${partnerUrl}`;

  return {
    showLogin: !isAuth,
    showPartnerPanel: isAuth && hasPartnerPanel,
    showLogout: isAuth,
    loginUrl,
    partnerUrl,
  };
}


