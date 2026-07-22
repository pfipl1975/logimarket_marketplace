# LOGIMARKET — FINANCIAL AND TRANSACTION MODELS (LM-DROP-DOMAIN-56A-R2A)

**Wersja:** 1.0.0
**Data:** 2026-07-22
**Cel:** Neutralne zestawienie wariantów przepływu środków i modeli prawnych na potrzeby analizy przez ekspertów.

Poniższe modele stanowią wyłączne opcje podlegające procesowi decyzyjnemu. Dokument ten ma na celu neutralne przedstawienie faktów dla doradców prawnych i podatkowych.

## MODEL A: Odsprzedaż (Buy/Sell Model)
LogiMarket występuje jako bezpośredni Sprzedawca dla Kupującego B2B, kupując wcześniej towar od Dostawcy.

1. **Merchant of Record (MoR)**: LogiMarket [MODEL_ASSUMPTION]
2. **Seller of Record (SoR)**: LogiMarket [MODEL_ASSUMPTION]
3. **Faktura dla Kupującego**: Wystawia LogiMarket [TAX_VALIDATION_REQUIRED]
4. **Faktura od Dostawcy**: Wystawia Dostawca na LogiMarket [TAX_VALIDATION_REQUIRED]
5. **Konto rozliczeniowe (PSP)**: Konto LogiMarket w systemie płatności online (np. NON-BINDING MARKET EXAMPLES: PayU, Przelewy24, Stripe) [PSP_CONFIRMATION_REQUIRED]
6. **Odpowiedzialność prawna**: LogiMarket ponosi pełną rękojmię i odpowiada za zgodność z umową wobec Kupującego [LEGAL_VALIDATION_REQUIRED]
7. **B2B Chargebacks**: Zabezpieczane przez LogiMarket (wymagany regres od dostawcy) [LEGAL_VALIDATION_REQUIRED]

## MODEL B: Model Agencyjny / Marketplace (Agency Model)
LogiMarket występuje wyłącznie jako pośrednik dostarczający platformę. Kupujący nabywa towar bezpośrednio od Dostawcy.

1. **Merchant of Record (MoR)**: LogiMarket (pobiera środki w imieniu własnym) lub hybrydowo [MODEL_ASSUMPTION]
2. **Seller of Record (SoR)**: Partner Dropshippingowy (Dostawca) [MODEL_ASSUMPTION]
3. **Faktura dla Kupującego**: Wystawia Partner Dropshippingowy na rzecz Kupującego [TAX_VALIDATION_REQUIRED]
4. **Faktura dla Dostawcy**: LogiMarket wystawia fakturę za usługę pośrednictwa (prowizję) [TAX_VALIDATION_REQUIRED]
5. **Konto rozliczeniowe (PSP)**: Środki mogą trafiać na konto LogiMarket, co rodzi ryzyko podlegania pod wymogi KNF (usługi płatnicze) [LEGAL_VALIDATION_REQUIRED]
6. **Odpowiedzialność prawna**: Partner odpowiada za wady towaru i realizację zamówienia wobec Kupującego. LogiMarket odpowiada tylko za działanie platformy [LEGAL_VALIDATION_REQUIRED]
7. **B2B Chargebacks**: Wymagają przekierowania na Dostawcę, ryzyko techniczne zwrotów [PSP_CONFIRMATION_REQUIRED]

## MODEL C: Split Payment / Marketplace Payment Gateway
LogiMarket pełni rolę pośrednika (jak w Modelu B), ale przepływ środków jest od razu dzielony przez licencjonowanego dostawcę płatności (PSP).

1. **Merchant of Record (MoR)**: MOR_ASSIGNMENT=OPEN — DEPENDS_ON_PSP_PRODUCT_AND_LEGAL_MODEL [PSP_CONFIRMATION_REQUIRED]
2. **Seller of Record (SoR)**: Partner Dropshippingowy (Dostawca) [MODEL_ASSUMPTION]
3. **Faktura dla Kupującego**: Wystawia Partner Dropshippingowy na rzecz Kupującego [TAX_VALIDATION_REQUIRED]
4. **Faktura dla Dostawcy**: LogiMarket wystawia fakturę za usługę pośrednictwa [TAX_VALIDATION_REQUIRED]
5. **Konto rozliczeniowe (PSP)**: Zastosowanie gotowego produktu Marketplace u dostawcy płatności (np. NON-BINDING MARKET EXAMPLES: Stripe Connect, Adyen for Platforms, Mangopay), gdzie subkonta posiadają Dostawcy [PSP_CONFIRMATION_REQUIRED]
6. **Odpowiedzialność prawna**: Partner odpowiada za zamówienie. PSP zajmuje się procesem KYC (Know Your Customer) dostawców [LEGAL_VALIDATION_REQUIRED]
7. **B2B Chargebacks**: Bezpośrednie obciążenie subkonta Dostawcy przez PSP [PSP_CONFIRMATION_REQUIRED]
