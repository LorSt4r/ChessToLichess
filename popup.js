document.addEventListener("DOMContentLoaded", () => {
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
      badge.textContent = "Not on Chess.com";
      badge.className = "site-badge other";
      setStatus("Please open a finished Chess.com game.", "error");
    }
  });

  // Transfer
  btn.onclick = () => {
    btn.disabled = true;
    setStatus("Extracting PGN...", "loading");
    chrome.runtime.sendMessage({ action: "trigger-import-from-popup" }, (r) => {
      if (chrome.runtime.lastError) {
        setStatus("Error: " + chrome.runtime.lastError.message, "error");
        btn.disabled = false;
        return;
      }
      if (r?.success) {
        setStatus(r.message, "success");
        setTimeout(() => { btn.disabled = false; }, 2000);
      } else {
        setStatus(r?.message || "Error during transfer.", "error");
        btn.disabled = false;
      }
    });
  };

  // Live status from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "status-update") {
      setStatus(msg.message, msg.status);
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
    document.getElementById("shortcut-display").textContent = c?.shortcut || "Not set";
  });
});
