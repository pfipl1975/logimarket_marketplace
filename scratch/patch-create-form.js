const fs = require('fs');

let c = fs.readFileSync('src/components/admin/AdminOfferCreateForm.tsx', 'utf8');

c = c.replace(
  /offerModel: fd\.get\("offerModel"\)\?\.toString\(\) \|\| "",\s*conversionType: fd\.get\("conversionType"\)\?\.toString\(\) \|\| "",/,
  'adminOfferType: fd.get("adminOfferType")?.toString() || "",'
);

c = c.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 gap-4">[\s\S]*?<\/div>\s*<\/div>/,
  `<div>
            <label htmlFor="adminOfferType" className="block text-sm font-medium text-brand-navy mb-1">{dict.fieldOfferType}</label>
            <select
              id="adminOfferType"
              name="adminOfferType"
              required
              className="w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
            >
              <option value="">{dict.createSelectOfferType}</option>
              <option value="rfq">{dict.offerTypeRfq}</option>
              <option value="marketplace">{dict.offerTypeMarketplace}</option>
              <option value="external_partner">{dict.offerTypeExternal}</option>
            </select>
          </div>
        </div>`
);

fs.writeFileSync('src/components/admin/AdminOfferCreateForm.tsx', c, 'utf8');
