import 'server-only';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { partners, sellerLegalIdentities, sellerTaxIdentifiers } from '../schema';
import { buildSellerDisclosure, SellerDisclosureDto } from './seller-disclosure';

export async function getSellerDisclosure(partnerId: number): Promise<SellerDisclosureDto | null> {
  const [partner] = await db.select({
    id: partners.id,
    contactEmail: partners.contactEmail,
  })
    .from(partners)
    .where(eq(partners.id, partnerId))
    .limit(1);

  if (!partner) {
    return null;
  }

  const [identity] = await db.select({
    legalName: sellerLegalIdentities.legalName,
    registeredAddressLine1: sellerLegalIdentities.registeredAddressLine1,
    registeredAddressLine2: sellerLegalIdentities.registeredAddressLine2,
    registeredPostalCode: sellerLegalIdentities.registeredPostalCode,
    registeredCity: sellerLegalIdentities.registeredCity,
    registeredRegion: sellerLegalIdentities.registeredRegion,
    registeredCountryCode: sellerLegalIdentities.registeredCountryCode,
  })
    .from(sellerLegalIdentities)
    .where(eq(sellerLegalIdentities.partnerId, partnerId))
    .limit(1);

  const taxIds = await db.select({
    identifierType: sellerTaxIdentifiers.identifierType,
    identifierValue: sellerTaxIdentifiers.identifierValue,
    countryCode: sellerTaxIdentifiers.countryCode,
  })
    .from(sellerTaxIdentifiers)
    .where(eq(sellerTaxIdentifiers.partnerId, partnerId));

  // DO NOT fallback to partner.companyName for legalName!
  const legalName = identity?.legalName || null;
  const businessEmail = partner.contactEmail;

  return buildSellerDisclosure(
    partnerId,
    legalName,
    businessEmail,
    {
      addressLine1: identity?.registeredAddressLine1 || null,
      addressLine2: identity?.registeredAddressLine2 || null,
      postalCode: identity?.registeredPostalCode || null,
      city: identity?.registeredCity || null,
      region: identity?.registeredRegion || null,
      countryCode: identity?.registeredCountryCode || null,
    },
    taxIds.map(t => ({
      type: t.identifierType,
      value: t.identifierValue,
      countryCode: t.countryCode
    }))
  );
}
