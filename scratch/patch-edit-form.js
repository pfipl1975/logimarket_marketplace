const fs = require('fs');

let c = fs.readFileSync('src/components/admin/AdminOfferEditForm.tsx', 'utf8');

c = c.replace(
  /offerModel: fd\.get\("offerModel"\)\?\.toString\(\) as "rfq" \| "marketplace",\s*conversionType: fd\.get\("conversionType"\)\?\.toString\(\) as "inbound" \| "outbound",/,
  'adminOfferType: fd.get("adminOfferType")?.toString() as import("@/lib/admin/offer-type").AdminOfferType,'
);

c = c.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 gap-4">\s*<div>\s*<label htmlFor="offerModel"[\s\S]*?<\/div>\s*<\/div>/,
  `<div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="adminOfferType" className="block text-sm font-medium text-brand-navy mb-1">{dict.fieldOfferType}</label>
                {offer.adminOfferType ? (
                  <select
                    id="adminOfferType"
                    name="adminOfferType"
                    defaultValue={offer.adminOfferType}
                    className="w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                  >
                    <option value="rfq">{dict.offerTypeRfq}</option>
                    <option value="marketplace">{dict.offerTypeMarketplace}</option>
                    <option value="external_partner">{dict.offerTypeExternal}</option>
                  </select>
                ) : (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    <p className="text-sm font-medium">{dict.errorInvalidCurrentOfferType}</p>
                    <div className="mt-3">
                      <select
                        id="adminOfferType"
                        name="adminOfferType"
                        required
                        className="w-full max-w-xs rounded-md border border-red-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                      >
                        <option value="">{dict.createSelectOfferType}</option>
                        <option value="rfq">{dict.offerTypeRfq}</option>
                        <option value="marketplace">{dict.offerTypeMarketplace}</option>
                        <option value="external_partner">{dict.offerTypeExternal}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>`
);

fs.writeFileSync('src/components/admin/AdminOfferEditForm.tsx', c, 'utf8');
