export type PublicAuthNavigationState = {
  showLogin: boolean;
  showRegister: boolean;
  showPartnerPanel: boolean;
  showLogout: boolean;
  loginUrl: string;
  registerUrl: string;
  partnerUrl: string;
};

export function getPublicAuthNavigationState(
  isAuth: boolean,
  hasPartnerPanel: boolean,
  locale: string,
): PublicAuthNavigationState {
  const localePrefix = locale === "pl" ? "" : `/${locale}`;
  const partnerUrl = `${localePrefix}/partner`;
  const loginUrl = `${localePrefix}/login`;
  const registerUrl = `${localePrefix}/register`;

  return {
    showLogin: !isAuth,
    showRegister: !isAuth,
    showPartnerPanel: isAuth && hasPartnerPanel,
    showLogout: isAuth,
    loginUrl,
    registerUrl,
    partnerUrl,
  };
}


