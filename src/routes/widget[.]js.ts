import { createFileRoute } from "@tanstack/react-router";

const LOADER = String.raw`/* Frontdesk AI widget loader — paste this script before </body>. */
(function () {
  var script = document.currentScript;
  if (!script || script.getAttribute("data-frontdesk-loaded")) return;
  script.setAttribute("data-frontdesk-loaded", "true");

  var origin = new URL(script.src, window.location.href).origin;
  var params = new URLSearchParams();
  var accent = script.getAttribute("data-accent-color");
  var position = script.getAttribute("data-position");
  if (accent) params.set("accent", accent);
  if (position === "left") params.set("position", "left");

  var frame = document.createElement("iframe");
  frame.title = "Frontdesk AI chat widget";
  frame.src = origin + "/widget" + (params.toString() ? "?" + params.toString() : "");
  frame.setAttribute("aria-label", "Frontdesk AI chat widget");
  frame.setAttribute("allow", "clipboard-write");
  frame.style.cssText = [
    "position:fixed",
    "z-index:2147483647",
    "right:0",
    "bottom:0",
    "width:min(430px,100vw)",
    "height:min(670px,100vh)",
    "border:0",
    "background:transparent",
    "color-scheme:light",
    "display:block"
  ].join(";");
  document.body.appendChild(frame);
})();`;

export const Route = createFileRoute("/widget.js")({
  server: {
    handlers: {
      GET: async () =>
        new Response(LOADER, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control":
              "public, max-age=300, stale-while-revalidate=86400",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
