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
  const toggleOneClick = document.getElementById("toggle-oneclick");
  const hintOneClick = document.getElementById("hint-oneclick");
  const statGames = document.getElementById("stat-games");
  const statSaved = document.getElementById("stat-saved");

  // =============================================
  // Usage Stats
  // =============================================
  const COST_PER_GAME = 99.00 / 365; // Chess.com Diamond $99/year ≈ $0.27/game

  chrome.storage.local.get(["usageCount"], (data) => {
    const count = data.usageCount || 0;
    statGames.textContent = count.toLocaleString();
    statSaved.textContent = "$" + (count * COST_PER_GAME).toFixed(2);
  });

  // =============================================
  // One-Click Mode Toggle
  // =============================================
  chrome.storage.local.get(["oneClickMode"], (data) => {
    toggleOneClick.checked = !!data.oneClickMode;
    hintOneClick.style.display = data.oneClickMode ? "block" : "none";
  });

  toggleOneClick.addEventListener("change", () => {
    const enabled = toggleOneClick.checked;
    chrome.storage.local.set({ oneClickMode: enabled });
    hintOneClick.style.display = enabled ? "block" : "none";
  });

  // =============================================
  // Detect Site
  // =============================================
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

  // =============================================
  // Transfer Button
  // =============================================
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
        // Refresh stats after successful transfer
        chrome.storage.local.get(["usageCount"], (data) => {
          const count = data.usageCount || 0;
          statGames.textContent = count.toLocaleString();
          statSaved.textContent = "$" + (count * COST_PER_GAME).toFixed(2);
        });
        setTimeout(() => { btn.disabled = false; }, 2000);
      } else {
        setStatus(r?.message || chrome.i18n.getMessage("errorTransfer"), "error");
        btn.disabled = false;
      }
    });
  };

  // =============================================
  // Live Status from Background
  // =============================================
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

  // =============================================
  // Shortcut Display
  // =============================================
  chrome.commands.getAll((cmds) => {
    const c = cmds.find((x) => x.name === "transfer-to-lichess");
    document.getElementById("shortcut-display").textContent = c?.shortcut || chrome.i18n.getMessage("notSet");
  });

  // =============================================
  // Version Display
  // =============================================
  document.getElementById("version-display").textContent = "v" + chrome.runtime.getManifest().version;
});
