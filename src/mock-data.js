/* ==========================================================================
   ADSPULSE ANALYTICS - DYNAMIC MOCK DATA ENGINE
   ========================================================================== */

/**
 * Generates realistic daily metrics for a given date, simulating weekly cycles
 * and slight random fluctuations to create organic-looking trends.
 */
function generateDailyRecord(dateStr, baseSpend, baseCtr, baseCpc, baseConvRate, baseAov) {
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Weekly seasonality: E-comm spends more on weekends, B2B on weekdays
  let multiplier = 1.0;
  if (baseAov > 80) { // B2B/SaaS Scenario
    multiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.2;
  } else { // E-Commerce/App Scenario
    multiplier = (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) ? 1.25 : 0.85;
  }

  // Inject some randomized variance (+/- 15%)
  const variance = 0.85 + Math.random() * 0.3;
  const finalMultiplier = multiplier * variance;

  const spend = Math.round(baseSpend * finalMultiplier * 100) / 100;
  const ctr = Math.round((baseCtr * (0.9 + Math.random() * 0.2)) * 1000) / 1000;
  const cpc = Math.round((baseCpc * (0.95 + Math.random() * 0.1)) * 100) / 100;
  
  // Calculations
  const clicks = Math.round(spend / cpc);
  const impressions = Math.round(clicks / (ctr / 100));
  
  const convRate = baseConvRate * (0.85 + Math.random() * 0.3);
  const conversions = Math.round(clicks * (convRate / 100));
  
  const revenue = Math.round(conversions * baseAov * (0.9 + Math.random() * 0.2) * 100) / 100;
  const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0;

  return {
    date: dateStr,
    spend,
    impressions,
    clicks,
    ctr: Math.round((clicks / impressions) * 10000) / 100,
    cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
    conversions,
    revenue,
    roas
  };
}

/**
 * Returns a time-series list of records for the last 90 days up to today.
 */
function generateHistoricalTimeline(daysCount, baseSpend, baseCtr, baseCpc, baseConvRate, baseAov) {
  const timeline = [];
  const today = new Date();
  
  for (let i = daysCount; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    timeline.push(generateDailyRecord(dateStr, baseSpend, baseCtr, baseCpc, baseConvRate, baseAov));
  }
  return timeline;
}

// 1. Mock Ad Account Definitions
// Mock Business Portfolio Definitions
export const mockBusinessPortfolios = [
  { id: "biz_11111", name: "Apex Group Holdings" },
  { id: "biz_22222", name: "Alpha Digital Agency" }
];

// 1. Mock Ad Account Definitions
export const mockAdAccounts = [
  {
    id: "act_1029384756",
    name: "Apex Retail Global (E-Commerce)",
    currency: "INR",
    timezone: "Asia/Kolkata",
    status: "ACTIVE",
    businessId: "biz_11111",
    baseConfig: {
      days: 90,
      spend: 35000, // Average daily spend in INR
      ctr: 2.45,  // Average CTR %
      cpc: 8.50,  // Average CPC in INR
      convRate: 3.5, // Conv Rate %
      aov: 1800     // Average Order Value in INR (₹1,800)
    },
    placements: {
      facebook: 55,
      instagram: 35,
      messenger: 5,
      audience_network: 5
    },
    campaigns: [
      { id: "c_101", name: "Summer Launch - Purchase Conversions", status: "ACTIVE", objective: "CONVERSIONS", bid_strategy: "Lowest Cost", weight: 0.45 },
      { id: "c_102", name: "Catalog Dynamic Ads - Retargeting L30D", status: "ACTIVE", objective: "CONVERSIONS", bid_strategy: "Cost Cap (₹1,200.00)", weight: 0.30 },
      { id: "c_103", name: "Brand Awareness - Dynamic Video Lookalike", status: "ACTIVE", objective: "OUTCOME_AWARENESS", bid_strategy: "Lowest Cost", weight: 0.15 },
      { id: "c_104", name: "Easter Promo - Traffic & Clicks", status: "PAUSED", objective: "OUTCOME_TRAFFIC", bid_strategy: "Lowest Cost", weight: 0.10 }
    ],
    adsets: [
      { id: "as_101a", name: "Lookalike 1-2% Purchase - IN/APAC", campaignId: "c_101", status: "ACTIVE", bid: "Lowest Cost", budget: 15000 },
      { id: "as_101b", name: "Interest Targeting - Fashion & Design", campaignId: "c_101", status: "ACTIVE", bid: "Lowest Cost", budget: 10000 },
      { id: "as_102a", name: "Custom Audience - View Content/Add to Cart 30D", campaignId: "c_102", status: "ACTIVE", bid: "Cost Cap ₹1,200", budget: 15000 },
      { id: "as_103a", name: "Broad Audience - IN 18-54", campaignId: "c_103", status: "ACTIVE", bid: "Lowest Cost", budget: 5000 },
      { id: "as_104a", name: "Promo Audience - Broad Shopping interest", campaignId: "c_104", status: "PAUSED", bid: "Lowest Cost", budget: 0 }
    ]
  },
  {
    id: "act_9876543210",
    name: "SaaS Growth Accelerator (B2B)",
    currency: "INR",
    timezone: "Asia/Kolkata",
    status: "ACTIVE",
    businessId: "biz_22222",
    baseConfig: {
      days: 90,
      spend: 60000, // Average daily spend in INR
      ctr: 1.62,
      cpc: 75.00,  // Average CPC in INR
      convRate: 5.2, // Higher lead conversion rate, but lower purchase value (representing lead form submissions)
      aov: 8500    // Simulated Cost-per-Lead Value weight in INR
    },
    placements: {
      facebook: 65,
      instagram: 15,
      messenger: 2,
      audience_network: 18
    },
    campaigns: [
      { id: "c_201", name: "Q2 Demo Registrations - Lead Generation", status: "ACTIVE", objective: "OUTCOME_LEADS", bid_strategy: "Lowest Cost", weight: 0.50 },
      { id: "c_202", name: "Whitepaper Download - Content Traffic", status: "ACTIVE", objective: "OUTCOME_LEADS", bid_strategy: "Lowest Cost", weight: 0.30 },
      { id: "c_203", name: "Enterprise ABM - Custom List Matching", status: "ACTIVE", objective: "CONVERSIONS", bid_strategy: "Lowest Cost", weight: 0.20 }
    ],
    adsets: [
      { id: "as_201a", name: "Lookalike 1% Lead Submissions - IN/APAC", campaignId: "c_201", status: "ACTIVE", bid: "Lowest Cost", budget: 25000 },
      { id: "as_201b", name: "Job Titles - Marketing Directors & VP", campaignId: "c_201", status: "ACTIVE", bid: "Lowest Cost", budget: 15000 },
      { id: "as_202a", name: "Interests - Growth Marketing / SaaS", campaignId: "c_202", status: "ACTIVE", bid: "Lowest Cost", budget: 20000 },
      { id: "as_203a", name: "Uploaded Enterprise List - L90D", campaignId: "c_203", status: "ACTIVE", bid: "Lowest Cost", budget: 15000 }
    ]
  },
  {
    id: "act_4567891230",
    name: "Horizon Mobile App (Gaming)",
    currency: "INR",
    timezone: "Asia/Kolkata",
    status: "ACTIVE",
    businessId: null, // Personal account
    baseConfig: {
      days: 90,
      spend: 120000, // Average daily spend in INR (₹1,20,000)
      ctr: 3.85,  // Highly engaging creative
      cpc: 4.50,  // Cheap clicks for mobile app installs in INR
      convRate: 25.0, // High install rate %
      aov: 250    // LTV of installation event in INR
    },
    placements: {
      facebook: 30,
      instagram: 50,
      messenger: 3,
      audience_network: 17
    },
    campaigns: [
      { id: "c_301", name: "App Installs - Global iOS Campaign", status: "ACTIVE", objective: "APP_INSTALLS", bid_strategy: "Lowest Cost", weight: 0.60 },
      { id: "c_302", name: "App Installs - Global Android Campaign", status: "ACTIVE", objective: "APP_INSTALLS", bid_strategy: "Lowest Cost", weight: 0.30 },
      { id: "c_303", name: "In-App Purchases - Retargeting Level 1-5", status: "ACTIVE", objective: "CONVERSIONS", bid_strategy: "Lowest Cost", weight: 0.10 }
    ],
    adsets: [
      { id: "as_301a", name: "Worldwide Gaming Lookalikes - iOS 15+", campaignId: "c_301", status: "ACTIVE", bid: "Lowest Cost", budget: 70000 },
      { id: "as_302a", name: "Worldwide Gaming Lookalikes - Android 10+", campaignId: "c_302", status: "ACTIVE", bid: "Lowest Cost", budget: 40000 },
      { id: "as_303a", name: "Custom Installs - Opened App Last 7D", campaignId: "c_303", status: "ACTIVE", bid: "Lowest Cost", budget: 15000 }
    ]
  }
];

// Pre-generated database in memory
const adAccountTimelineDB = {};

// Initialize timeline database immediately
mockAdAccounts.forEach(account => {
  adAccountTimelineDB[account.id] = generateHistoricalTimeline(
    account.baseConfig.days,
    account.baseConfig.spend,
    account.baseConfig.ctr,
    account.baseConfig.cpc,
    account.baseConfig.convRate,
    account.baseConfig.aov
  );
});

/**
 * Filter historical daily timeline by selected date range
 */
export function getMockAccountInsights(accountId, datePreset, startDate = null, endDate = null) {
  const allTimeline = adAccountTimelineDB[accountId];
  if (!allTimeline) return [];

  const today = new Date();
  let filterDateLimit = new Date();

  // Date Range Math
  switch (datePreset) {
    case "today":
      filterDateLimit.setDate(today.getDate() - 1);
      break;
    case "yesterday":
      const yesterdayStart = new Date(today);
      yesterdayStart.setDate(today.getDate() - 1);
      const yesterdayEnd = new Date(today);
      yesterdayEnd.setDate(today.getDate() - 1);
      return allTimeline.filter(record => record.date === yesterdayStart.toISOString().split('T')[0]);
    case "last_7d":
      filterDateLimit.setDate(today.getDate() - 8);
      break;
    case "last_30d":
      filterDateLimit.setDate(today.getDate() - 31);
      break;
    case "last_90d":
      filterDateLimit.setDate(today.getDate() - 91);
      break;
    case "this_month":
      filterDateLimit = new Date(today.getFullYear(), today.getMonth(), 1);
      filterDateLimit.setDate(filterDateLimit.getDate() - 1); // include day 1
      break;
    case "lifetime":
    default:
      filterDateLimit = new Date(2000, 1, 1); // grab all
      break;
  }

  const limitStr = filterDateLimit.toISOString().split('T')[0];
  
  if (datePreset === "today") {
    // Return last record
    return [allTimeline[allTimeline.length - 1]];
  }

  return allTimeline.filter(record => record.date > limitStr);
}

/**
 * Get dynamic campaign list with aggregated insights calculated from the matching dates.
 */
export function getMockCampaigns(accountId, datePreset) {
  const account = mockAdAccounts.find(acc => acc.id === accountId);
  if (!account) return [];

  const timelineRecords = getMockAccountInsights(accountId, datePreset);
  
  // Aggregate main performance totals
  let totalSpend = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let totalRevenue = 0;

  timelineRecords.forEach(rec => {
    totalSpend += rec.spend;
    totalImpressions += rec.impressions;
    totalClicks += rec.clicks;
    totalConversions += rec.conversions;
    totalRevenue += rec.revenue;
  });

  // Distribute totals among campaigns using campaign weights
  return account.campaigns.map(c => {
    // Generate precise aggregate metrics for each campaign using its predefined weight
    const cSpend = Math.round(totalSpend * c.weight * 100) / 100;
    const cImpressions = Math.round(totalImpressions * c.weight);
    const cClicks = Math.round(totalClicks * c.weight);
    const cConversions = Math.round(totalConversions * c.weight);
    const cRevenue = Math.round(totalRevenue * c.weight * 100) / 100;

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      bid_strategy: c.bid_strategy,
      insights: {
        spend: cSpend,
        impressions: cImpressions,
        clicks: cClicks,
        ctr: cImpressions > 0 ? Math.round((cClicks / cImpressions) * 10000) / 100 : 0,
        cpc: cClicks > 0 ? Math.round((cSpend / cClicks) * 100) / 100 : 0,
        conversions: cConversions,
        roas: cSpend > 0 ? Math.round((cRevenue / cSpend) * 100) / 100 : 0,
        revenue: cRevenue
      }
    };
  });
}

/**
 * Get dynamic ad sets list with insights calculated from active dates.
 */
export function getMockAdSets(accountId, datePreset) {
  const account = mockAdAccounts.find(acc => acc.id === accountId);
  if (!account) return [];

  const campaigns = getMockCampaigns(accountId, datePreset);

  // Split campaign results among the ad sets
  return account.adsets.map(as => {
    const parentCampaign = campaigns.find(c => c.id === as.campaignId);
    
    // Split: if campaign has multiple ad sets, give them proportional weight.
    const siblingAdSets = account.adsets.filter(sib => sib.campaignId === as.campaignId);
    const splitRatio = 1 / siblingAdSets.length;
    
    const spend = parentCampaign ? Math.round(parentCampaign.insights.spend * splitRatio * 100) / 100 : 0;
    const clicks = parentCampaign ? Math.round(parentCampaign.insights.clicks * splitRatio) : 0;
    const impressions = parentCampaign ? Math.round(parentCampaign.insights.impressions * splitRatio) : 0;
    const conversions = parentCampaign ? Math.round(parentCampaign.insights.conversions * splitRatio) : 0;

    return {
      id: as.id,
      name: as.name,
      status: as.status,
      campaignName: parentCampaign ? parentCampaign.name : "Unknown",
      spend,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
      conversions,
      bid_strategy: as.bid,
      budget: as.budget
    };
  });
}

/**
 * Get placement distribution spend for active date limits.
 */
export function getMockPlacements(accountId, datePreset) {
  const account = mockAdAccounts.find(acc => acc.id === accountId);
  if (!account) return {};

  const timelineRecords = getMockAccountInsights(accountId, datePreset);
  const totalSpend = timelineRecords.reduce((sum, rec) => sum + rec.spend, 0);

  const dist = account.placements;
  return {
    "Facebook Feed": Math.round(totalSpend * (dist.facebook / 100) * 100) / 100,
    "Instagram Stories & Feed": Math.round(totalSpend * (dist.instagram / 100) * 100) / 100,
    "Audience Network": Math.round(totalSpend * (dist.audience_network / 100) * 100) / 100,
    "Messenger Ads": Math.round(totalSpend * (dist.messenger / 100) * 100) / 100
  };
}
