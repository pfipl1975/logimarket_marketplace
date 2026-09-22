/**
 * Checkout domain constants.
 *
 * Owner-approved values:
 *   MAX_CHECKOUT_QUANTITY = 999
 *   CHECKOUT_MESSAGE_MAX_LENGTH = 2000
 */

export const MAX_CHECKOUT_QUANTITY = 999 as const;
export const MIN_CHECKOUT_QUANTITY = 1 as const;

export const CHECKOUT_MESSAGE_MAX_LENGTH = 2000 as const;
export const CHECKOUT_COMPANY_NAME_MAX = 255 as const;
export const CHECKOUT_CONTACT_NAME_MAX = 255 as const;
export const CHECKOUT_EMAIL_MAX = 255 as const;
export const CHECKOUT_PHONE_MAX = 100 as const;

/** Maximum character length of snapshot varchar(50) price columns. */
export const PRICE_SNAPSHOT_MAX_LENGTH = 50 as const;

/** Minor units per major unit for PLN. */
export const PLN_MINOR_UNITS = BigInt(100);
