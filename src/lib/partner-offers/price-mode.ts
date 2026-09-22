export type PriceMode = "fixed" | "request";

export const PRICE_INPUT_PATTERN = "^[0-9]+(\\.[0-9]{1,2})?$";

export function getInitialPriceMode(priceOnRequest: boolean): PriceMode {
  return priceOnRequest ? "request" : "fixed";
}

export function buildPricePayload(
  priceMode: PriceMode,
  priceValue: string
): { priceBrutto: string | null; priceOnRequest: boolean } {
  const trimmed = priceValue.trim();
  return {
    priceBrutto: trimmed === "" ? null : trimmed,
    priceOnRequest: priceMode === "request",
  };
}

export interface PriceFormState {
  priceMode: PriceMode;
  priceValue: string;
}

export function initPriceFormState(offer: {
  priceOnRequest: boolean;
  priceBrutto: string | null;
}): PriceFormState {
  return {
    priceMode: getInitialPriceMode(offer.priceOnRequest),
    priceValue: offer.priceBrutto ?? "",
  };
}

export function transitionPriceMode(
  state: PriceFormState,
  newMode: PriceMode
): PriceFormState {
  return {
    ...state,
    priceMode: newMode,
  };
}

export function updatePriceValue(
  state: PriceFormState,
  newValue: string
): PriceFormState {
  return {
    ...state,
    priceValue: newValue,
  };
}
