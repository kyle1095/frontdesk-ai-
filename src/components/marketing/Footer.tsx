/**
 * Bordered footer card shared by the ReceptIO marketing pages.
 * Visual spec: ReceptIO-Website-Package/ReceptIO-Design-Handoff.docx §2.4.
 */

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/install", label: "Install" },
] as const;

export function MarketingFooter() {
  return (
    <div className="flex flex-1 flex-col justify-center bg-rc-bg px-4 py-16 sm:px-10">
      <div className="mx-auto w-full max-w-[1160px] rounded-[20px] border border-rc-border bg-rc-surface p-8 sm:p-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-rc-accent">
              <span className="font-heading text-sm font-extrabold text-rc-on-accent">R</span>
            </span>
            <span className="font-heading text-lg font-extrabold text-rc-text">ReceptIO</span>
          </div>
          <div className="flex gap-7">
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-semibold text-rc-text-secondary hover:text-rc-text">
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className="my-6 border-t border-rc-border" />
        <div className="flex flex-wrap gap-10">
          <p className="max-w-[360px] text-[13px] leading-6 text-rc-text-secondary">
            Support hours: Monday to Friday, 9am to 6pm ET. ReceptIO answers from your content any time — new tickets get a reply the next business day.
          </p>
          <p className="max-w-[360px] text-[13px] leading-6 text-rc-text-secondary">
            ReceptIO is an embeddable AI help-desk widget for small service businesses. It answers from your own content, and says so honestly when it can&apos;t.
          </p>
        </div>
        <p className="mt-6 text-xs text-rc-text-tertiary">© 2026 ReceptIO</p>
      </div>
    </div>
  );
}
