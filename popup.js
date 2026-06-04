document.addEventListener("DOMContentLoaded", () => {
  // Translate UI elements with data-i18n attribute
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const msg = chrome.i18n.getMessage(key);
    if (msg) {
      // Preserve HTML tags like <strong> inside hints if needed
      if (key === "hint") {
        el.innerHTML = msg.replace("Chess.com", "<strong>Chess.com</strong>").replace("Alt+Shift+L", "<strong>Alt+Shift+L</strong>");
      } else {
        el.textContent = msg;
      }
    }
  });

  const btn = document.getElementById("btn-transfer");
  const statusEl = document.getElementById("status");
  const statusText = document.getElementById("status-text");
  const badge = document.getElementById("site-status");

  // Detect site
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.url?.includes("chess.com")) {
      badge.textContent = "Chess.com ✓";
      badge.className = "site-badge chess-com";
      btn.disabled = false;
    } else {
      badge.textContent = chrome.i18n.getMessage("notOnChessCom") || "Not on Chess.com";
      badge.className = "site-badge other";
      setStatus(chrome.i18n.getMessage("pleaseOpenGame"), "error");
    }
  });

  // Transfer
  btn.onclick = () => {
    btn.disabled = true;
    setStatus(chrome.i18n.getMessage("extractingPgn"), "loading");
    chrome.runtime.sendMessage({ action: "trigger-import-from-popup" }, (r) => {
      if (chrome.runtime.lastError) {
        setStatus(chrome.i18n.getMessage("errorState") + chrome.runtime.lastError.message, "error");
        btn.disabled = false;
        return;
      }
      if (r?.success) {
        setStatus(r.message, "success");
        setTimeout(() => { btn.disabled = false; }, 2000);
      } else {
        setStatus(r?.message || chrome.i18n.getMessage("errorTransfer"), "error");
        btn.disabled = false;
      }
    });
  };

  // Live status from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "status-update") {
      // Find the translated text from background message keys if possible
      let localMsg = msg.message;
      if (msg.message === "Extracting PGN from Chess.com...") localMsg = chrome.i18n.getMessage("extractingPgn");
      if (msg.message === "Opening Lichess...") localMsg = chrome.i18n.getMessage("openingLichess");
      if (msg.message === "Must be on Chess.com!") localMsg = chrome.i18n.getMessage("mustBeOnChess");
      if (msg.message === "PGN not found. Is the game finished?") localMsg = chrome.i18n.getMessage("pgnNotFound");
      if (msg.message === "Analysis started on Lichess! ♟️") localMsg = chrome.i18n.getMessage("analysisStarted");

      setStatus(localMsg, msg.status);
      if (msg.status !== "loading") btn.disabled = false;
    }
  });

  function setStatus(msg, type) {
    statusEl.className = `status ${type}`;
    statusText.textContent = msg;
  }

  // Shortcut display
  chrome.commands.getAll((cmds) => {
    const c = cmds.find((x) => x.name === "transfer-to-lichess");
    document.getElementById("shortcut-display").textContent = c?.shortcut || chrome.i18n.getMessage("notSet");
  });

  // Version display
  document.getElementById("version-display").textContent = "v" + chrome.runtime.getManifest().version;
});

