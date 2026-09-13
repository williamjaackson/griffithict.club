import type { Metadata } from 'next'
import { perks } from '@/content'

export const metadata: Metadata = {
  title: 'Perks program',
  description: 'Discounts and offers for Griffith ICT Club members.',
}

/**
 * Both mockups link to a perks program from the footer, but neither designed a
 * page for it. This renders whatever is in perks.yaml against the existing type
 * scale; the layout is a placeholder until there is a design.
 * See docs/OPEN-QUESTIONS.md.
 */
export default function PerksPage() {
  return (
    <main className="px-[clamp(24px,5.5vw,88px)] pt-[clamp(40px,5vw,72px)] pb-[clamp(52px,7vw,90px)]">
      <h1 className="m-0 pb-[clamp(20px,2.5vw,30px)] text-[clamp(12px,1.3vw,14px)] font-bold tracking-[0.2em] uppercase">
        Perks program
      </h1>

      {perks.length === 0 ? (
        <p className="text-muted m-0 max-w-[52ch] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-pretty">
          Nothing here yet. Member perks get announced in the Discord first.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-[clamp(18px,2.4vw,32px)]">
          {perks.map((perk) => (
            <div key={perk.name} className="flex flex-col gap-2">
              <h2 className="m-0 text-[clamp(22px,2.2vw,30px)] leading-[1.05] font-extrabold tracking-[-0.028em] [font-stretch:112%]">
                {perk.name}
              </h2>
              <p className="text-body m-0 text-[clamp(15px,1.3vw,17px)] leading-[1.55] text-pretty">
                {perk.description}
              </p>
              {perk.url && (
                <a href={perk.url} className="text-brand font-bold hover:underline">
                  Claim it
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
