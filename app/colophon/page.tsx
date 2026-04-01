import Image from "next/image";
import Link from "next/link";

export default function Colophon() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#e9e6de] text-[#383640]">
      <div className="mx-auto max-w-[1600px] px-2 py-2 sm:px-3 sm:py-3 lg:px-6 lg:py-4">
        <section className="border border-[#d4d0c7] bg-[#f4f1ea] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <header className="border-b border-[#d7d2c8] pb-8">
            <div className="grid gap-x-8 gap-y-8 sm:gap-y-10 md:grid-cols-[156px_minmax(0,1fr)] md:items-start md:gap-x-8 md:gap-y-10 lg:grid-cols-[184px_minmax(0,1fr)] lg:gap-x-9 lg:gap-y-12">
              <div className="justify-self-start">
                <div className="overflow-hidden border border-[#5a5860] bg-[#f4f1ea] p-[4px] shadow-[0_10px_28px_rgba(0,0,0,0.08)]">
                  <Image
                    src="/brand-court.svg"
                    alt="Fields of Hoops brand mark"
                    width={176}
                    height={176}
                    className="h-[112px] w-[112px] sm:h-[128px] sm:w-[128px] lg:h-[156px] lg:w-[156px]"
                    priority
                  />
                </div>
              </div>

              <div className="min-w-0 self-start">
                <p className="pl-[2px] text-[9px] uppercase tracking-[0.7em] text-[#8e8a80] sm:text-[10px] sm:tracking-[0.78em]">
                  Gen-BA
                </p>
                <h1 className="mt-4 text-[32px] font-medium uppercase leading-[0.95] tracking-[-0.05em] text-[#46424c] sm:mt-5 sm:text-[36px] lg:text-[45px]">
                  Colophon
                </h1>
                <p className="mt-4 max-w-[430px] text-[16px] leading-[1.6] tracking-[-0.01em] text-[#4e4a54] sm:max-w-[470px] sm:text-[18px] sm:leading-[1.55] sm:tracking-[-0.02em] md:text-[19px]">
                  Notes on the project, the data source, and the system behind the posters.
                </p>
              </div>
            </div>
          </header>

          <div className="mt-8 grid gap-8 lg:gap-10 xl:grid-cols-[minmax(0,760px)_280px]">
            <div className="space-y-8">
              <ColophonSection title="What Is This">
                <p>
                  Fields of Hoops turns NBA shot-chart data into abstract generative posters. Each
                  game becomes a composition shaped by shot pressure, made baskets, team control,
                  and highlighted scoring moments.
                </p>
                <p>
                  The goal is to make something that feels collectible and frameable rather than a
                  dashboard or stat sheet.
                </p>
              </ColophonSection>

              <ColophonSection title="Inspired By">
                <p>
                  <a
                    href="https://fieldsofchess.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#46424c] underline underline-offset-2 transition-colors hover:text-[#1f1d24]"
                  >
                    Fields of Chess
                  </a>{" "}
                  showed how structured game data can become beautiful poster compositions. This
                  project follows that spirit through basketball shot geography.
                </p>
              </ColophonSection>

              <ColophonSection title="Data">
                <p>
                  The app now searches and loads games through live NBA stats endpoints, then pulls
                  shot-chart data for the selected matchup before generating the poster.
                </p>
                <p>
                  The live routes in this project proxy NBA Stats so the browser can search by teams
                  and date without relying only on the bundled local game files.
                </p>
              </ColophonSection>

              <ColophonSection title="Stack">
                <ul className="space-y-2">
                  <li>Next.js App Router with TypeScript</li>
                  <li>Tailwind CSS</li>
                  <li>HTML Canvas for poster rendering</li>
                  <li>Geist Mono for the editorial interface</li>
                  <li>Custom live NBA API proxy routes</li>
                </ul>
              </ColophonSection>
            </div>

            <aside className="space-y-6 border border-[#d7d2c8] bg-[#fbf9f3] px-4 py-5 sm:px-5 sm:py-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.34em] text-[#8e8a80]">Navigation</p>
                <div className="mt-4 space-y-3 text-[12px] uppercase tracking-[0.16em] text-[#4e4a54] sm:text-[13px] sm:tracking-[0.2em]">
                  <Link href="/" className="block transition-colors hover:text-[#1f1d24]">
                    Back Home
                  </Link>
                  <a
                    href="https://stats.nba.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block transition-colors hover:text-[#1f1d24]"
                  >
                    NBA Stats
                  </a>
                  <a
                    href="https://fieldsofchess.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block transition-colors hover:text-[#1f1d24]"
                  >
                    Fields of Chess
                  </a>
                </div>
              </div>

              <div className="border-t border-[#d7d2c8] pt-5">
                <p className="text-[10px] uppercase tracking-[0.34em] text-[#8e8a80]">Made By</p>
                <p className="mt-3 text-[14px] uppercase tracking-[0.18em] text-[#4e4a54]">
                  mounikb
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#8e8a80]">2026</p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function ColophonSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[#d7d2c8] pt-6">
      <div className="flex items-baseline gap-2 sm:gap-3">
        <span className="text-[12px] uppercase tracking-[0.16em] text-[#3a3841] sm:text-[14px] sm:tracking-[0.18em]">.</span>
        <h2 className="text-[19px] uppercase tracking-[-0.03em] text-[#3a3841] sm:text-[22px] sm:tracking-[-0.04em]">{title}</h2>
      </div>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-[#4e4a54] sm:text-[16px] sm:leading-8">{children}</div>
    </section>
  );
}
