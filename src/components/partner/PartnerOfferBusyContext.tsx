"use client";
import { createContext, useContext, useState } from "react";

export type BusyDomain = "core" | "attr" | "media" | null;

const BusyContext = createContext<{
  busyDomain: BusyDomain;
  setBusyDomain: (d: BusyDomain) => void
}>({ busyDomain: null, setBusyDomain: () => {} });

export function PartnerOfferBusyProvider({ children }: { children: React.ReactNode }) {
  const [busyDomain, setBusyDomain] = useState<BusyDomain>(null);
  return (
    <BusyContext.Provider value={{ busyDomain, setBusyDomain }}>
      {children}
    </BusyContext.Provider>
  );
}

export function usePartnerOfferBusy() {
  return useContext(BusyContext);
}
