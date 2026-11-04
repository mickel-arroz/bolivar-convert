import type { CurrencyId } from '@/constants/currencies'
import type { CategorySummaryRow } from '@/hooks/useWallet'
import { getCategoryIcon } from '@/constants/walletCategories'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from './format'
import { ScrollList, ShareRow, ShareSummary, colorOrPalette } from './StatsListParts'

export function CategoryStatsCard({
  title,
  totalLabel,
  rows,
  currency,
  className,
}: {
  title: string
  totalLabel: string
  /** Ya ordenadas de mayor a menor. */
  rows: CategorySummaryRow[]
  currency: CurrencyId
  className?: string
}) {
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  const shares = rows.map((row, i) => ({
    row,
    color: colorOrPalette(row.color, i),
    share: total > 0 ? row.total / total : 0,
  }))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ShareSummary
          label={totalLabel}
          amount={formatMoney(total, currency)}
          detail={`${rows.length} ${rows.length === 1 ? 'categoría' : 'categorías'}`}
          parts={shares.map((s) => ({
            id: s.row.categoryId,
            name: s.row.name,
            share: s.share,
            color: s.color,
          }))}
        />
        <ScrollList>
          {shares.map(({ row, color, share }) => (
            <ShareRow
              key={row.categoryId}
              testId="stats-category-row"
              icon={getCategoryIcon(row.icon)}
              color={color}
              name={row.name}
              amount={formatMoney(row.total, currency)}
              share={share}
            />
          ))}
        </ScrollList>
      </CardContent>
    </Card>
  )
}
