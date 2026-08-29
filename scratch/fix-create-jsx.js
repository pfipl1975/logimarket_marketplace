const fs = require('fs');
let c = fs.readFileSync('src/components/admin/AdminOfferCreateForm.tsx', 'utf8');

c = c.replace(
  /            <\/select>\s*<\/div>\s*<\/div>\s*<\/div>/,
  `            </select>\n          </div>\n        </div>`
);

fs.writeFileSync('src/components/admin/AdminOfferCreateForm.tsx', c, 'utf8');
