import 'server-only';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { partners, sellerLegalIdentities, sellerTaxIdentifiers } from '../schema';
import { buildSellerDisclosure, SellerDisclosureDto } from './seller-disclosure';

export async function getSellerDisclosure(partnerId: number): Promise<SellerDisclosureDto | null> {
  const [partner] = await db.select()
    .from(partners)
    .where(eq(partners.id, partnerId))
    .limit(1);

  if (!partner) {
    return null;
  }

  const [identity] = await db.select()
    .from(sellerLegalIdentities)
    .where(eq(sellerLegalIdentities.partnerId, partnerId))
    .limit(1);

  const taxIds = await db.select()
    .from(sellerTaxIdentifiers)
    .where(eq(sellerTaxIdentifiers.partnerId, partnerId));

  const legalName = identity?.legalName || partner.companyName;
  const businessEmail = partner.contactEmail;

  return buildSellerDisclosure(
    partnerId,
    legalName,
    businessEmail,
    {
      country: identity?.registeredCountry || null,
      city: identity?.registeredCity || null,
      postalCode: identity?.registeredPostalCode || null,
      street: identity?.registeredStreet || null,
      building: identity?.registeredBuilding || null,
      apartment: identity?.registeredApartment || null,
    },
    taxIds.map(t => ({
      type: t.identifierType,
      value: t.identifierValue,
      countryCode: t.countryCode
    }))
  );
}
