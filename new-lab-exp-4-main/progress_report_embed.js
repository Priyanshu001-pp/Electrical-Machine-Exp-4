(function () {
  let initialized = false;
  const fallbackProgress = {
    hasUser: () => false,
    declineReport: () => {},
    getState: () => ({ flags: {} }),
    initPage: () => {},
    recordPageExit: () => {},
    saveState: () => {},
    mark: () => {},
    markReportViewed: () => {}
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
  const PROGRESS_REPORT_ACCESS_ALERT_AUDIO_SRC = "#";
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

  function ensureAlertThemeCss() {
    const head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return;
    if (head.querySelector('link[href*="alert-theme.css"]')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './alert-theme.css';
    head.appendChild(link);
  }
  function getReportLabel() {
    const page = getPageName();
    return page === "simulation.html" ? "Progress Report" : "Progress Report";
  }

  function getProgressSectionTemplate(label) {
    return `
      <div class="border-l-4 border-orange-600 pl-4 mb-4 flex items-center justify-between">
        <div class="flex items-center">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center">
            ${label}
          </h2>
        </div>
        <span class="text-sm text-gray-600">Embedded view (opens within this page)</span>
      </div>
      <div class="w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner">
        <iframe
          src="progressreport.html"
          title="${label}"
          class="w-full"
          style="min-height: 900px;"
          loading="lazy"
        ></iframe>
      </div>
    `;
  }

  const modalsMarkup = `
    <div id="userFormPrompt"
         class="fixed inset-0 hidden items-center justify-center z-[99999] bg-black/60 p-4">
      <div class="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
        <h3 class="text-xl font-bold text-gray-900">Alert</h3>
        <p class="text-gray-700 mt-2">
          ${USER_FORM_PROMPT_MESSAGE}
        </p>
        <div class="mt-5 flex justify-end gap-3">
          <button id="promptNo"
                  class="px-4 py-2 rounded-lg border border-gray-300 font-semibold text-gray-700 hover:bg-gray-100">
            NO
          </button>
          <button id="promptYes"
                  class="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
            YES
          </button>
        </div>
      </div>
    </div>
    <div id="userInputModal" class="hidden fixed inset-0 z-[100000] bg-black/60 px-4 py-8 items-center justify-center">
      <div class="relative w-full max-w-4xl h-[85vh] bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-200">
        <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 class="text-lg font-semibold text-slate-900">User Input Form</h3>
          <button id="userInputModalClose" type="button" class="text-slate-600 hover:text-slate-900 rounded-full focus:outline-none">
            <span aria-hidden="true" class="text-2xl leading-none">&times;</span>
            <span class="sr-only">Close</span>
          </button>
        </div>
        <iframe id="userInputIframe" class="w-full h-full border-0" src="" title="User Input Form"></iframe>
      </div>
    </div>
    <div id="aimAlertModal" class="modal" role="alertdialog" aria-modal="true" aria-labelledby="aimAlertTitle" aria-describedby="aimAlertMessage">
      <div class="modal-box" role="document">
        <h2 id="aimAlertTitle">Alert</h2>
        <p id="aimAlertMessage"></p>
        <button type="button" class="modal-close-btn" data-aim-alert-close>OK</button>
      </div>
    </div>
  `;

  function getProgressNavTemplate(label) {
    return `
      <svg class="progress-nav-icon w-5 h-5 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
      </svg>
      ${label}
    `;
  }

  function ensureProgressNoHoverStyles() {
    const styleId = 'progress-report-no-hover-style';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .menu-item[data-progress-report-link]:hover,
      .menu-item[data-progress-report-link]:focus {
        border-left-color: transparent !important;
        background: rgba(255, 255, 255, 0.6) !important;
        transform: none !important;
        box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.6) !important;
      }

      .menu-item[data-progress-report-link]:hover::after,
      .menu-item[data-progress-report-link]:focus::after {
        opacity: 0 !important;
        transform: translateX(-100%) !important;
      }

      .menu-item[data-progress-report-link] .progress-nav-icon {
        opacity: 0.7 !important;
      }

      .top-nav .nav-link[data-progress-report-link]:hover,
      .top-nav .nav-link[data-progress-report-link]:focus {
        color: #e2e8f0 !important;
        transform: none !important;
        background: transparent !important;
      }

      .top-nav .nav-link[data-progress-report-link]:hover::after,
      .top-nav .nav-link[data-progress-report-link]:focus::after {
        transform: scaleX(0) !important;
      }
    `;

    const head = document.head || document.getElementsByTagName('head')[0];
    if (head) head.appendChild(style);
  }

  function getPageName() {
    const segments = window.location.pathname.split('/');
    const lastSegment = segments.pop() || '';
    return lastSegment || 'index.html';
  }

  function hasEmbeddedProgressSection() {
    return !!document.getElementById('progressreport');
  }

  // Determine if this page already embeds the progress report inline.
  function shouldEmbedProgress() {
    return hasEmbeddedProgressSection();
  }

  function showEmbeddedProgressSection() {
    const progressSection = document.getElementById('progressreport');
    if (!progressSection) return false;

    const sections = Array.from(document.querySelectorAll('.section-content'));
    if (sections.length) {
      sections.forEach((section) => {
        if (section === progressSection) {
          section.classList.remove('hidden');
        } else {
          section.classList.add('hidden');
        }
      });
    } else {
      progressSection.classList.remove('hidden');
    }

    try {
      progressSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      progressSection.scrollIntoView();
    }
    return true;
  }

  function getProgressHrefTarget() {
    return shouldEmbedProgress() ? '#progressreport' : 'progressreport.html';
  }

  function ensureProgressSection(main) {
    // Embedding is disabled.
    return;
  }

  function ensureProgressNav(isAimPage) {
    const navContainer = document.querySelector('#sidebar nav, .vl-sidebar nav');
    if (!navContainer) return null;
    let anchor = document.getElementById('progressReportNav');
    const label = getReportLabel();
    if (!anchor) {
      anchor = navContainer.querySelector('[data-progress-report-link]') ||
               navContainer.querySelector('a[href*="progressreport"]');
    }

    if (anchor) {
      if (!anchor.id) anchor.id = 'progressReportNav';
      anchor.href = getProgressHrefTarget();
      anchor.setAttribute('data-progress-report-link', '');
      anchor.classList.remove('group');
      anchor.removeAttribute('target');
      anchor.setAttribute('target', '_self');
      anchor.setAttribute('rel', 'noopener');
      anchor.innerHTML = getProgressNavTemplate(label);
      return anchor;
    }

    anchor = document.createElement('a');
    anchor.id = 'progressReportNav';
    anchor.href = getProgressHrefTarget();
    anchor.setAttribute('target', '_self');
    anchor.setAttribute('rel', 'noopener');
    anchor.className = 'menu-item flex items-center px-4 py-3 text-gray-700 rounded-lg';
    anchor.setAttribute('data-progress-report-link', '');
    anchor.innerHTML = getProgressNavTemplate(label);
    navContainer.appendChild(anchor);
    return anchor;
  }

  function ensureModals() {
    if (document.getElementById('userFormPrompt')) return;
    document.body.insertAdjacentHTML('beforeend', modalsMarkup);
  }

  function retargetProgressLinks(root = document) {
    const links = root.querySelectorAll('a[href*="progressreport"]');
    links.forEach((link) => {
      link.removeAttribute('target');
      link.setAttribute('target', '_self');
      link.setAttribute('rel', 'noopener');
    });
  }

  function markHeaderProgressLinks(isAimPage) {
    const headerLinks = Array.from(document.querySelectorAll('.top-nav .nav-link'));
    const progressTarget = getProgressHrefTarget();
    headerLinks.forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href.includes('progressreport')) {
        link.setAttribute('data-progress-report-link', '');
        link.href = progressTarget;
        // Always stay in the same tab/window for the progress report
        link.setAttribute('target', '_self');
      }
    });
  }

  function forceSameTabProgressLinks() {
    retargetProgressLinks();
    // keep any future links in same tab (covers nav injected after script load)
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          retargetProgressLinks(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // hard enforce same-tab navigation on click (safety net) without blocking other handlers
    document.addEventListener('click', (event) => {
      const anchor = event.target.closest('a');
      if (!anchor) return;
      const href = (anchor.getAttribute('href') || '').toLowerCase();
      const isProgress =
        href.includes('progressreport') ||
        href === '#progressreport' ||
        href.endsWith('#progressreport');
      if (!isProgress) return;
      try {
        anchor.removeAttribute('target');
        anchor.setAttribute('target', '_self');
      } catch {}
      // let existing listeners (alerts, modals) run normally
    }, true);
  }

  function setActiveMenu() {
    const page = getPageName();
    const hash = window.location.hash;
    const links = Array.from(document.querySelectorAll('.menu-item'));
    links.forEach((link) => link.classList.remove('active'));

    let activeLink = null;
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const [targetPage, targetHash] = href.split('#');
      if (hash === '#progressreport' && targetHash === 'progressreport') {
        activeLink = link;
        break;
      }
      if (!targetHash && targetPage && targetPage === page) {
        activeLink = link;
      }
    }

    if (activeLink) activeLink.classList.add('active');
  }

  function init() {
    if (initialized) return;
    initialized = true;
    const hasSharedModal = typeof window.openSharedUserInputModal === 'function';

    ensureAlertThemeCss();
    ensureProgressNoHoverStyles();
    forceSameTabProgressLinks();

    const pageName = getPageName();
    const isAimPage = pageName === 'aim.html';
    const main = document.querySelector('main');
    ensureModals();
    // embedding disabled
    ensureProgressNav(isAimPage);
    markHeaderProgressLinks(isAimPage);
    setActiveMenu();

    VP().initPage();

    const inlineProgress = shouldEmbedProgress();
    const progressReturnUrl = inlineProgress ? `${pageName}#progressreport` : 'progressreport.html';

    const userFormPrompt = document.getElementById('userFormPrompt');
    const promptYes = document.getElementById('promptYes');
    const promptNo = document.getElementById('promptNo');
    const userInputModal = document.getElementById('userInputModal');
    const userInputIframe = document.getElementById('userInputIframe');
    const userInputModalClose = document.getElementById('userInputModalClose');
    const aimAlertModal = document.getElementById('aimAlertModal');
    const aimAlertTitle = document.getElementById('aimAlertTitle');
    const aimAlertMessage = document.getElementById('aimAlertMessage');
    const aimAlertClose = aimAlertModal?.querySelector('[data-aim-alert-close]');

    function openPrompt() {
      if (!userFormPrompt) return;
      userFormPrompt.classList.remove('hidden');
      userFormPrompt.classList.add('flex');
      playUserFormPromptAudio();
    }

    function closePrompt() {
      stopUserFormPromptAudio();
      if (!userFormPrompt) return;
      userFormPrompt.classList.add('hidden');
      userFormPrompt.classList.remove('flex');
    }

    function openUserInputModal(returnUrl = pageName) {
      if (hasSharedModal) {
        window.openSharedUserInputModal(returnUrl);
        return;
      }
      if (!userInputModal || !userInputIframe) return;
      const params = new URLSearchParams();
      if (returnUrl) params.set('return', returnUrl);
      userInputIframe.src = `user_input.html${params.toString() ? `?${params}` : ''}`;
      userInputModal.classList.remove('hidden');
      userInputModal.classList.add('flex');
      document.body.classList.add('overflow-hidden');
    }

    function closeUserInputModal() {
      if (!userInputModal) return;
      userInputModal.classList.add('hidden');
      userInputModal.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
      if (userInputIframe) userInputIframe.src = 'about:blank';
    }

    let aimAlertOnClose = null;

    function showAimAlert(message, title = 'Notice', onClose = null) {
      if (!aimAlertModal) {
        alert(message);
        if (typeof onClose === 'function') onClose();
        return;
      }
      if (aimAlertTitle) aimAlertTitle.textContent = title;
      if (aimAlertMessage) aimAlertMessage.textContent = message;
      aimAlertOnClose = typeof onClose === 'function' ? onClose : null;
      aimAlertModal.classList.add('show');
      document.body.classList.add('is-modal-open');
      aimAlertClose?.focus();
      playProgressReportAccessAlertAudio(message);
    }

    function closeAimAlert() {
      stopProgressReportAccessAlertAudio();
      if (!aimAlertModal) return;
      aimAlertModal.classList.remove('show');
      document.body.classList.remove('is-modal-open');
      if (aimAlertOnClose) {
        const callback = aimAlertOnClose;
        aimAlertOnClose = null;
        callback();
      }
    }

    if (aimAlertClose) {
      aimAlertClose.addEventListener('click', closeAimAlert);
    }

    aimAlertModal?.addEventListener('click', (event) => {
      if (event.target === aimAlertModal) closeAimAlert();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && aimAlertModal?.classList.contains('show')) {
        closeAimAlert();
      }
    });

    if (userInputModalClose) {
      userInputModalClose.addEventListener('click', closeUserInputModal);
    }

    if (userInputModal) {
      userInputModal.addEventListener('click', (event) => {
        if (event.target === userInputModal) {
          closeUserInputModal();
        }
      });
    }

    const userInputLinks = Array.from(document.querySelectorAll('[data-user-input-link]'));
    const userInputDefaultLabels = new WeakMap();

    function getFirstNameFrom(fullName) {
      if (!fullName || typeof fullName !== 'string') return '';
      const trimmed = fullName.trim();
      if (!trimmed) return '';
      return trimmed.split(/\s+/)[0];
    }

    function getDefaultUserInputLabel(link) {
      if (userInputDefaultLabels.has(link)) {
        return userInputDefaultLabels.get(link);
      }
      const label = (link.textContent || '').trim() || 'User Input';
      userInputDefaultLabels.set(link, label);
      return label;
    }

    function refreshUserInputLinkLabels() {
      const state = VP().getState();
      const firstName = getFirstNameFrom(state.user?.name);
      userInputLinks.forEach((link) => {
        const label = firstName ? firstName : getDefaultUserInputLabel(link);
        link.textContent = label;
        if (firstName && state.user?.name) {
          link.setAttribute('title', state.user.name);
        } else {
          link.removeAttribute('title');
        }
      });
    }
    if (!hasSharedModal) {
      userInputLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
          if (VP().hasUser()) return; // allow normal behavior when details already filled
          event.preventDefault();
          event.stopPropagation();
          const targetReturn = link.dataset.redirectReturn || pageName;
          openUserInputModal(targetReturn);
        });
      });
    }

    refreshUserInputLinkLabels();

    const progressReportLinks = Array.from(document.querySelectorAll('[data-progress-report-link]'));

    function disableProgressReportUI() {
      const { needsUser, needsSim } = getProgressReportRequirements();
      const titleMessage = getProgressReportAccessAlertMessage(needsUser, needsSim);
      progressReportLinks.forEach((link) => {
        link.classList.add('opacity-50', 'cursor-not-allowed');
        link.setAttribute('aria-disabled', 'true');
        link.setAttribute('title', titleMessage);
        // Fallback if Tailwind classes are unavailable (offline).
        link.style.opacity = '0.55';
        link.style.cursor = 'not-allowed';
      });
    }

    function enableProgressReportUI() {
      progressReportLinks.forEach((link) => {
        link.classList.remove('opacity-50', 'cursor-not-allowed');
        link.removeAttribute('aria-disabled');
        link.removeAttribute('title');
        link.style.opacity = '';
        link.style.cursor = '';
      });
    }

    function syncProgressReportUI() {
      if (canAccessProgressReport()) {
        enableProgressReportUI();
      } else {
        disableProgressReportUI();
      }
    }
    syncProgressReportUI();

    function showProgressReportLockedAlert() {
      const { needsUser, needsSim } = getProgressReportRequirements();
      const message = getProgressReportAccessAlertMessage(needsUser, needsSim);
      showAimAlert(message, 'Instructions');
    }

    const handleProgressLinkClick = (event) => {
      const embedded = shouldEmbedProgress();
      if (canAccessProgressReport()) {
        syncProgressReportUI();
        if (embedded) {
          event.preventDefault();
          event.stopImmediatePropagation();
          showEmbeddedProgressSection();
          try { history.replaceState({}, '', '#progressreport'); } catch {}
        }
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();

      showProgressReportLockedAlert();
    };

    if (promptYes) {
      promptYes.addEventListener('click', () => {
        closePrompt();
        openUserInputModal(progressReturnUrl);
      });
    }

    if (promptNo) {
      promptNo.addEventListener('click', () => {
        closePrompt();
        VP().declineReport();
        disableProgressReportUI();
      });
    }

    progressReportLinks.forEach((link) => {
      link.addEventListener('click', handleProgressLinkClick, true);
    });

    // Delegated guard in case any link was missed
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a');
      if (!target) return;
      const rawHref = target.getAttribute('href') || '';
      const href = rawHref.toLowerCase();
      const isProgressLink =
        target.hasAttribute('data-progress-report-link') || isProgressReportLink(href);
      if (!isProgressLink) return;

      if (!canAccessProgressReport()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showProgressReportLockedAlert();
        return;
      }

      const wantsEmbedded = shouldEmbedProgress() && (href.startsWith('#') || href.endsWith('#progressreport'));
      if (wantsEmbedded) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showEmbeddedProgressSection();
        try { history.replaceState({}, '', '#progressreport'); } catch {}
        return;
      }

      const isExternalProgressPage = !href.startsWith('#') || href.includes('.html');
      if (isExternalProgressPage) {
        event.preventDefault();
        window.location.href = target.href;
      }
    }, true);

    if (shouldEmbedProgress()) {
      if (window.location.hash === '#progressreport') {
        if (canAccessProgressReport()) {
          showEmbeddedProgressSection();
        } else {
          showProgressReportLockedAlert();
        }
      }

      window.addEventListener('hashchange', () => {
        if (window.location.hash === '#progressreport') {
          if (canAccessProgressReport()) {
            showEmbeddedProgressSection();
          } else {
            showProgressReportLockedAlert();
          }
        }
      });
    }

    if (isAimPage) {
      window.addEventListener('hashchange', setActiveMenu);
      if (window.location.hash === '#progressreport' && !canAccessProgressReport()) {
        showProgressReportLockedAlert();
      }
    }

    window.maybePromptUserForm = function maybePromptUserForm() {
      const state = VP().getState();
      if (VP().hasUser()) return;
      if (state.flags && state.flags.reportDeclined) return;
      const sessionKey = 'vlab_exp2_prompted_once';
      try {
        if (sessionStorage.getItem(sessionKey) === '1') return;
        sessionStorage.setItem(sessionKey, '1');
      } catch (error) {
        // ignore storage failures
      }
      openPrompt();
    };

    window.addEventListener('message', (event) => {
      const allowedOrigin = window.location.origin;
      if (allowedOrigin !== "null" && event.origin !== allowedOrigin) return;
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === 'vlab:simulation_report_generated') {
        const html = typeof data.html === 'string' ? data.html : '';
        const updatedAt = (data.updatedAt || String(Date.now())).toString();
        if (html && html.trim()) {
          try {
            localStorage.setItem('vlab_exp2_simulation_report_html', html);
            localStorage.setItem('vlab_exp2_simulation_report_updated_at', updatedAt);
            const activeHash = localStorage.getItem('vlab_exp2_active_user_hash');
            if (activeHash) {
              localStorage.setItem(`vlab_exp2_user_${activeHash}_simulation_report_html`, html);
              localStorage.setItem(`vlab_exp2_user_${activeHash}_simulation_report_updated_at`, updatedAt);
            }
          } catch (e) {}

          // Also persist in window.name (helps file:// navigation in the same tab).
          try {
            const PREFIX = 'VLAB_EXP2::';
            if (html.length <= 1500000) { // ~1.5MB safety guard
              let wn = {};
              if (typeof window.name === 'string' && window.name.startsWith(PREFIX)) {
                wn = JSON.parse(window.name.slice(PREFIX.length)) || {};
              }
              wn['vlab_exp2_simulation_report_html'] = html;
              wn['vlab_exp2_simulation_report_updated_at'] = updatedAt;
              window.name = PREFIX + JSON.stringify(wn);
            }
          } catch (e) {}

          const iframe = document.querySelector('iframe[title="Progress Report"]');
          if (iframe) {
            try {
              iframe.contentWindow?.postMessage({ type: 'vlab:simulation_report_generated' }, '*');
            } catch (e) {
              iframe.src = iframe.src;
            }
          }
        }
        syncProgressReportUI();
        return;
      }

      if (data.type === 'vlab:user_input_cancel') {
        closeUserInputModal();
        syncProgressReportUI();
        return;
      }

      if (data.type === 'vlab:user_input_submitted') {
        closeUserInputModal();
        refreshUserInputLinkLabels();
        syncProgressReportUI();
        const returnUrl = typeof data.returnUrl === 'string' ? data.returnUrl : '';
        if (returnUrl) {
          if (isProgressReportLink(returnUrl) && !canAccessProgressReport()) {
            showProgressReportLockedAlert();
            return;
          }
          window.location.href = returnUrl;
        }
        return;
      }
    });

  }

  // Run ASAP (script is included at the end of pages), but keep a DOMContentLoaded
  // fallback for safety if a page ever moves this script into <head>.
  init();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  }
})();

