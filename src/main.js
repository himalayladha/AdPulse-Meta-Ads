/* ==========================================================================
   ADSPULSE ANALYTICS - APPLICATION STATE MACHINE (ENTRYPOINT)
   ========================================================================== */

import { mockAdAccounts, getMockAccountInsights, getMockCampaigns, getMockAdSets, getMockPlacements } from './mock-data.js';
import { initFacebookSDK, loginWithFacebook, logoutFacebook, checkLoginStatus } from './fb-sdk.js';
import { fetchUserProfile, fetchAdAccounts, fetchAccountDailyInsights, fetchCampaignsWithInsights, fetchAdSetsWithInsights, fetchPlacementsWithInsights } from './meta-api.js';
import { updateDashboardUI, exportCurrentReportCSV, bindTableSorters } from './dashboard.js';

// --- Application Core State ---
const state = {
  mode: 'MOCK', // 'MOCK' or 'LIVE'
  appId: localStorage.getItem('meta_ads_app_id') || '',
  accessToken: localStorage.getItem('meta_ads_access_token') || '',
  activeAdAccountId: '',
  activeAdAccountName: '',
  activeDatePreset: 'last_30d',
  activeTab: 'overview',
  activeDataset: null, // Cached analytics payload
  adAccounts: [] // List of available ad accounts
};

// --- DOM Cache Elements ---
const DOM = {
  sidebar: document.getElementById('sidebar'),
  navItems: document.querySelectorAll('.sidebar-nav li'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  pageTitle: document.getElementById('page-title'),
  pageSubtitle: document.getElementById('page-subtitle'),
  
  // Selectors
  adAccountSelect: document.getElementById('ad-account-select'),
  dateRangeSelect: document.getElementById('date-range-select'),
  
  // App Mode Controls
  modeBadge: document.getElementById('mode-badge'),
  toggleModeBtn: document.getElementById('toggle-mode-btn'),
  toggleModeTxt: document.getElementById('toggle-mode-txt'),
  segmentMockBtn: document.getElementById('segment-mock-btn'),
  segmentLiveBtn: document.getElementById('segment-live-btn'),
  mockInfoPanel: document.getElementById('mock-info-panel'),
  liveSetupForm: document.getElementById('live-setup-form'),
  btnTriggerLiveSwitch: document.getElementById('btn-trigger-live-switch'),
  
  // Settings Live Inputs
  fbAppIdInput: document.getElementById('fb-app-id'),
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
 * Updates application context mode display styling
 */
function updateModeUI() {
  const isLive = state.mode === 'LIVE';
  
  // Update Badges & Toggles
  if (isLive) {
    DOM.modeBadge.className = "mode-badge live";
    DOM.modeBadge.innerText = "LIVE API";
    DOM.toggleModeTxt.innerText = "Switch to Demo Mode";
    DOM.toggleModeBtn.classList.add('live-active');
    DOM.segmentLiveBtn.classList.add('active');
    DOM.segmentMockBtn.classList.remove('active');
    DOM.mockInfoPanel.classList.remove('show');
    DOM.liveSetupForm.classList.add('show');
  } else {
    DOM.modeBadge.className = "mode-badge demo";
    DOM.modeBadge.innerText = "DEMO";
    DOM.toggleModeTxt.innerText = "Go Live with Meta";
    DOM.toggleModeBtn.classList.remove('live-active');
    DOM.segmentMockBtn.classList.add('active');
    DOM.segmentLiveBtn.classList.remove('active');
    DOM.liveSetupForm.classList.remove('show');
    DOM.mockInfoPanel.classList.add('show');
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
    if (state.mode === 'LIVE') {
      if (!state.appId) {
        throw new Error("No Facebook App ID configured. Set it up in the Setup & API tab first.");
      }
      if (!state.accessToken) {
        throw new Error("No active Facebook login session. Authenticate in the Setup & API tab first.");
      }

      // 1. Fetch live accounts list if not cached or force requested
      if (state.adAccounts.length === 0 || forceFetch) {
        setLoading(true, "Fetching authorized Meta Ad Accounts...");
        state.adAccounts = await fetchAdAccounts(state.accessToken);
        populateAdAccountDropdown();
      }

      if (state.adAccounts.length === 0) {
        throw new Error("Your Facebook Account doesn't have any associated Meta Ad Accounts.");
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
      
      const [dailyInsights, campaigns, adsets, placements] = await Promise.all([
        fetchAccountDailyInsights(state.activeAdAccountId, state.activeDatePreset, state.accessToken),
        fetchCampaignsWithInsights(state.activeAdAccountId, state.activeDatePreset, state.accessToken),
        fetchAdSetsWithInsights(state.activeAdAccountId, state.activeDatePreset, state.accessToken),
        fetchPlacementsWithInsights(state.activeAdAccountId, state.activeDatePreset, state.accessToken)
      ]);

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

    } else {
      // --- MOCK MODE DATA RETRIEVAL ---
      if (state.adAccounts.length === 0 || forceFetch) {
        state.adAccounts = mockAdAccounts.map(acc => ({
          id: acc.id,
          name: acc.name,
          currency: acc.currency,
          timezone: acc.timezone,
          status: acc.status
        }));
        populateAdAccountDropdown();
      }

      if (!state.activeAdAccountId || !state.adAccounts.find(acc => acc.id === state.activeAdAccountId)) {
        state.activeAdAccountId = state.adAccounts[0].id;
        DOM.adAccountSelect.value = state.activeAdAccountId;
      }

      const activeAcc = state.adAccounts.find(acc => acc.id === state.activeAdAccountId);
      state.activeAdAccountName = activeAcc.name;
      const currency = activeAcc.currency;

      // Extract details from mock database
      const dailyInsights = getMockAccountInsights(state.activeAdAccountId, state.activeDatePreset);
      const campaigns = getMockCampaigns(state.activeAdAccountId, state.activeDatePreset);
      const adsets = getMockAdSets(state.activeAdAccountId, state.activeDatePreset);
      const placements = getMockPlacements(state.activeAdAccountId, state.activeDatePreset);

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

      // Set Demo user profile in Sidebar
      DOM.userAvatar.innerText = "D";
      DOM.userAvatar.style.backgroundImage = 'none';
      DOM.userName.innerText = "Demo Workspace";
      DOM.userStatus.innerText = "Mock Analytics Enabled";
    }

    // Trigger dashboard updates
    triggerDashboardRefresh();

  } catch (error) {
    console.error("Dashboard synchronization error:", error);
    alert(`Sync Failed: ${error.message}`);
    
    // Fall back to Mock mode if Live fetch crashed to protect usability
    if (state.mode === 'LIVE') {
      alert("Encountered live API sync failure. Falling back to Demo Mode.");
      state.mode = 'MOCK';
      updateModeUI();
      loadMetricsData(true);
    }
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
  const customId = DOM.fbAppIdInput.value.trim();
  if (!customId) {
    alert("Please enter a valid Facebook App ID to initiate login.");
    return;
  }

  setLoading(true, "Connecting Facebook SDK...");
  
  try {
    // 1. Initialize SDK
    await initFacebookSDK(customId);
    state.appId = customId;
    localStorage.setItem('meta_ads_app_id', customId);

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

    // 4. Update mode and fetch live records
    state.mode = 'LIVE';
    updateModeUI();
    
    // Switch to overview dashboard automatically
    switchTab('overview');
    
    await loadMetricsData(true);

  } catch (error) {
    console.error("Meta Auth Exception:", error);
    alert(`Authentication Failed: ${error.message}`);
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

  state.mode = 'MOCK';
  updateModeUI();
  
  await loadMetricsData(true);
  setLoading(false);
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

  // 2. Main Mode Toggles
  DOM.toggleModeBtn.addEventListener('click', () => {
    if (state.mode === 'LIVE') {
      state.mode = 'MOCK';
      updateModeUI();
      loadMetricsData(true);
    } else {
      // Check if already authenticated, if yes, just toggle
      if (state.appId && state.accessToken) {
        state.mode = 'LIVE';
        updateModeUI();
        loadMetricsData(true);
      } else {
        // Redirect to configuration settings panel
        alert("Live mode requires setting up a Meta App ID. We are redirecting you to the Setup & API tab!");
        switchTab('settings');
      }
    }
  });

  // Dual segmented switch on settings page
  DOM.segmentMockBtn.addEventListener('click', () => {
    if (state.mode !== 'MOCK') {
      state.mode = 'MOCK';
      updateModeUI();
      loadMetricsData(true);
    }
  });

  DOM.segmentLiveBtn.addEventListener('click', () => {
    if (state.mode !== 'LIVE') {
      if (state.appId && state.accessToken) {
        state.mode = 'LIVE';
        updateModeUI();
        loadMetricsData(true);
      } else {
        alert("Please paste your App ID below and complete 'Login with Facebook' first!");
      }
    }
  });

  DOM.btnTriggerLiveSwitch.addEventListener('click', () => {
    DOM.segmentLiveBtn.click();
  });

  // Save App ID to state as the user types
  DOM.fbAppIdInput.addEventListener('input', (e) => {
    state.appId = e.target.value.trim();
    localStorage.setItem('meta_ads_app_id', state.appId);
  });

  // 3. Setup credentials triggers
  DOM.btnFbLogin.addEventListener('click', handleFBLogin);
  DOM.btnFbLogout.addEventListener('click', handleFBLogout);

  // 4. Form selectors triggers
  DOM.adAccountSelect.addEventListener('change', (e) => {
    state.activeAdAccountId = e.target.value;
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
  updateModeUI();

  // Populate App ID field if stored
  if (state.appId) {
    DOM.fbAppIdInput.value = state.appId;
    
    // If accessToken is present, try to verify
    if (state.accessToken) {
      setLoading(true, "Restoring Facebook session...");
      try {
        await initFacebookSDK(state.appId);
        const status = await checkLoginStatus();
        
        if (status && status.accessToken) {
          // Token verified! Keep LIVE mode active
          state.mode = 'LIVE';
          updateModeUI();
          
          DOM.authStatusContainer.innerHTML = `
            <div class="auth-status-icon logged-in">
              <i data-lucide="user-check"></i>
            </div>
            <div class="auth-status-details">
              <span class="auth-status-title" style="color:var(--color-emerald)">Session Restored</span>
              <span class="auth-status-description">Token active. Ready to sync campaigns.</span>
            </div>
          `;
          DOM.btnFbLogin.classList.add('hidden');
          DOM.btnFbLogout.classList.remove('hidden');
        } else {
          // Token expired
          localStorage.removeItem('meta_ads_access_token');
          state.accessToken = '';
        }
      } catch (err) {
        console.warn("Could not restore session during boot:", err);
      }
    }
  }

  // Finalize icons and load base reports
  if (window.lucide) window.lucide.createIcons();
  await loadMetricsData(true);
}

// Initial Boot trigger
window.addEventListener('DOMContentLoaded', appStartup);
