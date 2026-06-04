/**
 * Chess to Lichess — Chess.com Content Script
 * Adds a floating action button on chess.com game pages.
 */
(function () {
  if (window.__c2l) return;
  window.__c2l = true;

  let fab, tip;

  function create() {
    if (document.getElementById("c2l-fab")) return;

    fab = document.createElement("button");
    fab.id = "c2l-fab";
    fab.title = "Analizza su Lichess";
    fab.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>`;
    Object.assign(fab.style, {
      position: "fixed", bottom: "20px", right: "20px", zIndex: "999999",
      width: "52px", height: "52px", borderRadius: "50%", border: "none",
      background: "linear-gradient(135deg, #7b2ff7, #2196f3)",
      cursor: "pointer", display: "none", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 18px rgba(123,47,247,.4)",
      transition: "transform .2s, box-shadow .2s, opacity .3s", opacity: "0",
    });

    tip = document.createElement("div");
    tip.textContent = "→ Lichess";
    Object.assign(tip.style, {
      position: "fixed", bottom: "80px", right: "20px", zIndex: "999999",
      background: "rgba(0,0,0,.85)", color: "#fff", padding: "6px 12px",
      borderRadius: "6px", fontSize: "12px", fontFamily: "system-ui, sans-serif",
      pointerEvents: "none", opacity: "0", transition: "opacity .15s", whiteSpace: "nowrap",
    });

    fab.onmouseenter = () => { tip.style.opacity = "1"; fab.style.transform = "scale(1.12)"; };
    fab.onmouseleave = () => { tip.style.opacity = "0"; fab.style.transform = "scale(1)"; };
    fab.onclick = () => chrome.runtime.sendMessage({ action: "trigger-import" });

    document.body.append(fab, tip);
    requestAnimationFrame(() => { fab.style.opacity = "1"; });
  }

  function visible() {
    const u = location.href;
    return (u.includes("/game") || u.includes("/live#g=") || u.includes("/play")) && !!findShare();
  }

  function findShare() {
    let b = document.querySelector('button[aria-label="Share"]');
    if (b) return b;
    b = document.querySelector('[class*="icon-font-chess"][class*="share"]');
    return b;
  }

  function tick() {
    if (!fab) create();
    fab.style.display = visible() ? "flex" : "none";
  }

  setInterval(tick, 2000);
  setTimeout(tick, 500);
})();
