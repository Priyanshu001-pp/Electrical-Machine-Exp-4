(function () {
  let initialized = false;

  const fallbackProgress = {
    hasUser: () => false,
    declineReport: () => {},
    getState: () => ({ flags: {} }),
    initPage: () => {},
    mark: () => {},
  };

  const VP = () => (window.VLProgress ? window.VLProgress : fallbackProgress);
  const USER_FORM_PROMPT_MESSAGE =
    "If you want to generate a progress report, first you have to fill your details in the user form.";
  const USER_FORM_PROMPT_AUDIO_SRC = "./audio/userinput.wav";
  const PROGRESS_REPORT_ACCESS_ALERT_BOTH_MESSAGE =
    "To access the progress report, first fill out the user form and generate the simulation report by performing the experiment.";
  const PROGRESS_REPORT_ACCESS_ALERT_USER_ONLY_MESSAGE =
    "Please fill out the user form to access the progress report.";
  const PROGRESS_REPORT_ACCESS_ALERT_SIM_ONLY_MESSAGE =
    "Please generate the simulation report by performing the experiment.";
  const PROGRESS_REPORT_ACCESS_ALERT_AUDIO_SRC = "./audio/progressreportalert.wav";
  let userFormPromptAudioEl = null;
  let progressReportAccessAlertAudioEl = null;

  function canAccessProgressReport() {
    const api = VP();
    if (typeof api.canAccessProgressReport === "function") {
      return !!api.canAccessProgressReport();
    }
    const hasUser = typeof api.hasUser === "function" ? !!api.hasUser() : false;
    const hasSimulationReport =
      typeof api.hasSimulationReport === "function" ? !!api.hasSimulationReport() : false;
    return hasUser && hasSimulationReport;
  }

  function getProgressReportRequirements() {
    const api = VP();
    const hasUser = typeof api.hasUser === "function" ? !!api.hasUser() : false;
    const hasSimulationReport =
      typeof api.hasSimulationReport === "function" ? !!api.hasSimulationReport() : false;
    return { needsUser: !hasUser, needsSim: !hasSimulationReport };
  }

  function getProgressReportAccessAlertMessage(needsUser, needsSim) {
    const api = VP();
    if (typeof api.getProgressReportBlockMessage === "function") {
      return String(api.getProgressReportBlockMessage(needsUser, needsSim) || "").trim() ||
        PROGRESS_REPORT_ACCESS_ALERT_BOTH_MESSAGE;
    }
    if (needsUser && needsSim) return PROGRESS_REPORT_ACCESS_ALERT_BOTH_MESSAGE;
    if (needsUser) return PROGRESS_REPORT_ACCESS_ALERT_USER_ONLY_MESSAGE;
    if (needsSim) return PROGRESS_REPORT_ACCESS_ALERT_SIM_ONLY_MESSAGE;
    return PROGRESS_REPORT_ACCESS_ALERT_BOTH_MESSAGE;
  }

  function isProgressReportLink(href) {
    const value = String(href || "").trim().toLowerCase();
    if (!value) return false;
    return (
      value.includes("progressreport") ||
      value === "#progressreport" ||
      value.endsWith("#progressreport")
    );
  }

  function playUserFormPromptAudio() {
    if (!USER_FORM_PROMPT_AUDIO_SRC) return;
    if (!userFormPromptAudioEl) {
      userFormPromptAudioEl = new Audio(USER_FORM_PROMPT_AUDIO_SRC);
      userFormPromptAudioEl.preload = "auto";
    }
    userFormPromptAudioEl.currentTime = 0;
    const playPromise = userFormPromptAudioEl.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }

  function stopUserFormPromptAudio() {
    if (!userFormPromptAudioEl) return;
    userFormPromptAudioEl.pause();
    userFormPromptAudioEl.currentTime = 0;
  }

  function playProgressReportAccessAlertAudio(message) {
    const normalizedMessage = String(message || "").trim();
    if (normalizedMessage !== PROGRESS_REPORT_ACCESS_ALERT_BOTH_MESSAGE) return;
    if (!PROGRESS_REPORT_ACCESS_ALERT_AUDIO_SRC) return;
    if (!progressReportAccessAlertAudioEl) {
      progressReportAccessAlertAudioEl = new Audio(PROGRESS_REPORT_ACCESS_ALERT_AUDIO_SRC);
      progressReportAccessAlertAudioEl.preload = "auto";
    }
    progressReportAccessAlertAudioEl.currentTime = 0;
    const playPromise = progressReportAccessAlertAudioEl.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }

  function stopProgressReportAccessAlertAudio() {
    if (!progressReportAccessAlertAudioEl) return;
    progressReportAccessAlertAudioEl.pause();
    progressReportAccessAlertAudioEl.currentTime = 0;
  }

  function getPageName() {
    const parts = window.location.pathname.split("/");
    return parts.pop() || "index.html";
  }

  function ensureAlertThemeCss() {
    const head = document.head || document.getElementsByTagName("head")[0];
    if (!head) return;
    if (head.querySelector('link[href*="alert-theme.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./alert-theme.css";
    head.appendChild(link);
  }

  const modalsMarkup = `
    <div id="userFormPrompt" class="fixed inset-0 hidden items-center justify-center z-[99999] bg-black/60 p-4">
      <div class="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
        <h3 class="text-xl font-bold text-gray-900">Alert</h3>
        <p class="text-gray-700 mt-2">
          ${USER_FORM_PROMPT_MESSAGE}
        </p>
        <div class="mt-5 flex justify-end gap-3">
          <button id="promptNo" class="px-4 py-2 rounded-lg border border-gray-300 font-semibold text-gray-700 hover:bg-gray-100">NO</button>
          <button id="promptYes" class="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">YES</button>
        </div>
      </div>
    </div>

    <div id="userInputModal" class="hidden fixed inset-0 z-[100000] bg-black/60 px-4 py-8 items-center justify-center">
      <div class="relative w-full max-w-4xl h-[85vh] bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-200">
        <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 class="text-lg font-semibold text-slate-900">User Input Form</h3>
          <button id="userInputModalClose" type="button" class="text-slate-600 hover:text-slate-900 rounded-full">
            <span aria-hidden="true" class="text-2xl leading-none">&times;</span>
          </button>
        </div>
        <iframe id="userInputIframe" class="w-full h-full border-0" src="" title="User Input Form"></iframe>
      </div>
    </div>
  `;

  const alertModalMarkup = `
    <div id="aimAlertModal" class="modal" role="alertdialog" aria-modal="true" aria-labelledby="aimAlertTitle" aria-describedby="aimAlertMessage">
      <div class="modal-box" role="document">
        <h2 id="aimAlertTitle">Alert</h2>
        <p id="aimAlertMessage"></p>
        <button type="button" class="modal-close-btn" data-aim-alert-close>OK</button>
      </div>
    </div>
  `;

  let alertModal, alertTitle, alertMessage, alertClose, alertOnClose = null, alertWired = false;

  function ensureUserInputStyles() {
    const head = document.head || document.getElementsByTagName("head")[0];
    if (!head) return;
    if (head.querySelector('style[data-user-input-pill]')) return;
    const style = document.createElement("style");
    style.setAttribute("data-user-input-pill", "true");
    style.textContent = `
      .nav-user-link { padding: 0 !important; background: transparent !important; display: inline-flex; align-items: center; }
      .nav-user-link::after { display: none !important; }
      .nav-user-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.35rem 0.85rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        box-shadow: 0 8px 22px rgba(2, 26, 44, 0.35);
        transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
      }
      .nav-user-link:hover .nav-user-pill,
      .nav-user-link:focus .nav-user-pill {
        background: rgba(255, 255, 255, 0.12);
        box-shadow: 0 10px 26px rgba(2, 26, 44, 0.45);
        transform: translateY(-1px);
      }
      .nav-user-avatar {
        width: 42px;
        height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 800;
        letter-spacing: 0.02em;
        border-radius: 999px;
        background: linear-gradient(135deg, #0b60a8, #021a2c);
        box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.18), 0 8px 16px rgba(2, 26, 44, 0.25);
        text-transform: uppercase;
      }
      .nav-user-text { color: #e2e8f0; font-weight: 700; }
      .nav-user-link-active .nav-user-pill {
        border-color: rgba(255, 255, 255, 0.3);
        box-shadow: 0 10px 28px rgba(2, 26, 44, 0.5);
      }
    `;
    head.appendChild(style);
  }

  function ensureModals() {
    if (document.getElementById("userFormPrompt")) return;
    document.body.insertAdjacentHTML("beforeend", modalsMarkup);
  }

  function ensureAlertModal() {
    if (!document.getElementById("aimAlertModal")) {
      document.body.insertAdjacentHTML("beforeend", alertModalMarkup);
    }
    alertModal = document.getElementById("aimAlertModal");
    alertTitle = document.getElementById("aimAlertTitle");
    alertMessage = document.getElementById("aimAlertMessage");
    alertClose = alertModal?.querySelector("[data-aim-alert-close]");
    if (alertModal && !alertWired) {
      alertWired = true;
      alertClose?.addEventListener("click", closeThemedAlert);
      alertModal.addEventListener("click", (event) => {
        if (event.target === alertModal) closeThemedAlert();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && alertModal.classList.contains("show")) closeThemedAlert();
      });
    }
  }

  function showThemedAlert(message, title = "Notice", onClose = null) {
    ensureAlertModal();
    if (!alertModal || !alertTitle || !alertMessage) {
      alert(message);
      if (typeof onClose === "function") onClose();
      return;
    }
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alertOnClose = typeof onClose === "function" ? onClose : null;
    alertModal.classList.add("show");
    document.body.classList.add("is-modal-open");
    alertClose?.focus?.();
    playProgressReportAccessAlertAudio(message);
  }

  function closeThemedAlert() {
    stopProgressReportAccessAlertAudio();
    if (!alertModal) return;
    alertModal.classList.remove("show");
    document.body.classList.remove("is-modal-open");
    const cb = alertOnClose;
    alertOnClose = null;
    if (cb) cb();
  }

  function retargetProgressLinks(root = document) {
    const anchors = root.querySelectorAll('a[href*="progressreport"]');
    anchors.forEach((a) => {
      a.removeAttribute("target");
      a.setAttribute("target", "_self");
    });
  }

  function retargetUserInputLinks(root = document) {
    const anchors = root.querySelectorAll('a[href*="user_input.html"]');
    anchors.forEach((a) => {
      a.removeAttribute("target");
      a.setAttribute("target", "_self");
      if (!a.dataset.userInputDecorated) decorateUserInputLink(a);
    });
  }

  function getFirstName(fullName) {
    if (!fullName || typeof fullName !== "string") return "";
    const trimmed = fullName.trim();
    if (!trimmed) return "";
    return trimmed.split(/\s+/)[0];
  }

  function pickUserColors(seed) {
    const palettes = [
      ["#0b60a8", "#021a2c"],
      ["#2563eb", "#0b60a8"],
      ["#0ea5e9", "#0369a1"],
      ["#22c55e", "#14532d"],
      ["#f97316", "#c2410c"]
    ];
    const key = (seed || "user").toLowerCase();
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) & 0xffffffff;
    }
    const idx = Math.abs(hash) % palettes.length;
    return palettes[idx];
  }

  function paintAvatar(el, seed, fallbackInitial = "U") {
    if (!el) return;
    const [c1, c2] = pickUserColors(seed);
    const initial = (seed && seed[0] ? seed[0] : fallbackInitial).toUpperCase();
    el.textContent = initial;
    el.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
  }

  function decorateUserInputLink(a) {
    if (!a) return;
    if (a.querySelector("[data-user-avatar]")) { a.dataset.userInputDecorated = "true"; return; }
    a.classList.add("nav-user-link");
    const label = (a.textContent || a.getAttribute("aria-label") || "User Input").trim() || "User Input";
    a.setAttribute("data-user-default", label);
    const pill = document.createElement("span");
    pill.className = "nav-user-pill";
    pill.innerHTML = `
       
      <span class="nav-user-text" data-user-text>${label}</span>
    `;
    a.setAttribute("aria-label", label);
    a.textContent = "";
    a.appendChild(pill);
    a.dataset.userInputDecorated = "true";
  }

  function refreshUserInputNavLinks() {
    const state = VP().getState();
    const firstName = getFirstName(state?.user?.name);
    const designation = (state?.user?.designation || "").trim();

    document.querySelectorAll('a[href*="user_input.html"]').forEach((a) => {
      const avatar = a.querySelector("[data-user-avatar]");
      const text = a.querySelector("[data-user-text]");

      if (text) text.textContent = firstName || (a.getAttribute("data-user-default") || "User Input");
      if (avatar) {
        if (firstName) {
          paintAvatar(avatar, firstName, "U");
        } else {
          avatar.textContent = "UI";
          avatar.style.background = "linear-gradient(135deg, #94a3b8, #475569)";
        }
      }

      if (firstName) {
        a.classList.add("nav-user-link-active");
        a.setAttribute("title", state?.user?.name || firstName);
      } else {
        a.classList.remove("nav-user-link-active");
        a.removeAttribute("title");
      }

      // optional tooltip for designation
      if (designation) a.setAttribute("data-user-designation", designation);
      else a.removeAttribute("data-user-designation");
    });
  }

  function openPrompt() {
    const el = document.getElementById("userFormPrompt");
    if (!el) return;
    el.classList.remove("hidden");
    el.classList.add("flex");
    playUserFormPromptAudio();
  }

  function closePrompt() {
    stopUserFormPromptAudio();
    const el = document.getElementById("userFormPrompt");
    if (!el) return;
    el.classList.add("hidden");
    el.classList.remove("flex");
  }

  function openUserInputModal(returnUrl) {
    const modal = document.getElementById("userInputModal");
    const iframe = document.getElementById("userInputIframe");
    if (!modal || !iframe) return;

    refreshUserInputNavLinks();

    const params = new URLSearchParams();
    if (returnUrl) params.set("return", returnUrl);

    iframe.src = `user_input.html${params.toString() ? `?${params}` : ""}`;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.classList.add("overflow-hidden");
  }

  function closeUserInputModal() {
    const modal = document.getElementById("userInputModal");
    const iframe = document.getElementById("userInputIframe");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
    if (iframe) iframe.src = "about:blank";
  }

  function disableProgressReportLinks() {
    const { needsUser, needsSim } = getProgressReportRequirements();
    const titleMessage = getProgressReportAccessAlertMessage(needsUser, needsSim);
    document.querySelectorAll('[data-progress-report-link], a[href*="progressreport"]').forEach((a) => {
      a.classList.add("opacity-50", "cursor-not-allowed");
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("title", titleMessage);
      a.style.opacity = "0.55";
      a.style.cursor = "not-allowed";
    });
  }

  function enableProgressReportLinks() {
    document.querySelectorAll('[data-progress-report-link], a[href*="progressreport"]').forEach((a) => {
      a.classList.remove("opacity-50", "cursor-not-allowed");
      a.removeAttribute("aria-disabled");
      a.removeAttribute("title");
      a.style.opacity = "";
      a.style.cursor = "";
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;

    ensureUserInputStyles();
    ensureAlertThemeCss();
    ensureModals();
    ensureAlertModal();
    retargetProgressLinks();
    retargetUserInputLinks();
    document.addEventListener("click", (event) => {
      const a = event.target.closest("a");
      if (!a) return;
      const href = (a.getAttribute("href") || "").toLowerCase();
      const isProgress =
        href.includes("progressreport") ||
        href === "#progressreport" ||
        href.endsWith("#progressreport");
      if (!isProgress) return;
      a.removeAttribute("target");
      a.setAttribute("target", "_self");
    }, true);

    // keep future anchors in same tab (handles dynamic nav insertions)
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          retargetProgressLinks(node);
          retargetUserInputLinks(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    VP().initPage();
    refreshUserInputNavLinks();

    const page = getPageName();
    const isAim = page === "aim.html";
    const returnUrl = isAim ? "aim.html#progressreport" : page;

    function syncProgressReportLinks() {
      if (canAccessProgressReport()) enableProgressReportLinks();
      else disableProgressReportLinks();
    }

    // Disable/enable report link
    syncProgressReportLinks();

    // Intercept Progress Report clicks if locked
    document.addEventListener("click", (event) => {
      const a = event.target.closest("a");
      if (!a) return;
      const href = (a.getAttribute("href") || "").toLowerCase();
      if (!isProgressReportLink(href)) return;

      if (canAccessProgressReport()) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const { needsUser, needsSim } = getProgressReportRequirements();
      showThemedAlert(getProgressReportAccessAlertMessage(needsUser, needsSim), "Instructions");
    }, true);

    // Prompt on aim (optional)
    if (isAim) {
      setTimeout(() => {
        const state = VP().getState();
        if (!VP().hasUser() && !(state.flags && state.flags.reportDeclined)) openPrompt();
      }, 700);
    }

    document.getElementById("promptYes")?.addEventListener("click", () => {
      closePrompt();
      openUserInputModal("progressreport.html");
    });

    document.getElementById("promptNo")?.addEventListener("click", () => {
      closePrompt();
      VP().declineReport();
      disableProgressReportLinks();
    });

    document.getElementById("userInputModalClose")?.addEventListener("click", closeUserInputModal);

    document.getElementById("userInputModal")?.addEventListener("click", (e) => {
      if (e.target.id === "userInputModal") closeUserInputModal();
    });

    document.addEventListener("click", (event) => {
      const a = event.target.closest("a");
      if (!a) return;
      const href = (a.getAttribute("href") || "").toLowerCase();
      if (!href.includes("user_input.html")) return;
      event.preventDefault();

      let returnUrl = a.dataset.redirectReturn || "";
      try {
        const url = new URL(href, window.location.href);
        if (!returnUrl) returnUrl = url.searchParams.get("return") || "";
      } catch {}
      if (!returnUrl) returnUrl = getPageName();

      openUserInputModal(returnUrl);
    }, true);

    // Listen for form submit + simulation report generated
    window.addEventListener("message", (event) => {
      const allowedOrigin = window.location.origin;
      const fromNullOrigin = event.origin === "null";
      if (allowedOrigin !== "null" && event.origin !== allowedOrigin && !fromNullOrigin) return;

      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === "vlab:user_input_cancel") {
        closeUserInputModal();
        refreshUserInputNavLinks();
        syncProgressReportLinks();
        return;
      }

      if (data.type === "vlab:user_input_submitted") {
        closeUserInputModal();
        refreshUserInputNavLinks();
        syncProgressReportLinks();
        const returnUrl = typeof data.returnUrl === "string" ? data.returnUrl : "";
        if (returnUrl) {
          if (isProgressReportLink(returnUrl) && !canAccessProgressReport()) {
            const { needsUser, needsSim } = getProgressReportRequirements();
            showThemedAlert(getProgressReportAccessAlertMessage(needsUser, needsSim), "Instructions");
            return;
          }
          window.location.href = returnUrl;
        }
        return;
      }

    if (data.type === "vlab:simulation_report_generated") {
        const html = typeof data.html === "string" ? data.html : "1";
        const updatedAt = (data.updatedAt || String(Date.now())).toString();
        if (!html.trim()) return;

        try {
          localStorage.setItem("vlab_exp2_simulation_report_html", html);
          localStorage.setItem("vlab_exp2_simulation_report_updated_at", updatedAt);

          const activeHash = localStorage.getItem("vlab_exp2_active_user_hash");
          if (activeHash) {
            localStorage.setItem(`vlab_exp2_user_${activeHash}_simulation_report_html`, html);
            localStorage.setItem(`vlab_exp2_user_${activeHash}_simulation_report_updated_at`, updatedAt);
          }
        } catch {}

        // window.name fallback for file://
        try {
          const PREFIX = "VLAB_EXP2::";
          let wn = {};
          if (typeof window.name === "string" && window.name.startsWith(PREFIX)) {
            wn = JSON.parse(window.name.slice(PREFIX.length)) || {};
          }
          wn["vlab_exp2_simulation_report_html"] = html;
          wn["vlab_exp2_simulation_report_updated_at"] = updatedAt;
          window.name = PREFIX + JSON.stringify(wn);
        } catch {}
        syncProgressReportLinks();
      }
    });
  }

  if (!window.VLUserInputModal) window.VLUserInputModal = {};
  window.VLUserInputModal.open = openUserInputModal;
  window.VLUserInputModal.close = closeUserInputModal;
  window.VLUserInputModal.refresh = refreshUserInputNavLinks;

  init();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
})();
