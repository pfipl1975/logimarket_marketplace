import Link from 'next/link'
import type { Category } from '@/lib/db/schema'

export function CategoryFilter({
  categories,
  active,
}: {
  categories: Category[]
  active?: string
}) {
  const items = [{ name: 'Wszystkie kategorie', slug: '' }, ...categories]

  return (
    <nav aria-label="Kategorie" className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = (active ?? '') === item.slug
        const href = item.slug ? `/?kategoria=${item.slug}` : '/'
        return (
          <Link
            key={item.slug || 'all'}
            href={href}
            className={
              isActive
                ? 'rounded-full bg-navy px-4 py-2 text-sm font-medium text-navy-foreground'
                : 'rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-teal hover:text-teal'
            }
          >
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
