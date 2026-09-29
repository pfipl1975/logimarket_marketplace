export type PublicAuthNavigationState = {
  showLogin: boolean;
  showRegister: boolean;
  showAccount: boolean;
  showPartnerPanel: boolean;
  showLogout: boolean;
  loginUrl: string;
  registerUrl: string;
  accountUrl: string;
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
  const accountUrl = locale === "pl" ? "/konto" : `${localePrefix}/account`;

  return {
    showLogin: !isAuth,
    showRegister: !isAuth,
    showAccount: isAuth,
    showPartnerPanel: isAuth && hasPartnerPanel,
    showLogout: isAuth,
    loginUrl,
    registerUrl,
    accountUrl,
    partnerUrl,
  };
}


