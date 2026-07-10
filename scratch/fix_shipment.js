const fs = require('fs');
const path = 'c:\\\\Users\\\\YousofRady\\\\.gemini\\\\antigravity\\\\scratch\\\\ecommerce\\\\frontend\\\\admin\\\\shipment.html';
let content = fs.readFileSync(path, 'utf8');

const target = `        shippingOptions = options;
        renderShippingOptions();
        renderTabsHeader();
        renderActiveTabContent();`;

const replacement = `        shippingOptions = options;

        shippingOptions.forEach(opt => {
          if (opt.cities) {
            opt.cities.forEach(c => {
              if (c.city && !EGYPT_GOVERNORATES.includes(c.city)) {
                EGYPT_GOVERNORATES.push(c.city);
              }
            });
          }
        });

        renderShippingOptions();
        renderTabsHeader();
        renderActiveTabContent();`;

content = content.replace(target, replacement);

// In case the file uses \r\n
const targetCRLF = target.replace(/\n/g, '\r\n');
const replacementCRLF = replacement.replace(/\n/g, '\r\n');
content = content.replace(targetCRLF, replacementCRLF);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed shipment.html successfully');
