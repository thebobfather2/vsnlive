import {configure, observable, action, flow, runInAction, toJS} from "mobx";
import {ElvClient} from "@eluvio/elv-client-js";
import { ElvWalletClient } from "@eluvio/elv-wallet-client/src/index";
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
  @observable baseKey = 1;
  @observable client;
  @observable walletClient;
  @observable redeemedTicket;
  @observable error = "";

  @observable savedTickets = {};

  constructor() {
    this.siteStore = new SiteStore(this);
    this.cartStore = new CartStore(this);
    this.mainStore = new MainStore(this);
    this.collectionStore = new CollectionStore(this);

    this.LoadRedeemedTickets();

    window.rootStore = this;
  }

  @action.bound
  LoadRedeemedTickets() {
    let savedTickets = localStorage.getItem("redeemed-tickets");
    if(savedTickets) {
      try {
        this.savedTickets = JSON.parse(atob(savedTickets));
      } catch(error) {
        console.error("Failed to load redeemed tickets from localstorage:");
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
      console.error("Failed to save redeemed tickets to localstorage:");
      console.error(error);
    }
  }

  @action.bound
  InitializeClient = flow(function * () {
    if(this.client) { return; }

    this.client = yield ElvClient.FromConfigurationUrl({configUrl: EluvioConfiguration["config-url"]});
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
    } catch (error) {
       console.log("Error redeeming code: ", error);
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
      console.error(error);
    }
  });

  /* Wallet */
  InitializeWalletClient = flow(function * (target) {
    if(!target) { return; }

    this.DestroyWalletClient();

    this.walletClient = yield ElvWalletClient.InitializeFrame({
      //walletAppUrl: "https://core.test.contentfabric.io/elv-media-wallet/?d",
      //walletAppUrl: "https://localhost:8090?d",
      walletAppUrl: "https://192.168.0.17:8090?d",
      target
    });

    this.walletClient.AddEventListener(ElvWalletClient.EVENTS.CLOSE, () => this.DestroyWalletClient());
  });

  @action.bound
  DestroyWalletClient() {
    if(this.walletClient) {
      this.walletClient.Destroy();
      this.walletClient = undefined;
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
}

const root = new RootStore();

export const rootStore = root;
export const siteStore = root.siteStore;
export const cartStore = root.cartStore;
export const mainStore = root.mainStore;
export const collectionStore = root.collectionStore;
