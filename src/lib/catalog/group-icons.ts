export const GROUP_ICON_PATHS = {
  "regaly-paletowe": "/images/catalog/groups/regaly-paletowe.svg",
  "regaly-polkowe-i-antresole": "/images/catalog/groups/regaly-polkowe-i-antresole.svg",
  "wozki-widlowe-czolowe": "/images/catalog/groups/wozki-widlowe-czolowe.svg",
  "wozki-magazynowe-wysokiego-skladowania": "/images/catalog/groups/wozki-magazynowe-wysokiego-skladowania.svg",
  "wozki-paletowe-i-podnosnikowe": "/images/catalog/groups/wozki-paletowe-i-podnosnikowe.svg",
  "osprzet-do-wozkow-widlowych": "/images/catalog/groups/osprzet-do-wozkow-widlowych.svg",
  "meble-magazynowe-i-warsztatowe": "/images/catalog/groups/meble-magazynowe-i-warsztatowe.svg",
  "pojemniki-i-kuwety": "/images/catalog/groups/pojemniki-i-kuwety.svg",
  "folie-i-zabezpieczenia-ladunku": "/images/catalog/groups/folie-i-zabezpieczenia-ladunku.svg",
  "nosniki-ladunku": "/images/catalog/groups/nosniki-ladunku.svg",
  "ochrona-osobista-i-bhp": "/images/catalog/groups/ochrona-osobista-i-bhp.svg",
  "wdrozenie-i-utrzymanie-robotyzacji": "/images/catalog/groups/wdrozenie-i-utrzymanie-robotyzacji.svg",
  "oprogramowanie-i-integracja-robotow": "/images/catalog/groups/oprogramowanie-i-integracja-robotow.svg",
  "infrastruktura-do-robotyzacji-magazynu": "/images/catalog/groups/infrastruktura-do-robotyzacji-magazynu.svg",
  "egzoszkielety-i-wspomaganie-pracy": "/images/catalog/groups/egzoszkielety-i-wspomaganie-pracy.svg",
  "roboty-kompletacyjne-i-manipulacyjne": "/images/catalog/groups/roboty-kompletacyjne-i-manipulacyjne.svg",
  "goods-to-person-i-automatyzacja-kompletacji": "/images/catalog/groups/goods-to-person-i-automatyzacja-kompletacji.svg",
  "agv-amr-do-palet-i-ciezkich-ladunkow": "/images/catalog/groups/agv-amr-do-palet-i-ciezkich-ladunkow.svg",
  "roboty-mobilne-agv-amr": "/images/catalog/groups/roboty-mobilne-agv-amr.svg",
} as const satisfies Record<string, string>;

export type MappedGroupIconSlug = keyof typeof GROUP_ICON_PATHS;

export const FALLBACK_GROUP_ICON_PATH = "/images/catalog/groups/package-fallback.svg";

export function getGroupIconPath(slug: string): string {
  return (
    GROUP_ICON_PATHS[slug as MappedGroupIconSlug] ??
    FALLBACK_GROUP_ICON_PATH
  );
}

export const SECTION_ICON_PATHS = {
  "regaly-i-systemy-skladowania": "/images/catalog/sections/regaly-i-systemy-skladowania.svg",
  "wozki-i-transport-wewnetrzny": "/images/catalog/sections/wozki-i-transport-wewnetrzny.svg",
  "wyposazenie-magazynu": "/images/catalog/sections/wyposazenie-magazynu.svg",
  "opakowania-i-materialy-eksploatacyjne": "/images/catalog/sections/opakowania-i-materialy-eksploatacyjne.svg",
  "systemy-bezpieczenstwa-i-oznakowanie": "/images/catalog/sections/systemy-bezpieczenstwa-i-oznakowanie.svg",
  "robotyzacja-magazynu": "/images/catalog/sections/robotyzacja-magazynu.svg",
} as const satisfies Record<string, string>;

export type MappedSectionIconSlug = keyof typeof SECTION_ICON_PATHS;

export function getSectionIconPath(slug: string): string {
  return (
    SECTION_ICON_PATHS[slug as MappedSectionIconSlug] ??
    FALLBACK_GROUP_ICON_PATH
  );
}
