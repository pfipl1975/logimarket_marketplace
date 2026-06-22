export function formatPrice(
  price: string | null,
  onRequest: boolean,
): string {
  if (onRequest || price == null) return 'Cena na zapytanie B2B'
  const value = Number(price)
  if (Number.isNaN(value)) return 'Cena na zapytanie B2B'
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(value)
}
