# LOGIMARKET — LEGAL AND TAX QUESTIONNAIRE (LM-DROP-DOMAIN-56A-R2A)

**Wersja:** 1.0.0
**Data:** 2026-07-22
**Cel:** Karta pytań i dylematów kierowanych do kancelarii prawnej i doradcy podatkowego, niezbędnych do odblokowania prac nad Data Model (szczegóły LEG-GATE-01, LEG-GATE-02, LEG-GATE-04, LEG-GATE-05, LEG-GATE-06, LEG-GATE-10)

Poniższe kwestie wymagają formalnych opinii (Opinia Prawna), które zamkną otwarte ryzyka regulacyjne dla platformy B2B Dropshipping.

## LEG-GATE-01: Merchant of Record (MoR) and Seller of Record (SoR)
* **Status**: `OPEN` (Blocks Implementation of Core Schema).
* **Owner**: Legal Counsel.
* **Context**: Z biznesowego punktu widzenia projektujemy mechanizm, gdzie LogiMarket pośredniczy w płatności za towar wystawiany przez Partnera Dropshippingowego.
* **Neutral Legal Question 1 (MoR)**: Jakie licencje (np. KIP, MIP) są wymagane na gruncie ustawy o usługach płatniczych oraz dyrektywy PSD2, jeżeli to LogiMarket będzie podmiotem pobierającym od Kupujących wpłaty za towary stanowiące własność Partnerów Dropshippingowych, i następnie będzie przekazywał te wpłaty na konta Partnerów po potrąceniu prowizji?
* **Neutral Legal Question 2 (SoR)**: Kto w ujęciu prawnym będzie uznawany za sprzedawcę względem kupującego, i na kim (Kupującym czy LogiMarket) spoczywać będzie obowiązek dokumentowania transakcji za pomocą faktury zakupowo-sprzedażowej (np. w przypadku uszkodzeń, roszczeń i reklamacji)?
* **Neutral Legal Question 3 (Zwolnienie handlowe)**: Czy przy powyższym modelu pośrednictwa znajduje zastosowanie wyłączenie z obowiązku uzyskania licencji KIP (tzw. zwolnienie dla przedstawicieli handlowych)?

## LEG-GATE-02: VAT and KSeF (Krajowy System e-Faktur)
* **Status**: `OPEN` (Blocks Implementation of Finance Schema).
* **Owner**: Tax Advisor / Legal.
* **Context**: W zależności od podjętej decyzji w kwestii SoR, proces fakturowania przybierze różny przebieg w integracji KSeF.
* **Neutral Tax Question 1 (Agency Model VAT)**: W przypadku wyboru Modelu Agencyjnego (jeśli Model B zostanie zatwierdzony), jak dokumentowana ma być na gruncie polskiej ustawy o VAT prowizja LogiMarket dla partnerów mających siedzibę poza Polską a na terenie UE, względem usług świadczonych na odległość?
* **Neutral Tax Question 2 (Reseller Model VAT)**: W przypadku wyboru Modelu Kupna-Sprzedaży (jeśli Model A zostanie zatwierdzony), w którym momencie winno powstać zobowiązanie VAT po stronie LogiMarket dla transakcji typu back-to-back, kiedy platforma wystawia fakturę kupującemu nie posiadając towaru na własnym magazynie fizycznie?
* **Neutral Tax Question 3 (Multi-Supplier Invoicing)**: Jeżeli koszyk zostanie zrealizowany poprzez jednego operatora płatności (MoR) ale dotyczy produktów od N dostawców dropshippingowych (jeśli SoR = dostawca dropshippingowy), jakie wiążą się z tym obostrzenia i obowiązki po stronie e-Faktur wystawianych równolegle przez wielu dostawców?

## LEG-GATE-04: B2B Returns (Zwroty w Relacjach Przedsiębiorca-Przedsiębiorca)
* **Status**: `OPEN` (Blocks Implementation of Returns Schema).
* **Owner**: Legal Counsel.
* **Context**: Z biznesowego punktu widzenia pożądane jest ograniczenie zwrotów bez podania przyczyny w przypadku transakcji B2B na specyficzny asortyment przemysłowy.
* **Neutral Legal Question 1 (Right of withdrawal)**: Jak kształtuje się kwestia prawa do zwrotu 14-dniowego bez podania przyczyny (odstąpienia od umowy) w odniesieniu do transakcji zawieranych na platformie, gdy Kupujący występuje wyraźnie w ramach prowadzonej działalności zawodowej (w oparciu o NIP i KRS spółki kapitałowej)?
* **Neutral Legal Question 2 (Policy formulation)**: Z jakimi restrykcjami wiąże się możliwość wyłączenia uprawnienia do zwrotu B2B w ogólnym Regulaminie Platformy?

## LEG-GATE-05: Warranty and Complaints (Rękojmia i Gwarancja dla B2B)
* **Status**: `OPEN` (Blocks Implementation of Returns Schema).
* **Owner**: Legal Counsel.
* **Context**: Ze względu na fakt, że LogiMarket nie magazynuje produktów (dropshipping), procedowanie rękojmi przy towarach przemysłowych stanowi znaczne obciążenie logistyczne.
* **Neutral Legal Question 1 (Warranty exclusion)**: Na ile jest dopuszczalne, i w jakiej formie (np. regulamin czy oświadczenie checkout) skuteczne wyłączenie rękojmi za wady w trybie B2B w przypadku, gdy LogiMarket figurowałby jako Sprzedawca (jeśli Model A zostanie zatwierdzony)?
* **Neutral Legal Question 2 (Claim channeling)**: Jeżeli SoR przypisany zostanie do Partnera Dropshippingowego (jeśli Model B lub C zostanie zatwierdzony), czy to na niego bezwzględnie przenosi się obowiązek ustosunkowania do roszczeń reklamacyjnych klienta?

## LEG-GATE-06: Carrier Liability (Odpowiedzialność Przewoźnika i Ryzyko Utraty)
* **Status**: `OPEN` (Blocks Implementation of Fulfillment Schema).
* **Owner**: Legal Counsel.
* **Context**: Z uwagi na fakt wysyłania towaru przez stronę trzecią (Partner) bezpośrednio do Kupującego B2B, LogiMarket nie kontroluje jakości opakowania przesyłki ani samej wysyłki.
* **Neutral Legal Question 1 (Risk transfer)**: W którym momencie następuje przejście ryzyka przypadkowej utraty lub uszkodzenia rzeczy przy transakcjach na gruncie Prawa Przewozowego (między oboma przedsiębiorcami: Partnerem/LogiMarket a Kupującym)?
* **Neutral Legal Question 2 (Damage handling)**: Jakie regulacje regulaminowe mogą ustrzec platformę przed ponoszeniem odpowiedzialności cywilnej w sytuacji nieuznania reklamacji (uszkodzenia transportowego) przez przewoźnika wskazanego przez Partnera (Dostawcę Dropshippingowego)?

## LEG-GATE-10: Payment Flow and Funds Handling
* **Status**: `OPEN` (Blocks Implementation of Payment Schema).
* **Owner**: Legal Counsel.
* **Context**: Związane w dużej mierze z LEG-GATE-01.
* **Neutral Legal Question 1 (Holding duration)**: Jeśli LogiMarket będzie księgował wpłaty na dedykowanym koncie technicznym, czy istnieją w polskim prawie maksymalne limity przetrzymywania środków odłożonych celem późniejszego settlementu (wypłaty) do Partnera?
* **Neutral Legal Question 2 (Escrow agreements)**: Jakie są prawnie wymagane konstrukcje kont powierniczych dla minimalizacji naruszeń na tle KNF przy ewentualnych zwrotach z rachunków escrow?
