const fs = require('fs');
let c = fs.readFileSync('src/lib/admin/offer-type.ts', 'utf8');

c = c.replace(/case "external_partner":\s*return \{ offerModel: "marketplace", conversionType: "outbound" \};/, 
`case "external_partner":
      return { offerModel: "marketplace", conversionType: "outbound" };
    default:
      return { offerModel: "unknown" as any, conversionType: "unknown" as any };`);

fs.writeFileSync('src/lib/admin/offer-type.ts', c, 'utf8');
