# 📘 Meta/Facebook Developer Setup Guide for AdPulse Analytics

This guide provides a step-by-step walkthrough to help marketers, developers, and advertisers set up their own **Meta Developer Application** to hook up this analytics dashboard to live Meta advertising accounts.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Step 1: Register as a Meta Developer](#step-1-register-as-a-meta-developer)
3. [Step 2: Create a Meta Application](#step-2-create-a-meta-application)
4. [Step 3: Add Facebook Login & Marketing API Products](#step-3-add-facebook-login--marketing-api-products)
5. [Step 4: Configure Redirect URIs](#step-4-configure-redirect-uris)
6. [Step 5: Configure Roles for Sandbox Testing](#step-5-configure-roles-for-sandbox-testing)
7. [Step 6: Submit for App Review (To Go Live Publicly)](#step-6-submit-for-app-review-to-go-live-publicly)
8. [Step 7: Retrieve your App ID & Run the Dashboard](#step-7-retrieve-your-app-id--run-the-dashboard)

---

## 1. Prerequisites
Before starting, ensure you have:
* A personal Facebook profile.
* A **Meta Business Manager** account (optional but highly recommended for marketing API access).
* An active **Meta Ad Account** with campaign data.

---

## Step 1: Register as a Meta Developer
To integrate your app with Facebook services, you must register as a Meta Developer:
1. Navigate to [developers.facebook.com](https://developers.facebook.com/).
2. Click **Get Started** or **Log In** in the top right-hand corner.
3. Log in with your standard Facebook credentials.
4. Follow the registration onboarding wizard:
   * Agree to the Meta Platform Terms and Developer Policies.
   * Verify your account using your mobile phone number.
   * Select your developer occupation profile (e.g., **Marketer** or **Developer**).

---

## Step 2: Create a Meta Application
Every API integration requires a unique Application ID (App ID):
1. Inside your [Meta App Dashboard](https://developers.facebook.com/apps/), click **Create App** (green button).
2. **Select App Use Cases**: Choose **Other** or **Business** (choose **Other** if you want more flexibility in products). Click **Next**.
3. **Select App Type**: Choose **Business** (this is critical as it unlocks Business Portfolios and the Marketing API). Click **Next**.
4. **App Details**:
   * **Display Name**: Enter a name (e.g., `AdPulse Analytics Dashboard`).
   * **App Contact Email**: Verify your support email.
   * **Business Account**: Select your Meta Business Manager portfolio (optional, but unlocks business integrations).
5. Click **Create App** and enter your Facebook password to confirm.

---

## Step 3: Add Facebook Login & Marketing API Products
Your newly created app needs credentials to connect to Facebook's OAuth and Marketing endpoints:
1. Scroll down the App Dashboard to the **Add products to your app** section.
2. Find **Facebook Login** (or *Facebook Login for Business*) and click **Set Up**.
3. Find the **Marketing API** product card and click **Set Up**. (This initializes the SDK libraries and insight nodes under your App ID).

---

## Step 4: Configure Redirect URIs
To ensure secure login interactions, you must declare exactly which domain names are authorized to process Facebook's authentication tokens:
1. In the left-hand navigation sidebar, expand **Facebook Login** and click **Settings**.
2. Scroll to the **Client OAuth Settings** card.
3. Look for the input field: **Valid OAuth Redirect URIs**.
4. Add your authorized domains:
   * **For Development**: `http://localhost:3000/` and `http://localhost:3000`
   * **For Production**: Add your live staging URLs (e.g., `https://ad-pulse-meta-ads.vercel.app/` or your custom domain).
5. Ensure **Login with JavaScript SDK** is toggled to **Yes**.
6. Under **Allowed Domains for the JavaScript SDK**, enter your active domain names (e.g., `http://localhost:3000` and `https://ad-pulse-meta-ads.vercel.app`).
7. Click **Save Changes** at the bottom of the screen.

---

## Step 5: Configure Roles for Sandbox Testing
While your application is in **Development Mode** (default state), Facebook restricts login access to accounts explicitly linked to the app project:
1. In the left navigation sidebar, click **App Roles** -> **Roles**.
2. Scroll to the **Testers** card and click **Add Testers**.
3. Enter the Facebook username, name, or profile ID of the test user/marketer you want to allow.
4. Click **Submit**.
5. **CRITICAL STEP**: The tester must log in at [developers.facebook.com](https://developers.facebook.com/), go to their notifications, and accept the tester invitation. Once accepted, they can log in to your dashboard successfully without encountering the *"App not active"* screen!

---

## Step 6: Submit for App Review (To Go Live Publicly)
To allow **any** Facebook user or marketer to access your dashboard without manually adding them as a Tester, you must transition the app from **Development Mode** to **Live Mode**:

### 1. Request Advanced Access Permissions
1. Go to **App Review** -> **Permissions and Features** in the sidebar.
2. Locate the following permissions and request **Advanced Access** (requires submitting an App Review request):
   * `public_profile`: Basic profile details (Standard/Advanced access).
   * `ads_read`: Required to fetch ad accounts, campaigns, budgets, and insights metrics.
   * `business_management`: Required to fetch Business Manager portfolios and portfolios nodes.

### 2. Submit the Review Request
1. Meta will request a short screencast and text explanation:
   * Show a screencast of a user visiting your login page.
   * Show them clicking "Login with Facebook", granting permissions, and loading the dashboard metrics.
   * Add a description explaining: *"Our dashboard uses the ads_read and business_management permissions to fetch and display campaign metrics, impressions, spends, CTR, CPC, and conversions for our clients inside a unified reporting panel."*
2. Confirm your business details by completing the **Business Verification** process inside the Meta Business Suite.

### 3. Switch App to Live Mode
* Once your App Review is approved, toggle the **App Mode** switch at the top of your Developer dashboard from **Development** to **Live**.

---

## Step 7: Retrieve your App ID & Run the Dashboard

### 1. Copy your App ID
* Copy the **App ID** numeric string from the top navigation bar of your Meta Developer console.

### 2. Hook it up to the Dashboard
1. Open the AdPulse Login Gate in your browser.
2. Paste your custom numeric App ID into the **Meta / Facebook App ID** input field.
3. Click **Login with Facebook**. The SDK will now initialize and authenticate through your own custom application!
4. To hardcode this permanently for your customers, replace the `SYSTEM_FB_APP_ID` constant in `src/main.js` with your App ID:
   ```javascript
   const SYSTEM_FB_APP_ID = 'YOUR_NEW_APP_ID';
   ```

---

> 🔒 **Security Notice:** AdPulse Analytics runs entirely inside the client's web browser. All Facebook tokens are kept in browser local storage and are never uploaded to any remote servers. Your data remains completely private.
