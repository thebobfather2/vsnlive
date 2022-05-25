import {configure, observable, action, flow, runInAction, toJS} from "mobx";
import {ElvClient} from "@eluvio/elv-client-js";
import { ElvWalletClient } from "@eluvio/elv-wallet-client";
import UrlJoin from "url-join";
import SiteStore from "Stores/Site";
import CartStore from "Stores/Cart";
import MainStore from "Stores/Main";
import CollectionStore from "Stores/Collection";

import EluvioConfiguration from "EluvioConfiguration";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  @observable app = "main";

  @observable pageWidth = window.innerWidth;

  @observable loginLoaded = false;
  @observable showLogin = false;

  @observable baseKey = 1;
  @observable walletKey = 1;
  @observable client;
  @observable redeemedTicket;
  @observable error = "";

  @observable basePublicUrl;

  @observable loggedOut = false;

  @observable walletClient;
  @observable walletTarget;
  @observable walletLoaded = false;
  @observable walletLoggedIn = false;
  @observable walletVisibility = "hidden";

  @observable currentWalletRoute = "";
  @observable currentWalletState = {
    visibility: "hidden",
    location: {
      page: "wallet"
    },
    requireLogin: true
  };
  @observable defaultWalletState = {
    visibility: "hidden",
    requireLogin: true
  };

  @observable savedTickets = {};

  constructor() {
    this.siteStore = new SiteStore(this);
    this.cartStore = new CartStore(this);
    this.mainStore = new MainStore(this);
    this.collectionStore = new CollectionStore(this);

    this.LoadRedeemedTickets();

    window.rootStore = this;

    window.addEventListener("resize", () => this.HandleResize());
  }

  @action.bound
  SetApp(app="main") {
    this.app = app;
  }

  PublicLink({versionHash, path, queryParams={}}) {
    if(!this.basePublicUrl) { return ""; }

    const url = new URL(this.basePublicUrl);
    url.pathname = UrlJoin("q", versionHash, "meta", path);

    Object.keys(queryParams).map(key => url.searchParams.append(key, queryParams[key]));

    return url.toString();
  }

  @action.bound
  LoadRedeemedTickets() {
    let savedTickets = localStorage.getItem("redeemed-tickets");
    if(savedTickets) {
      try {
        this.savedTickets = JSON.parse(atob(savedTickets));
      } catch(error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load redeemed tickets from localstorage:");
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }
  }

  SaveRedeemedTickets() {
    try {
      localStorage.setItem(
        "redeemed-tickets",
        btoa(JSON.stringify(toJS(this.savedTickets)))
      );
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error("Failed to save redeemed tickets to localstorage:");
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  @action.bound
  InitializeClient = flow(function * () {
    if(this.client) { return; }

    const client = yield ElvClient.FromConfigurationUrl({configUrl: EluvioConfiguration["config-url"]});

    this.basePublicUrl = yield client.FabricUrl({
      queryParams: {
        authorization: this.staticToken
      },
      noAuth: true
    });

    this.client = client;
  });

  @action.bound
  RedeemCode = flow(function * (code) {
    try {
      const client = yield ElvClient.FromConfigurationUrl({
        configUrl: EluvioConfiguration["config-url"]
      });

      const { objectId, ntpId } = yield client.RedeemCode({
        tenantId: this.siteStore.currentSiteInfo.tenant_id,
        code,
        includeNTPId: true
      });

      this.client = client;
      this.redeemedTicket = code;

      this.savedTickets[this.siteStore.siteSlug] = {
        code,
        ntpId,
        redeemedAt: Date.now()
      };

      this.SaveRedeemedTickets();

      return objectId;
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error("Error redeeming code: ", error);
    }
  });

  @action.bound
  RedeemCouponCode = flow(function * (code, email, receiveEmails) {
    try {
      const objectId = yield this.RedeemCode(code);

      if(!objectId) { throw Error("Invalid code"); }

      const hash = yield this.client.LatestVersionHash({
        versionHash: "hq__67sMXymkhNwVraEEx3gmBDzNhLUjcaZncbrJH8zd3im7vq65pSrJA3pVjZm5YNdy2MrtP9Qnbc"
      });

      const url = new URL("https://host-154-14-185-104.contentfabric.io");
      url.pathname = UrlJoin("q", hash, "rep", "redeemer");
      url.searchParams.set("authorization", this.client.staticToken);

      const { confirmation_id } = yield (yield fetch(
        url.toString(),
        {
          method: "POST",
          body: JSON.stringify({
            "CODE": code,
            "EML": email,
            "CONSENT": receiveEmails
          })
        }
      )).json();

      this.savedTickets[this.siteStore.siteSlug].couponConfirmationId = confirmation_id;
      this.SaveRedeemedTickets();

      return objectId;
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  });

  /* Wallet */
  InitializeWalletClient = flow(function * ({target, tenantSlug, marketplaceSlug, darkMode=false}) {
    if(!target) { return; }

    this.walletTarget = target;

    this.DestroyWalletClient();

    let walletAppUrl = "https://wallet.contentfabric.io";
    if(window.location.hostname.startsWith("192.")) {
      walletAppUrl = `https://${window.location.hostname}:8090`;
    } else if(window.location.hostname.startsWith("live-stg")) {
      walletAppUrl = EluvioConfiguration["config-url"].includes("main.net955305") ?
        "https://core.test.contentfabric.io/wallet" :
        "https://core.test.contentfabric.io/wallet-demo";
    } else {
      // Prod
      walletAppUrl = EluvioConfiguration["config-url"].includes("main.net955305") ?
        "https://wallet.contentfabric.io" :
        "https://wallet.demov3.contentfabric.io";
    }

    this.walletClient = yield ElvWalletClient.InitializeFrame({
      walletAppUrl,
      target,
      tenantSlug,
      marketplaceSlug,
      captureLogin: true,
      darkMode
    });

    this.walletClient.AddEventListener(ElvWalletClient.EVENTS.LOG_IN_REQUESTED, () =>
      runInAction(() => this.ShowLogin())
    );

    this.walletClient.AddEventListener(ElvWalletClient.EVENTS.ROUTE_CHANGE, event =>
      runInAction(() => this.currentWalletRoute = event.data)
    );

    this.walletClient.AddEventListener(ElvWalletClient.EVENTS.LOG_IN, () => {
      sessionStorage.setItem("wallet-logged-in", "true");

      if(marketplaceSlug) {
        this.walletClient.SetMarketplace({tenantSlug, marketplaceSlug});
      }

      runInAction(() => this.walletLoggedIn = true);
    });

    this.walletClient.AddEventListener(ElvWalletClient.EVENTS.LOG_OUT, () => {
      sessionStorage.removeItem("wallet-logged-in");

      runInAction(() => {
        this.SetWalletPanelVisibility({visibility: "hidden"});
        this.walletLoggedIn = false;
        this.loggedOut = true;

        this.ClearAuthInfo();
      });
    });

    this.walletClient.AddEventListener(ElvWalletClient.EVENTS.LOADED, async () => {
      // Wallet loaded but not logged in - pass our auth info if present
      if(!this.walletLoggedIn && this.AuthInfo()) {
        const { authToken, address, user } = this.AuthInfo();
        await this.walletClient.SignIn({
          name: (user || {}).name,
          email: (user || {}).email,
          address,
          authToken
        });

        this.ShowLogin();
      }

      // Saved wallet visibility + path
      const visibilityParam =
        new URLSearchParams(decodeURIComponent(window.location.search)).has("w") && "full";
      let initialVisibility = visibilityParam ?  { visibility: visibilityParam } : null;
      if(sessionStorage.getItem("wallet-visibility")) {
        try {
          initialVisibility = JSON.parse(sessionStorage.getItem("wallet-visibility"));

          if(initialVisibility) {
            this.SetWalletPanelVisibility(initialVisibility);
          }
          // eslint-disable-next-line no-empty
        } catch(error) {}
      }

      runInAction(() => this.walletLoaded = true);
    });

    this.walletClient.AddEventListener(ElvWalletClient.EVENTS.CLOSE, async () => {
      await this.InitializeWalletClient({target, tenantSlug, marketplaceSlug});

      this.SetWalletPanelVisibility(this.defaultWalletState);
    });

    this.currentWalletRoute = yield this.walletClient.CurrentPath();

    // Fallback in case load event is not received
    setTimeout(() => runInAction(() => this.walletLoaded = true), 10000);
  });

  @action.bound
  DestroyWalletClient() {
    if(this.walletClient) {
      this.walletClient.Destroy();
      this.walletClient = undefined;
    }
  }

  @action.bound
  ReloadWallet() {
    this.DestroyWalletClient();
    this.walletKey += 1;
  }

  SetMarketplaceFilters({filters}) {
    this.walletClient && this.walletClient.SetMarketplaceFilters({filters: toJS(filters)});
  }

  // Set default state for wallet
  @action.bound
  SetDefaultWalletState({visibility, location, video, requireLogin=true}) {
    this.defaultWalletState = {
      visibility,
      location,
      video,
      requireLogin
    };
  }

  @action.bound
  ResetDefaultWalletState() {
    this.defaultWalletState = {
      visibility: "hidden",
      requireLogin: false
    };
  }

  @action.bound
  CloseWalletModal() {
    // Note: Clicking inside the wallet frame does not trigger a click event, so any triggered click will be outside the wallet
    this.SetWalletPanelVisibility(this.defaultWalletState);

    const walletPanel = document.getElementById("wallet-panel");

    walletPanel.removeEventListener("click", this.CloseWalletModal);
    this.walletClient.RemoveEventListener(ElvWalletClient.EVENTS.LOG_IN, this.CloseWalletModal);
  }

  @action.bound
  SetWalletPanelVisibility = flow(function * ({visibility, location, video, hideNavigation=false, requireLogin=true}) {
    try {
      const walletPanel = document.getElementById("wallet-panel");

      const visibilities = ["hidden", "side-panel", "modal", "full"];

      if(!walletPanel || !visibilities.includes(visibility)) {
        return;
      }

      while(!this.walletClient) {
        yield new Promise(r => setTimeout(r, 100));
      }

      if(this.walletClient) {
        if(location) {
          const currentPath = (yield this.walletClient.CurrentPath()) || "";

          if(location.generalLocation) {
            if(
              !(
                // If we generally want to navigate to the wallet or marketplace, check if we're already in it. If not, navigate to it
                location.page === "wallet" && currentPath.startsWith("/wallet") ||
                location.page === "marketplace" && currentPath.startsWith("/marketplace")
                // If we're in a drop event, always navigate
              ) || currentPath.includes("/events/")
            ) {
              yield this.walletClient.Navigate(toJS(location));
            }
          } else {
            yield this.walletClient.Navigate(toJS(location));
          }
        }

        this.walletClient.ToggleSidePanelMode(["modal", "side-panel"].includes(visibility));

        this.walletClient.ToggleNavigation(!hideNavigation);

        if(visibility === "modal") {
          this.walletClient.AddEventListener(ElvWalletClient.EVENTS.LOG_IN, this.CloseWalletModal);
          const Close = () => {
            // Note: Clicking inside the wallet frame does not trigger a click event, so any triggered click will be outside the wallet
            this.SetWalletPanelVisibility(this.defaultWalletState);

            walletPanel.removeEventListener("click", Close);
            this.walletClient.RemoveEventListener(ElvWalletClient.EVENTS.LOG_IN, Close);
          };

          walletPanel.addEventListener("click", Close);
          this.walletClient.AddEventListener(ElvWalletClient.EVENTS.LOG_IN, Close);
        }
      }

      if(visibility === "full") {
        document.body.style.overflowY = "hidden";
      } else {
        document.body.style.overflowY = "";
      }

      this.currentWalletState = {
        visibility,
        location,
        route: yield this.walletClient.CurrentPath(),
        video,
        requireLogin
      };

      if(visibility === "full") {
        sessionStorage.setItem("wallet-visibility", JSON.stringify({visibility, location, requireLogin}));
      } else {
        sessionStorage.removeItem("wallet-visibility");
      }

      // Pause video if video is present and moving into full wallet view
      if(visibility === "full" && this.defaultWalletState.video && this.defaultWalletState.video.element) {
        this.defaultWalletState = {
          ...this.defaultWalletState,
          video: {
            ...this.defaultWalletState.video,
            playing: !this.defaultWalletState.video.element.paused
          }
        };

        this.defaultWalletState.video.element.pause();
      } else if(video && video.playing) {
        video.element.play();
      }
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error("Failed to adjust wallet client visibility:");
      // eslint-disable-next-line no-console
      console.error(error);
    }
  });

  MetamaskAvailable() {
    return window.ethereum && window.ethereum.isMetaMask && window.ethereum.chainId;
  }

  SignMetamask = flow(function * (message) {
    yield window.ethereum.request({method: "eth_requestAccounts"});
    const from = window.ethereum.selectedAddress;
    return yield window.ethereum.request({
      method: "personal_sign",
      params: [message, from, ""],
    });
  });

  // NOTE: Logging in via OAuth does NOT replace the client used in live, it only passes auth to the wallet frame
  @action.bound
  Authenticate = flow(function * ({idToken, fabricToken, authToken, address, user, tenantId, externalWallet, expiresAt}) {
    try {
      this.loggingIn = true;
      const client = yield ElvClient.FromConfigurationUrl({configUrl: EluvioConfiguration["config-url"]});

      // Show MM download page or mobile app
      if(externalWallet === "metamask" && !this.MetamaskAvailable()) {
        const url = new URL(window.location.href);
        const a = document.createElement("a");
        a.href = `https://metamask.app.link/dapp/${url.toString().replace("https://", "")}`;

        a.target = "_self";
        document.body.appendChild(a);
        a.click();
        a.remove();

        return;
      }

      if(externalWallet) {
        if(externalWallet === "metamask") {
          address = client.utils.FormatAddress(window.ethereum && window.ethereum.selectedAddress);

          const duration = 24 * 60 * 60 * 1000;
          fabricToken = yield client.CreateFabricToken({
            address,
            duration,
            Sign: this.SignMetamask,
            addEthereumPrefix: false
          });

          expiresAt = Date.now() + duration;
        } else {
          throw Error("Unknown external wallet: " + externalWallet);
        }
      } else if(fabricToken && !authToken) {
        // Signed in previously with external wallet
      } else if(idToken || authToken) {
        yield client.SetRemoteSigner({idToken, authToken, tenantId, extraData: user?.userData, unsignedPublicAuth: true});
        expiresAt = JSON.parse(atob(client.signer.authToken)).exp;
        fabricToken = yield client.CreateFabricToken({duration: expiresAt - Date.now()});
        authToken = client.signer.authToken;
        address = client.utils.FormatAddress(client.CurrentAccountAddress());
      } else if(!fabricToken) {
        throw Error("Neither ID token nor auth token provided to Authenticate");
      }

      const walletName = externalWallet || "Eluvio";

      let authInfo = {
        address,
        authToken,
        fabricToken,
        walletName,
        user,
        tenantId,
        expiresAt
      };


      localStorage.setItem(
        "auth",
        this.client.utils.B64(JSON.stringify(authInfo))
      );

      localStorage.setItem("hasLoggedIn", "true");

      if(this.walletClient) {
        this.walletClient.SignIn({
          name: (user || {}).name,
          email: (user || {}).email,
          address,
          authToken,
          fabricToken,
          walletName,
          expiresAt
        });

        yield new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch(error){
      // eslint-disable-next-line no-console
      console.error("Error logging in:");
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      this.loggingIn = false;
    }
  });

  @action.bound
  SetLoginLoaded() {
    this.loginLoaded = true;
  }

  @action.bound
  ShowLogin() {
    this.showLogin = true;
  }

  @action.bound
  HideLogin() {
    this.showLogin = false;
  }

  ClearAuthInfo() {
    localStorage.removeItem("auth");
  }

  AuthInfo() {
    try {
      const tokenInfo = localStorage.getItem("auth");

      if(tokenInfo) {
        let { authToken, fabricToken, address, user, tenantId, expiresAt, walletName } = JSON.parse(this.client.utils.FromB64(tokenInfo));

        // Expire tokens early so they don't stop working while in use
        const expirationBuffer = 4 * 60 * 60 * 1000;

        expiresAt = expiresAt || (authToken && JSON.parse(atob(authToken)).exp);
        if(expiresAt && expiresAt - Date.now() < expirationBuffer) {
          this.ClearAuthInfo();
        } else {
          return { authToken, fabricToken, address, user, tenantId, expiresAt, walletName };
        }
      }
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error("Failed to retrieve auth info");
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  @action.bound
  SetError(error) {
    this.error = error;

    clearTimeout(this.errorTimeout);

    this.errorTimeout = setTimeout(() => {
      runInAction(() => this.SetError(""));
    }, 8000);
  }

  // Force reload of App.js (e.g. to switch main site to event site
  @action.bound
  UpdateBaseKey() {
    this.baseKey += 1;
  }

  @action.bound
  HandleResize() {
    clearTimeout(this.resizeTimeout);

    this.resizeTimeout = setTimeout(() => {
      if(this.pageWidth !== window.innerWidth) {
        runInAction(() => this.pageWidth = window.innerWidth);
      }
    }, 50);
  }
}

const root = new RootStore();

export const rootStore = root;
export const siteStore = root.siteStore;
export const cartStore = root.cartStore;
export const mainStore = root.mainStore;
export const collectionStore = root.collectionStore;
