const fs = require('fs');
let c = fs.readFileSync('tests/offers/admin-offer-create-draft.test.ts', 'utf8');

c = c.replace(/test\("1\. rfq \+ inbound", \(\) => \{\n\s*const res = parseOfferDraftCreateInput\(\{ partnerId: 1, categoryId: 1, title: "T", offerModel: "rfq", conversionType: "inbound" \}\);/g, 
`test("1. rfq", () => {
        const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "rfq" });`);

c = c.replace(/test\("2\. rfq \+ outbound", \(\) => \{\n\s*const res = parseOfferDraftCreateInput\(\{ partnerId: 1, categoryId: 1, title: "T", offerModel: "rfq", conversionType: "outbound" \}\);/g, 
`test("2. external_partner", () => {
        const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "external_partner" });`);

c = c.replace(/test\("3\. marketplace \+ inbound", \(\) => \{\n\s*const res = parseOfferDraftCreateInput\(\{ partnerId: 1, categoryId: 1, title: "T", offerModel: "marketplace", conversionType: "inbound" \}\);/g, 
`test("3. marketplace", () => {
        const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "marketplace" });`);

c = c.replace(/test\("4\. marketplace \+ outbound", \(\) => \{\n\s*const res = parseOfferDraftCreateInput\(\{ partnerId: 1, categoryId: 1, title: "T", offerModel: "marketplace", conversionType: "outbound" \}\);/g, 
`test("4. external_partner from marketplace+outbound", () => {
        const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "external_partner" });`);

c = c.replace(/test\("5\. invalid offerModel", \(\) => \{\n\s*const res = parseOfferDraftCreateInput\(\{ partnerId: 1, categoryId: 1, title: "T", offerModel: "invalid", conversionType: "inbound" \}\);/g, 
`test("5. invalid adminOfferType", () => {
        const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "invalid" });`);

c = c.replace(/test\("6\. invalid conversionType", \(\) => \{\n\s*const res = parseOfferDraftCreateInput\(\{ partnerId: 1, categoryId: 1, title: "T", offerModel: "rfq", conversionType: "invalid" \}\);/g, 
`test("6. missing adminOfferType", () => {
        const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: null });`);

c = c.replace(/offerModel: "rfq", conversionType: "inbound"/g, 'adminOfferType: "rfq"');

c = c.replace(/offerModel: "invalid_model" as unknown as "rfq",\s*conversionType: "inbound" as unknown as "inbound"/g, 'adminOfferType: "invalid_model" as any');

fs.writeFileSync('tests/offers/admin-offer-create-draft.test.ts', c, 'utf8');
