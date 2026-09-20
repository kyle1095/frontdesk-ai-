/**
 * Floating nav bar shared by the ReceptIO marketing pages (home, pricing, install).
 * Visual spec: ReceptIO-Website-Package/ReceptIO-Design-Handoff.docx §2.4.
 */

const LINKS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/pricing", label: "Pricing", key: "pricing" },
  { href: "/install", label: "Install", key: "install" },
] as const;

export function MarketingNav({ active }: { active: "home" | "pricing" | "install" }) {
  return (
    <div className="px-4 pt-7 sm:px-10">
      <div className="mx-auto flex h-16 max-w-[1160px] items-center justify-between rounded-[20px] border border-rc-border bg-rc-surface px-3 pl-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
        <a href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rc-accent">
            <span className="font-heading text-base font-extrabold text-rc-on-accent">R</span>
          </span>
          <span className="font-heading text-[19px] font-extrabold text-rc-text">ReceptIO</span>
        </a>
        <nav aria-label="Main" className="hidden items-center gap-0.5 sm:flex">
          {LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className={
                "rounded-[10px] px-4 py-2.5 text-[15px] transition " +
                (active === link.key
                  ? "bg-rc-card-raised font-bold text-rc-text"
                  : "font-semibold text-rc-text-secondary hover:bg-rc-card-raised hover:text-rc-text")
              }
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href="/install"
          className="whitespace-nowrap rounded-lg bg-rc-accent px-5 py-3 font-heading text-sm font-bold text-rc-on-accent transition hover:brightness-95"
        >
          Install it free
        </a>
      </div>
    </div>
  );
}
