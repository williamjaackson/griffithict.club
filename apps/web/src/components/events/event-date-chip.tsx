import { chipDay, chipMonth, isoDate } from '@/lib/datetime'

/**
 * The red-capped date block beside an event title.
 *
 * A `<time>` with a machine-readable datetime, so the date is not only legible as
 * two stacked fragments of text.
 */
export function EventDateChip({ date, size = 'row' }: { date: Date; size?: 'row' | 'detail' }) {
  const detail = size === 'detail'

  return (
    <time
      dateTime={isoDate(date)}
      className={`flex-none overflow-hidden bg-white ${
        detail
          ? 'bg-surface w-[68px] rounded-[15px]'
          : 'wide:w-[76px] wide:rounded-2xl w-14 rounded-[13px]'
      }`}
    >
      <span
        className={`bg-brand block text-center font-extrabold tracking-[0.14em] text-white uppercase ${
          detail ? 'py-1 text-[10px]' : 'py-[5px] text-[11px]'
        }`}
      >
        {chipMonth(date)}
      </span>
      <span
        className={`text-ink block text-center leading-none font-extrabold tracking-[-0.03em] [font-stretch:108%] ${
          detail
            ? 'pt-[5px] pb-2 text-[26px]'
            : 'wide:py-[6px_9px] wide:text-[30px] py-[4px_7px] text-[22px]'
        }`}
      >
        {chipDay(date)}
      </span>
    </time>
  )
}
