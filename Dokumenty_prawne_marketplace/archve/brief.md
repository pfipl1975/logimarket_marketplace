# LogiMarket — Brief (S5)

## Zadanie
Weryfikacja prawna pakietu dokumentów LogiMarket (Counsel Pack v1.0): model biznesowy, Legal Decision Pack, RODO/Data Flow Pack — odpowiedzi na otwarte bramki prawne blokujące schemat 56B1.

## Wejścia
- doc_01.txt / doc_02.txt / doc_03.txt (konwersja z .docx, .cluster/logimarket/)
- plan.md — struktura analizy (Bloki A–H)
- worker_01_regulatory_research.md (rola prawna, zawarcie umowy, disclosure, P2B, DSA, B2B gating)
- worker_02_gdpr_analysis.md (RODO per aktywność, art. 6/13/14, retencja, DPA, cookie)
- worker_03_tax_analysis.md (VAT, KSeF, DAC7, AML, WHT)
- review.md — kontrola spójności (S4)

## Artifakty końcowe (DELIVERY/)
- **LogiMarket_Weryfikacja_Prawna_Marketplace_B2B.docx** — główny dokument (13 sekcji, 9 tabel):
  1. Zakres i metodologia
  2. Podsumowanie wykonawcze — macierz werdyktów
  3. LEG-MKT-01 rola pośrednika (art. 540 KC) — APPROVED_WITH_CONDITIONS
  4. LEG-MKT-02 zawarcie umowy (E1–E9, R1–R8) — APPROVED_WITH_CONDITIONS
  5. LEG-MKT-03 disclosure sprzedawcy — APPROVED_WITH_CONDITIONS
  6. LEG-MKT-04 P2B + DSA — APPROVED_WITH_CONDITIONS (P2B ma zastosowanie; art. 30 KYBC nie dotyczy B2B-only)
  7. LEG-MKT-08 ograniczenie do B2B — APPROVED_WITH_CONDITIONS (companyName niewystarczające)
  8. LEG-MKT-09/OMQ-MKT-11 RODO — APPROVED_WITH_CONDITIONS (role per ACT, art. 26 zamiast DPA, retencja)
  9. VAT/KSeF/DAC7/AML — uzupełnienie (KSeF priorytet, DAC7, direct pay-out)
  10. Blok H — dodatkowe zagadnienia prawne
  11. Macierz decyzji w formacie kancelarii (werdykt/podstawa/zmiany/wpływ na 56B1)
  12. Priorytety P0/P1/P2
  13. Zastrzeżenia i dalsze kroki

## Kluczowe werdykty (skrót)
1. **Model pośrednika jest prawidłowy** (art. 540 KC) — warunki: czysta konstrukcja umowna, język UI, brak faktur towarowych/escrow własnego.
2. **Order intent + jawna akceptacja Partnera = prawidłowy moment zawarcia umowy** (checkout = oferta, akceptacja = przyjęcie, art. 61/66/68–70 KC); capture dopiero po akceptacji.
3. **RFQ = rokowania (art. 72 KC); wycena niewiążąca wymaga wyraźnego zastrzeżenia** w treści i UI.
4. **P2B ma zastosowanie** (B2B nie wyłącza); obowiązki: skargi, uzasadnienia, opis rankingu, 15 dni, mediacja — UOKiK.
5. **DSA: platforma internetowa**; art. 30 KYBC nie dotyczy czystego B2B; mikro/małe — część wyłączeń (art. 19).
6. **B2B gating: companyName niewystarczające** — deklaracja + NIP/VAT ID + biała lista/CEIDG/KRS/VIES + monitoring; obecnie brak pól NIP w schemacie (zmiana dla 56B1).
7. **RODO**: LogiMarket = administrator we wszystkich ACT; Supabase = procesor (DPA obowiązkowy); przepływ do Partnera = art. 26 (nie DPA); zgoda nie jest podstawą RFQ (rfqLabels.consent do przebudowy); Secure flag cookie = P0.
8. **VAT/KSeF/DAC7 (nieujęte w pytaniach)**: deemed supplier nie dotyczy B2B; prowizja 23% PL / reverse charge UE; KSeF obowiązkowy (1.02/1.04.2026) — priorytet; DAC7 obowiązkowy (raport do 31.01); escrow własny = ryzyko licencji płatniczej.

## Status
S1–S5 zakończone. Gotowe do przekazania Zamawiającemu.
