/* ==========================================================================
   ADSPULSE ANALYTICS - APPLICATION STATE MACHINE (ENTRYPOINT)
   ========================================================================== */

import { initFacebookSDK, loginWithFacebook, logoutFacebook, checkLoginStatus } from './fb-sdk.js';
import { fetchUserProfile, fetchBusinessPortfolios, fetchAdAccounts, fetchAccountDailyInsights, fetchCampaignsWithInsights, fetchAdSetsWithInsights, fetchPlacementsWithInsights } from './meta-api.js';
import { updateDashboardUI, exportCurrentReportCSV, bindTableSorters } from './dashboard.js';
import { mockBusinessPortfolios, mockAdAccounts, getMockAccountInsights, getMockCampaigns, getMockAdSets, getMockPlacements } from './mock-data.js';

// --- System Application Constant App ID ---
const SYSTEM_FB_APP_ID = '36377800718500903';

// --- Application Core State ---
const state = {
  appId: localStorage.getItem('meta_ads_app_id') || '',
  accessToken: localStorage.getItem('meta_ads_access_token') || '',
  activeBusinessId: localStorage.getItem('meta_ads_active_business_id') || 'all',
  activeAdAccountId: localStorage.getItem('meta_ads_active_ad_account_id') || '',
  activeAdAccountName: '',
  activeDatePreset: 'last_30d',
  activeTab: 'overview',
  activeDataset: null, // Cached analytics payload
  adAccounts: [], // List of available ad accounts
  businessPortfolios: [], // List of Business Manager Portfolios
  activeHelpStep: 0 // Wizard active page index
};

// --- DOM Cache Elements ---
const DOM = {
  sidebar: document.getElementById('sidebar'),
  navItems: document.querySelectorAll('.sidebar-nav li'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  pageTitle: document.getElementById('page-title'),
  pageSubtitle: document.getElementById('page-subtitle'),
  
  // Selectors
  businessPortfolioSelect: document.getElementById('business-portfolio-select'),
  adAccountSelect: document.getElementById('ad-account-select'),
  dateRangeSelect: document.getElementById('date-range-select'),
  
  // Login Gate & App Wrapper
  loginGate: document.getElementById('login-gate'),
  appContainer: document.querySelector('.app-container'),
  btnGateFbLogin: document.getElementById('btn-gate-fb-login'),
  loginBrand: document.querySelector('.login-brand'),
  developerPanel: document.getElementById('developer-panel'),
  gateFbAppIdInput: document.getElementById('gate-fb-app-id'),
  
  // Help Modal Selectors
  helpModal: document.getElementById('help-modal'),
  btnOpenHelp: document.getElementById('btn-open-help'),
  btnPrevHelp: document.getElementById('btn-prev-help'),
  btnNextHelp: document.getElementById('btn-next-help'),
  btnFinishHelp: document.getElementById('btn-finish-help'),
  btnCloseHelp: document.getElementById('btn-close-help'),
  helpSteps: document.querySelectorAll('.help-step'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  stepIndicator: document.getElementById('step-indicator'),
  helpRedirectUri: document.getElementById('help-redirect-uri'),
  btnCopyRedirect: document.getElementById('btn-copy-redirect'),
  
  // Settings Live Inputs
  btnFbLogin: document.getElementById('btn-fb-login'),
  btnFbLogout: document.getElementById('btn-fb-logout'),
  authStatusContainer: document.getElementById('auth-status-container'),
  authStatusIcon: document.querySelector('.auth-status-icon'),
  authStatusTitle: document.getElementById('auth-status-title'),
  authStatusDesc: document.getElementById('auth-status-desc'),
  
  // Global Actions
  btnExportCsv: document.getElementById('btn-export-csv'),
  btnRefresh: document.getElementById('btn-refresh'),
  globalLoading: document.getElementById('global-loading'),
  globalLoadingTxt: document.getElementById('global-loading-txt'),
  
  // User Profile
  userAvatar: document.getElementById('user-avatar'),
  userName: document.getElementById('user-name'),
  userStatus: document.getElementById('user-status'),
  
  // Advanced Table Filters
  campaignSearch: document.getElementById('campaign-search'),
  campaignStatusFilter: document.getElementById('campaign-status-filter'),
  adsetSearch: document.getElementById('adset-search')
};

// --- State Transitions & Loading Helpers ---

function setLoading(active, text = "Loading reports...") {
  if (DOM.globalLoadingTxt) DOM.globalLoadingTxt.innerText = text;
  if (active) {
    DOM.globalLoading.classList.add('active');
  } else {
    DOM.globalLoading.classList.remove('active');
  }
}



/**
 * Changes active tab view panel
 */
function switchTab(tabId) {
  state.activeTab = tabId;

  // Sync Sidebar active states
  DOM.navItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Sync Content panels
  DOM.tabPanels.forEach(panel => {
    if (panel.id === `panel-${tabId}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // Update Page Title Headers
  switch (tabId) {
    case 'overview':
      DOM.pageTitle.innerText = "Performance Overview";
      DOM.pageSubtitle.innerText = "Real-time summary analytics and conversion timelines.";
      break;
    case 'campaigns':
      DOM.pageTitle.innerText = "Campaign Performance";
      DOM.pageSubtitle.innerText = "Interactive report table tracking specific delivery, costs, and conversions.";
      break;
    case 'adsets':
      DOM.pageTitle.innerText = "Ad Sets Delivery";
      DOM.pageSubtitle.innerText = "Granular audience splits and bid strategies.";
      break;
    case 'settings':
      DOM.pageTitle.innerText = "System Configuration";
      DOM.pageSubtitle.innerText = "Setup your Developer App Credentials to sync live accounts.";
      break;
  }
}

// --- Data Fetching Operations ---

/**
 * Master Data Loader. Dispatches to Mock or Live API client depending on active state mode.
 */
async function loadMetricsData(forceFetch = false) {
  setLoading(true, "Gathering active accounts...");
  
  try {
    if (!state.accessToken) {
      throw new Error("No active Facebook login session. Please authenticate first.");
    }

    const isDemoMode = (state.accessToken === 'demo_mode_token');

    // 1. Fetch live portfolios and ad accounts if not cached or force requested
    if (state.businessPortfolios.length === 0 || forceFetch) {
      setLoading(true, "Fetching Business Portfolios...");
      if (isDemoMode) {
        state.businessPortfolios = mockBusinessPortfolios;
      } else {
        state.businessPortfolios = await fetchBusinessPortfolios(state.accessToken);
      }
      populateBusinessPortfolioDropdown();
    }

    if (state.adAccounts.length === 0 || forceFetch) {
      setLoading(true, "Fetching authorized Meta Ad Accounts...");
      if (isDemoMode) {
        state.adAccounts = mockAdAccounts.filter(acc =>
          state.activeBusinessId === 'all' || acc.businessId === state.activeBusinessId
        ).map(acc => ({
          id: acc.id,
          name: acc.name,
          accountId: acc.id.replace('act_', ''),
          currency: acc.currency,
          timezone: acc.timezone,
          status: acc.status
        }));
      } else {
        state.adAccounts = await fetchAdAccounts(state.accessToken, state.activeBusinessId);
      }
      populateAdAccountDropdown();
    }

    if (state.adAccounts.length === 0) {
      throw new Error("No active ad accounts found under the selected Portfolio.");
    }

    // Check active selection validation
    if (!state.activeAdAccountId || !state.adAccounts.find(acc => acc.id === state.activeAdAccountId)) {
      state.activeAdAccountId = state.adAccounts[0].id;
      DOM.adAccountSelect.value = state.activeAdAccountId;
    }

    const activeAcc = state.adAccounts.find(acc => acc.id === state.activeAdAccountId);
    state.activeAdAccountName = activeAcc.name;
    const currency = activeAcc.currency;

    // 2. Fetch parallel insights, campaigns, adsets, and placements from Graph API
    setLoading(true, `Syncing Insights for ${activeAcc.name}...`);
    
    let dailyInsights, campaigns, adsets, placements;
    if (isDemoMode) {
      dailyInsights = getMockAccountInsights(state.activeAdAccountId, state.activeDatePreset);
      campaigns = getMockCampaigns(state.activeAdAccountId, state.activeDatePreset);
      adsets = getMockAdSets(state.activeAdAccountId, state.activeDatePreset);
      placements = getMockPlacements(state.activeAdAccountId, state.activeDatePreset);
    } else {
      [dailyInsights, campaigns, adsets, placements] = await Promise.all([
        fetchAccountDailyInsights(state.activeAdAccountId, state.activeDatePreset, state.accessToken),
        fetchCampaignsWithInsights(state.activeAdAccountId, state.activeDatePreset, state.accessToken),
        fetchAdSetsWithInsights(state.activeAdAccountId, state.activeDatePreset, state.accessToken),
        fetchPlacementsWithInsights(state.activeAdAccountId, state.activeDatePreset, state.accessToken)
      ]);
    }

    // Cache dataset state
    state.activeDataset = {
      dailyInsights,
      campaigns,
      adsets,
      placements,
      currency,
      adAccountName: state.activeAdAccountName,
      datePreset: state.activeDatePreset
    };

    // Set user profile in Sidebar
    if (isDemoMode) {
      DOM.userAvatar.innerText = "D";
      DOM.userAvatar.style.backgroundImage = 'none';
      DOM.userName.innerText = "Demo Workspace";
      DOM.userStatus.innerText = "Demo Data Active";
    } else {
      try {
        const user = await fetchUserProfile(state.accessToken);
        DOM.userAvatar.innerText = user.name.charAt(0).toUpperCase();
        DOM.userAvatar.style.backgroundImage = user.avatar ? `url(${user.avatar})` : 'none';
        DOM.userAvatar.style.backgroundSize = 'cover';
        DOM.userName.innerText = user.name;
        DOM.userStatus.innerText = "Syncing Live Meta API";
      } catch (err) {
        console.warn("Failed to fetch user metadata, using defaults:", err);
      }
    }

    // Trigger dashboard updates
    triggerDashboardRefresh();

  } catch (error) {
    console.error("Dashboard synchronization error:", error);
    alert(`Sync Failed: ${error.message}`);
  } finally {
    setLoading(false);
  }
}

/**
 * Updates dropdown lists with loaded Accounts
 */
function populateAdAccountDropdown() {
  DOM.adAccountSelect.innerHTML = "";
  state.adAccounts.forEach(acc => {
    const opt = document.createElement("option");
    opt.value = acc.id;
    opt.innerText = `${acc.name} (${acc.currency})`;
    DOM.adAccountSelect.appendChild(opt);
  });
  
  if (state.activeAdAccountId) {
    DOM.adAccountSelect.value = state.activeAdAccountId;
  }
}

function populateBusinessPortfolioDropdown() {
  if (!DOM.businessPortfolioSelect) return;
  DOM.businessPortfolioSelect.innerHTML = "";

  // Base Option for personal profiles or all manager entities
  const baseOpt = document.createElement("option");
  baseOpt.value = "all";
  baseOpt.innerText = "All / Personal Accounts";
  DOM.businessPortfolioSelect.appendChild(baseOpt);

  state.businessPortfolios.forEach(biz => {
    const opt = document.createElement("option");
    opt.value = biz.id;
    opt.innerText = biz.name;
    DOM.businessPortfolioSelect.appendChild(opt);
  });

  if (state.activeBusinessId) {
    DOM.businessPortfolioSelect.value = state.activeBusinessId;
  }
}

/**
 * Safely passes cached datasets to rendering coordinators
 */
function triggerDashboardRefresh() {
  if (state.activeDataset) {
    updateDashboardUI(state.activeDataset);
  }
}

// --- Live Meta API Authentication Process ---

async function handleFBLogin() {
  setLoading(true, "Connecting Facebook SDK...");
  
  try {
    const activeAppId = state.appId.trim() || SYSTEM_FB_APP_ID;

    // 1. Initialize SDK
    await initFacebookSDK(activeAppId);

    // 2. Perform Login Flow
    setLoading(true, "Launching Meta Auth window...");
    const auth = await loginWithFacebook();
    
    state.accessToken = auth.accessToken;
    localStorage.setItem('meta_ads_access_token', auth.accessToken);

    // 3. Update Auth session state container
    DOM.authStatusContainer.innerHTML = `
      <div class="auth-status-icon logged-in">
        <i data-lucide="user-check"></i>
      </div>
      <div class="auth-status-details">
        <span class="auth-status-title" style="color:var(--color-emerald)">Connected Session</span>
        <span class="auth-status-description">Token active. Ready to sync campaigns.</span>
      </div>
    `;
    
    DOM.btnFbLogin.classList.add('hidden');
    DOM.btnFbLogout.classList.remove('hidden');

    if (window.lucide) window.lucide.createIcons();

    // Hide login gate, reveal app container
    if (DOM.loginGate) DOM.loginGate.classList.add('hidden');
    if (DOM.appContainer) DOM.appContainer.classList.remove('hidden');
    
    // Switch to overview dashboard automatically
    switchTab('overview');
    
    await loadMetricsData(true);

  } catch (error) {
    console.warn("Meta Auth failed, falling back to Demo Mode:", error);
    alert(`Meta Auth Connection Interrupted (${error.message}). Auto-creating Demo Workspace to continue...`);
    
    state.accessToken = 'demo_mode_token';
    localStorage.setItem('meta_ads_access_token', 'demo_mode_token');

    DOM.authStatusContainer.innerHTML = `
      <div class="auth-status-icon logged-in" style="background-color:rgba(16,185,129,0.1)">
        <i data-lucide="user-check" style="color:var(--color-emerald)"></i>
      </div>
      <div class="auth-status-details">
        <span class="auth-status-title" style="color:var(--color-emerald)">Demo Session Active</span>
        <span class="auth-status-description">Simulated connection loaded.</span>
      </div>
    `;
    
    DOM.btnFbLogin.classList.add('hidden');
    DOM.btnFbLogout.classList.remove('hidden');

    if (window.lucide) window.lucide.createIcons();

    // Hide login gate, reveal app container
    if (DOM.loginGate) DOM.loginGate.classList.add('hidden');
    if (DOM.appContainer) DOM.appContainer.classList.remove('hidden');
    
    // Switch to overview dashboard automatically
    switchTab('overview');
    
    await loadMetricsData(true);
  } finally {
    setLoading(false);
  }
}

async function handleFBLogout() {
  setLoading(true, "Ending secure session...");
  try {
    await logoutFacebook();
  } catch (err) {
    console.warn("FB SDK session end warning:", err);
  }

  // Clear credentials
  state.accessToken = '';
  localStorage.removeItem('meta_ads_access_token');
  
  DOM.authStatusContainer.innerHTML = `
    <div class="auth-status-icon logged-out">
      <i data-lucide="user-x"></i>
    </div>
    <div class="auth-status-details">
      <span class="auth-status-title">Disconnected</span>
      <span class="auth-status-description">Provide your App ID and log in to establish a session.</span>
    </div>
  `;
  DOM.btnFbLogin.classList.remove('hidden');
  DOM.btnFbLogout.classList.add('hidden');
  
  if (window.lucide) window.lucide.createIcons();

  // Show login gate, hide app container
  if (DOM.loginGate) DOM.loginGate.classList.remove('hidden');
  if (DOM.appContainer) DOM.appContainer.classList.add('hidden');
  
  setLoading(false);
}

// --- Help Wizard Modal Functions ---

function updateWizardUI() {
  const step = state.activeHelpStep;
  
  // Update visibility of steps
  DOM.helpSteps.forEach((element, index) => {
    if (index === step) {
      element.classList.remove('hidden');
    } else {
      element.classList.add('hidden');
    }
  });

  // Update progress bar
  const progressPercent = ((step + 1) / DOM.helpSteps.length) * 100;
  if (DOM.progressBarFill) DOM.progressBarFill.style.width = `${progressPercent}%`;
  
  // Update step label indicator
  if (DOM.stepIndicator) DOM.stepIndicator.innerText = `Step ${step + 1} of ${DOM.helpSteps.length}`;

  // Update navigation button states
  if (DOM.btnPrevHelp) DOM.btnPrevHelp.disabled = (step === 0);
  
  if (step === DOM.helpSteps.length - 1) {
    if (DOM.btnNextHelp) DOM.btnNextHelp.classList.add('hidden');
    if (DOM.btnFinishHelp) DOM.btnFinishHelp.classList.remove('hidden');
  } else {
    if (DOM.btnNextHelp) DOM.btnNextHelp.classList.remove('hidden');
    if (DOM.btnFinishHelp) DOM.btnFinishHelp.classList.add('hidden');
  }
}

// --- Application Core Events Setup ---

function bindEvents() {
  
  // 1. Sidebar tab switching
  DOM.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // 2. Credentials triggers
  if (DOM.btnGateFbLogin) {
    DOM.btnGateFbLogin.addEventListener('click', handleFBLogin);
  }
  if (DOM.btnFbLogin) {
    DOM.btnFbLogin.addEventListener('click', handleFBLogin);
  }
  if (DOM.btnFbLogout) {
    DOM.btnFbLogout.addEventListener('click', handleFBLogout);
  }

  // 3. Custom App ID inputs listeners
  if (DOM.gateFbAppIdInput) {
    DOM.gateFbAppIdInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      state.appId = val;
      localStorage.setItem('meta_ads_app_id', val);
    });
  }

  // 4. Secret Developer Panel Toggle (Double Click Logo)
  if (DOM.loginBrand) {
    DOM.loginBrand.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (DOM.developerPanel) {
        DOM.developerPanel.classList.toggle('hidden');
      }
    });
  }

  // 5. Setup Walkthrough Wizard Actions
  if (DOM.btnOpenHelp) {
    DOM.btnOpenHelp.addEventListener('click', () => {
      state.activeHelpStep = 0;
      updateWizardUI();
      if (DOM.helpRedirectUri) {
        DOM.helpRedirectUri.innerText = window.location.origin;
      }
      if (DOM.helpModal) DOM.helpModal.classList.remove('hidden');
    });
  }

  if (DOM.btnPrevHelp) {
    DOM.btnPrevHelp.addEventListener('click', () => {
      if (state.activeHelpStep > 0) {
        state.activeHelpStep--;
        updateWizardUI();
      }
    });
  }

  if (DOM.btnNextHelp) {
    DOM.btnNextHelp.addEventListener('click', () => {
      if (state.activeHelpStep < DOM.helpSteps.length - 1) {
        state.activeHelpStep++;
        updateWizardUI();
      }
    });
  }

  const closeWizard = () => {
    if (DOM.helpModal) DOM.helpModal.classList.add('hidden');
  };

  if (DOM.btnCloseHelp) DOM.btnCloseHelp.addEventListener('click', closeWizard);
  if (DOM.btnFinishHelp) DOM.btnFinishHelp.addEventListener('click', closeWizard);

  // Copy Redirect URI Clipboard Action
  if (DOM.btnCopyRedirect) {
    DOM.btnCopyRedirect.addEventListener('click', async () => {
      const uri = window.location.origin;
      try {
        await navigator.clipboard.writeText(uri);
        const span = DOM.btnCopyRedirect.querySelector('span');
        const icon = DOM.btnCopyRedirect.querySelector('i');
        
        if (span) span.innerText = "Copied!";
        if (icon) icon.setAttribute('data-lucide', 'check');
        if (window.lucide) window.lucide.createIcons();

        setTimeout(() => {
          if (span) span.innerText = "Copy URL";
          if (icon) icon.setAttribute('data-lucide', 'copy');
          if (window.lucide) window.lucide.createIcons();
        }, 2000);
      } catch (err) {
        console.error("Failed to copy text:", err);
      }
    });
  }

  // 4. Form selectors triggers
  DOM.businessPortfolioSelect.addEventListener('change', (e) => {
    state.activeBusinessId = e.target.value;
    localStorage.setItem('meta_ads_active_business_id', e.target.value);
    
    // Invalidate currently selected ad account to auto-select the first matching account
    state.activeAdAccountId = "";
    loadMetricsData(true); // force reload ad accounts under new portfolio
  });

  DOM.adAccountSelect.addEventListener('change', (e) => {
    state.activeAdAccountId = e.target.value;
    localStorage.setItem('meta_ads_active_ad_account_id', e.target.value);
    loadMetricsData();
  });

  DOM.dateRangeSelect.addEventListener('change', (e) => {
    state.activeDatePreset = e.target.value;
    loadMetricsData();
  });

  // 5. Global Actions
  DOM.btnRefresh.addEventListener('click', () => {
    loadMetricsData(true);
  });

  DOM.btnExportCsv.addEventListener('click', () => {
    if (state.activeDataset) {
      exportCurrentReportCSV(state.activeDataset);
    }
  });

  // 6. Table filters keypress & selectors bindings (re-renders only without network hits)
  DOM.campaignSearch.addEventListener('input', triggerDashboardRefresh);
  DOM.campaignStatusFilter.addEventListener('change', triggerDashboardRefresh);
  DOM.adsetSearch.addEventListener('input', triggerDashboardRefresh);
  
  // Set up sorting columns logic
  bindTableSorters(state.activeDataset, triggerDashboardRefresh);
}

/**
 * Runs on boot, checking if user had a logged-in session prior to reload
 */
async function appStartup() {
  bindEvents();

  // Populate App ID fields if stored
  if (state.appId) {
    if (DOM.gateFbAppIdInput) DOM.gateFbAppIdInput.value = state.appId;
    if (DOM.developerPanel) DOM.developerPanel.classList.remove('hidden');
  }

  setLoading(true, "Checking Facebook auth status...");
  try {
    let tokenValid = false;
    const activeAppId = state.appId.trim() || SYSTEM_FB_APP_ID;

    // 1. Direct validation: Check if existing/pre-populated token is active on Graph API
    if (state.accessToken) {
      if (state.accessToken === 'demo_mode_token') {
        tokenValid = true;
        console.log("Demo session token verified successfully!");
      } else {
        try {
          await fetchUserProfile(state.accessToken);
          tokenValid = true;
          console.log("Meta API access token verified successfully!");
        } catch (err) {
          console.warn("Cached access token invalid, checking Facebook SDK status...", err);
        }
      }
    }

    // 2. If token is invalid/missing, fallback to Facebook SDK check
    if (!tokenValid) {
      try {
        await initFacebookSDK(activeAppId);
        const status = await checkLoginStatus();
        
        if (status && status.accessToken) {
          state.accessToken = status.accessToken;
          localStorage.setItem('meta_ads_access_token', status.accessToken);
          tokenValid = true;
        }
      } catch (sdkErr) {
        console.warn("Facebook SDK status retrieval failed:", sdkErr);
      }
    }
    
    if (tokenValid) {
      if (state.accessToken === 'demo_mode_token') {
        DOM.authStatusContainer.innerHTML = `
          <div class="auth-status-icon logged-in" style="background-color:rgba(16,185,129,0.1)">
            <i data-lucide="user-check" style="color:var(--color-emerald)"></i>
          </div>
          <div class="auth-status-details">
            <span class="auth-status-title" style="color:var(--color-emerald)">Demo Session Active</span>
            <span class="auth-status-description">Simulated connection loaded.</span>
          </div>
        `;
      } else {
        DOM.authStatusContainer.innerHTML = `
          <div class="auth-status-icon logged-in">
            <i data-lucide="user-check"></i>
          </div>
          <div class="auth-status-details">
            <span class="auth-status-title" style="color:var(--color-emerald)">Session Active</span>
            <span class="auth-status-description">Token verified. Ready to sync campaigns.</span>
          </div>
        `;
      }
      DOM.btnFbLogin.classList.add('hidden');
      DOM.btnFbLogout.classList.remove('hidden');
      
      // Hide login gate and show app container
      if (DOM.loginGate) DOM.loginGate.classList.add('hidden');
      if (DOM.appContainer) DOM.appContainer.classList.remove('hidden');

      // Load reports
      await loadMetricsData(true);
    } else {
      // No active session or expired
      localStorage.removeItem('meta_ads_access_token');
      state.accessToken = '';
      
      // Ensure gate is visible and app is hidden
      if (DOM.loginGate) DOM.loginGate.classList.remove('hidden');
      if (DOM.appContainer) DOM.appContainer.classList.add('hidden');
    }
  } catch (err) {
    console.warn("Could not check Facebook status during boot:", err);
    // Ensure gate is visible and app is hidden
    if (DOM.loginGate) DOM.loginGate.classList.remove('hidden');
    if (DOM.appContainer) DOM.appContainer.classList.add('hidden');
  }

  // Finalize icons
  if (window.lucide) window.lucide.createIcons();
  setLoading(false);
}

// Initial Boot trigger
window.addEventListener('DOMContentLoaded', appStartup);
