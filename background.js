/**
 * Chess to Lichess - Background Service Worker v1.4.0
 *
 * Flow:
 * 1. Extract PGN from chess.com via injected script
 * 2. Store PGN in chrome.storage.local
 * 3. Open lichess.org/paste, fill PGN, check analysis checkbox, submit form
 *
 * v1.4.0: One-click mode, usage counter, FAB removed
 */

// =============================================
// Extension Icon Click Handler
// =============================================
// No default_popup in manifest → onClicked always fires.
// We decide here whether to open the popup or transfer directly.
chrome.action.onClicked.addListener(async (tab) => {
  const { oneClickMode } = await chrome.storage.local.get("oneClickMode");
  if (oneClickMode) {
    // One-click mode: trigger transfer directly
    await handleTransfer();
  } else {
    // Normal mode: open the popup
    openPopupFallback();
  }
});

// =============================================
// Context Menu (right-click on extension icon)
// =============================================
chrome.runtime.onInstalled.addListener((details) => {
  // Create context menu items on the extension icon
  chrome.contextMenus.create({
    id: "open-menu",
    title: chrome.i18n.getMessage("openMenu") || "Open menu",
    contexts: ["action"],
  });
  chrome.contextMenus.create({
    id: "toggle-oneclick",
    title: chrome.i18n.getMessage("oneClickMode") || "One-click mode",
    type: "checkbox",
    checked: false,
    contexts: ["action"],
  });

  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://ko-fi.com/lorenzovasile" });
  }

  // Sync checkbox state with storage
  chrome.storage.local.get("oneClickMode", ({ oneClickMode }) => {
    chrome.contextMenus.update("toggle-oneclick", { checked: !!oneClickMode });
  });
});

// Sync context menu checkbox when storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.oneClickMode) {
    chrome.contextMenus.update("toggle-oneclick", {
      checked: !!changes.oneClickMode.newValue,
    }).catch(() => {});
  }
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "open-menu") {
    openPopupFallback();
  }
  if (info.menuItemId === "toggle-oneclick") {
    await chrome.storage.local.set({ oneClickMode: info.checked });
  }
});

// Helper to open popup with fallback
function openPopupFallback() {
  chrome.action.openPopup().catch(() => {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 360,
      height: 520,
      focused: true,
    });
  });
}

// =============================================
// Keyboard Shortcut
// =============================================
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "transfer-to-lichess") {
    await handleTransfer();
  }
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "trigger-import-from-popup") {
    handleTransfer()
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, message: err.message }));
    return true;
  }

  if (request.action === "trigger-import") {
    handleTransfer();
    sendResponse({ ok: true });
  }

  if (request.action === "status-update") {
    chrome.runtime.sendMessage(request).catch(() => {});
  }
});

// =============================================
// Main Transfer Flow
// =============================================
async function handleTransfer() {
  broadcast("loading", chrome.i18n.getMessage("extractingPgn"));

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || !tab.url.includes("chess.com")) {
    const errorMsg = chrome.i18n.getMessage("mustBeOnChess");
    broadcast("error", errorMsg);
    return { success: false, message: errorMsg };
  }

  try {
    // 1. Extract PGN from chess.com
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPgnFromChessCom,
    });

    const pgn = results?.[0]?.result;

    if (!pgn) {
      const errorMsg = chrome.i18n.getMessage("pgnNotFound");
      broadcast("error", errorMsg);
      return { success: false, message: errorMsg };
    }

    // 2. Increment usage counter immediately after PGN extraction
    //    (do this before opening Lichess so it's counted even if paste fails)
    await incrementUsageCounter();

    // 3. Open lichess.org/paste, fill form, check analysis, submit
    broadcast("loading", chrome.i18n.getMessage("openingLichess"));
    await handleLichessPaste(pgn);

    broadcast("success", chrome.i18n.getMessage("analysisStarted"));
    return { success: true, message: chrome.i18n.getMessage("compAnalysisStarted") };
  } catch (err) {
    const msg = err.message || "Error";
    broadcast("error", msg);
    return { success: false, message: msg };
  }
}

// =============================================
// Usage Counter
// =============================================
async function incrementUsageCounter() {
  const { usageCount = 0 } = await chrome.storage.local.get("usageCount");
  await chrome.storage.local.set({ usageCount: usageCount + 1 });
}

// =============================================
// Open lichess.org/paste and Auto-Submit
// =============================================
async function handleLichessPaste(pgn) {
  // Store PGN for the injected script to use
  await chrome.storage.local.set({ pendingPgn: pgn });

  // Open or reuse lichess.org/paste tab
  const tabs = await chrome.tabs.query({ url: "https://lichess.org/paste*" });
  let lichessTab;

  if (tabs.length > 0) {
    lichessTab = tabs[0];
    await chrome.tabs.update(lichessTab.id, { active: true });
    await chrome.tabs.reload(lichessTab.id);
  } else {
    lichessTab = await chrome.tabs.create({
      url: "https://lichess.org/paste",
      active: true,
    });
  }

  // Wait for tab to load
  await waitForTabLoad(lichessTab.id);

  // Inject the form-filling script
  await chrome.scripting.executeScript({
    target: { tabId: lichessTab.id },
    func: fillLichessPasteForm,
    args: [pgn],
  });
}

// =============================================
// Function injected into lichess.org/paste
// =============================================
async function fillLichessPasteForm(pgn) {
  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Wait for the form to be ready
  for (let i = 0; i < 20; i++) {
    const textarea = document.querySelector("#form3-pgn") ||
                     document.querySelector('textarea[name="pgn"]') ||
                     document.querySelector("textarea");
    if (textarea) break;
    await delay(300);
  }

  // 1. Find and fill the PGN textarea
  const textarea = document.querySelector("#form3-pgn") ||
                   document.querySelector('textarea[name="pgn"]') ||
                   document.querySelector(".form-control") ||
                   document.querySelector("textarea");

  if (!textarea) {
    console.error("[Chess2Lichess] Textarea not found on lichess.org/paste");
    return false;
  }

  // Set the value and trigger input events
  textarea.value = pgn;
  textarea.focus();
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));

  await delay(300);

  // 2. Check the "Request computer analysis" checkbox
  const checkbox = document.querySelector("#form3-analyse") ||
                   document.querySelector('input[name="analyse"]') ||
                   document.querySelector('input[type="checkbox"]');

  if (checkbox && !checkbox.checked) {
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    checkbox.dispatchEvent(new Event("click", { bubbles: true }));
    console.log("[Chess2Lichess] Analysis checkbox checked ✓");
  }

  await delay(300);

  // 3. Submit the form
  const submitBtn = document.querySelector('button[type="submit"].submit') ||
                    document.querySelector('button[type="submit"]') ||
                    document.querySelector(".form-actions button");

  if (submitBtn) {
    submitBtn.click();
    console.log("[Chess2Lichess] Form submitted ✓");
    return true;
  }

  // Fallback: submit the form directly
  const form = textarea.closest("form") || document.querySelector("form.import");
  if (form) {
    form.submit();
    console.log("[Chess2Lichess] Form submitted via form.submit() ✓");
    return true;
  }

  console.error("[Chess2Lichess] Could not find submit button or form");
  return false;
}

// =============================================
// Wait for Tab to Finish Loading
// =============================================
function waitForTabLoad(tabId, timeout = 15000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeout);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 1000); // Extra delay for JS init
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

// =============================================
// Injected into chess.com — Extract PGN
// =============================================
async function extractPgnFromChessCom() {
  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function getShareButton() {
    let btn = document.querySelector('button[aria-label="Share"]');
    if (btn) return btn;

    const classes = [
      "icon-font-chess share live-game-buttons-button",
      "icon-font-chess share game-buttons-button",
      "icon-font-chess share daily-game-footer-icon",
      "icon-font-chess share daily-game-footer-button",
    ];
    for (const cls of classes) {
      btn = document.getElementsByClassName(cls)[0];
      if (btn) return btn;
    }

    btn = document.querySelector('[class*="icon-font-chess"][class*="share"]');
    if (btn) return btn;

    for (const el of document.querySelectorAll("button, [role='button']")) {
      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      const cls = (el.className || "").toLowerCase();
      if (aria.includes("share") || aria.includes("condividi") || cls.includes("share")) {
        return el;
      }
    }
    return null;
  }

  function findPgnTab() {
    let tab = document.querySelector("#tab-pgn");
    if (tab) return tab;

    for (const el of document.querySelectorAll("button, [role='tab'], a, span, div")) {
      if (el.textContent.trim() === "PGN" && el.offsetParent !== null) {
        return el;
      }
    }
    return null;
  }

  function findPgnTextarea() {
    let ta = document.querySelector(".share-menu-tab-pgn-textarea");
    if (ta && ta.value && ta.value.includes("[")) return ta;

    for (const el of document.querySelectorAll("textarea")) {
      if (el.value && (el.value.includes("[Event") || el.value.includes("[Site") || el.value.includes("[White"))) {
        return el;
      }
    }
    return null;
  }

  function closeModal() {
    const selectors = [
      ".cc-close-button-component",
      ".icon-font-chess.x.share-menu-close-icon",
      ".icon-font-chess.x",
      '[aria-label="Close"]',
      '[aria-label="Chiudi"]',
      ".ui_outside-close-icon",
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) { el.click(); return; }
      } catch (e) {}
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
  }

  try {
    const shareBtn = getShareButton();
    if (!shareBtn) return null;

    shareBtn.click();
    await delay(1000);

    const pgnTab = findPgnTab();
    if (pgnTab) {
      pgnTab.click();
      await delay(600);
    }

    let pgn = null;
    for (let i = 0; i < 10; i++) {
      const ta = findPgnTextarea();
      if (ta && ta.value && ta.value.includes("[")) {
        pgn = ta.value;
        break;
      }
      await delay(400);
      if (i === 3) {
        const tab2 = findPgnTab();
        if (tab2) { tab2.click(); await delay(400); }
      }
    }

    closeModal();
    return pgn;
  } catch (err) {
    try {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    } catch (e) {}
    return null;
  }
}

// =============================================
// Status Broadcast
// =============================================
function broadcast(status, message) {
  chrome.runtime.sendMessage({ action: "status-update", status, message }).catch(() => {});
}
