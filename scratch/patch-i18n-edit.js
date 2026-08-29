const fs = require('fs');

const files = [
  'src/messages/en.json',
  'src/messages/pl.json',
  'src/messages/de.json',
  'src/messages/fr.json',
  'src/messages/es.json',
  'src/messages/uk.json',
  'src/messages/zh.json'
];

const enAdditions = {
  "fieldOfferType": "Offer type",
  "createSelectOfferType": "Select offer type...",
  "offerTypeRfq": "RFQ",
  "offerTypeMarketplace": "Marketplace",
  "offerTypeExternal": "External Partner",
  "errorInvalidCurrentOfferType": "The current offer type is invalid. Please select a valid business offer type to proceed."
};

const plAdditions = {
  "fieldOfferType": "Rodzaj oferty",
  "createSelectOfferType": "Wybierz rodzaj oferty...",
  "offerTypeRfq": "Zapytanie ofertowe RFQ",
  "offerTypeMarketplace": "Sprzedaż przez LogiMarket",
  "offerTypeExternal": "Oferta zewnętrzna Partnera",
  "errorInvalidCurrentOfferType": "Bieżący rodzaj oferty jest nieprawidłowy. Wybierz poprawny rodzaj oferty biznesowej, aby kontynuować."
};

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let data = JSON.parse(content);
  
  const additions = file.includes('pl.json') ? plAdditions : enAdditions;
  
  if (data.adminOfferEdit) {
    Object.assign(data.adminOfferEdit, additions);
  }
  
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
});
