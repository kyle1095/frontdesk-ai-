import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { HelpDeskWidget } from "~/components/HelpDeskWidget";
import { business, helpDesk } from "~/content/business";
import { widgetBusiness } from "~/server/api";

export const Route = createFileRoute("/widget")({
  component: WidgetPage,
});

function WidgetPage() {
  const [options, setOptions] = useState({
    accent: "#0f766e",
    position: "right" as const,
    businessSlug: "cadence",
    businessName: business.name,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accent = params.get("accent");
    const position = params.get("position") === "left" ? "left" : "right";
    const businessSlug = params.get("business") || "cadence";
    setOptions({
      accent: accent && /^#[0-9a-f]{3,8}$/i.test(accent) ? accent : "#0f766e",
      position,
      businessSlug,
    });
    void widgetBusiness({ data: { businessId: businessSlug } }).then((profile) => {
      setOptions((current) => ({ ...current, businessName: profile.name }));
    }).catch(() => {});
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.style.margin = "0";
  }, []);

  const config = useMemo(
    () => ({
      businessId: options.businessSlug,
      businessName: options.businessName,
      title: `${business.name} support`,
      subtitle: "Answers, fixes, tickets and demos",
      greeting: helpDesk.greeting,
      accent: options.accent,
      quickActions: [...helpDesk.quickActions],
      suggestions: [...helpDesk.suggestions],
      apiUrl: "/api/chat",
      position: options.position,
    }),
    [options],
  );

  return (
    <div className="widget-frame-root min-h-dvh bg-transparent">
      <HelpDeskWidget config={config} />
    </div>
  );
}
