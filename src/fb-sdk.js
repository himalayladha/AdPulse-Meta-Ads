/* ==========================================================================
   ADSPULSE ANALYTICS - FACEBOOK SDK WRAPPER
   ========================================================================== */

let sdkLoaded = false;
let sdkInitPromise = null;

/**
 * Injects the Facebook SDK script tag asynchronously into the DOM
 */
function injectSDKScript() {
  return new Promise((resolve, reject) => {
    if (document.getElementById('facebook-jssdk')) {
      resolve();
      return;
    }

    const firstScript = document.getElementsByTagName('script')[0];
    const jsScript = document.createElement('script');
    jsScript.id = 'facebook-jssdk';
    jsScript.src = "https://connect.facebook.net/en_US/sdk.js";
    jsScript.async = true;
    jsScript.defer = true;
    
    jsScript.onload = () => resolve();
    jsScript.onerror = (err) => reject(new Error("Failed to load Facebook SDK. This is typically caused by an ad-blocker, tracking blocker, or privacy shield blocking social scripts. Please temporarily disable it to connect your Facebook account."));
    
    firstScript.parentNode.insertBefore(jsScript, firstScript);
  });
}

/**
 * Initializes the Facebook SDK with a custom App ID
 */
export function initFacebookSDK(appId) {
  if (sdkInitPromise && window.FB) {
    // If already loaded and matching, reuse promise
    return sdkInitPromise;
  }

  sdkInitPromise = injectSDKScript().then(() => {
    return new Promise((resolve) => {
      window.fbAsyncInit = function() {
        window.FB.init({
          appId      : appId,
          cookie     : true,
          xfbml      : true,
          version    : 'v18.0'
        });
        
        sdkLoaded = true;
        console.log("Facebook SDK successfully initialized with App ID:", appId);
        resolve(window.FB);
      };

      // In case the SDK script finished loading before window.fbAsyncInit is bound
      if (window.FB && window.FB.init) {
        window.fbAsyncInit();
      }
    });
  });

  return sdkInitPromise;
}

/**
 * Requests Facebook Login Auth window with ads_read scope
 */
export function loginWithFacebook() {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Facebook SDK not initialized. Please set up your App ID first."));
      return;
    }

    window.FB.login((response) => {
      if (response.authResponse) {
        console.log("User successfully logged in with Facebook:", response.authResponse);
        resolve(response.authResponse);
      } else {
        reject(new Error("User cancelled Facebook Login or did not fully authorize the application."));
      }
    }, {
      scope: 'ads_read,public_profile,business_management',
      return_scopes: true
    });
  });
}

/**
 * Log out of active Facebook App Session
 */
export function logoutFacebook() {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve();
      return;
    }
    
    window.FB.logout(() => {
      console.log("Facebook User logged out successfully.");
      resolve();
    });
  });
}

/**
 * Check active Facebook authorization status
 */
export function checkLoginStatus() {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Facebook SDK not initialized."));
      return;
    }

    window.FB.getLoginStatus((response) => {
      if (response.status === 'connected') {
        resolve(response.authResponse);
      } else {
        resolve(null);
      }
    });
  });
}
