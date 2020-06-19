import {observable, action, flow, computed, toJS} from "mobx";
import URI from "urijs";
import UrlJoin from "url-join";
import Id from "@eluvio/elv-client-js/src/Id";
import { v4 as UUID } from "uuid";

// Note: Update if defaults change in asset manager
const DEFAULT_ASSOCIATED_ASSETS = [
  {
    name: "titles",
    label: "Titles",
    indexed: true,
    slugged: true,
    defaultable: true,
    orderable: true
  },
  {
    name: "series",
    label: "Series",
    asset_types: ["primary"],
    title_types: ["series"],
    for_title_types: ["site", "collection"],
    indexed: true,
    slugged: true,
    defaultable: false,
    orderable: true
  },
  {
    name: "seasons",
    label: "Seasons",
    asset_types: ["primary"],
    title_types: ["season"],
    for_title_types: ["series"],
    indexed: true,
    slugged: true,
    defaultable: false,
    orderable: true
  },
  {
    name: "episodes",
    label: "Episodes",
    asset_types: ["primary"],
    title_types: ["episode"],
    for_title_types: ["season"],
    indexed: true,
    slugged: true,
    defaultable: false,
    orderable: true
  }
];

class SiteStore {
  @observable siteHash;
  @observable assets = {};

  @observable dashSupported = false;
  @observable activeTitle;
  @observable playoutUrl;
  @observable authToken;

  @observable searchResults = [];

  //
  @observable showEpisodes = [];
  //

  @observable searching = false;
  @observable searchQuery = "";
  @observable searchCounter = 0;
  @observable searchIndex;
  @observable searchNodes = [];

  @observable error = "";

  @computed get client() {
    return this.rootStore.client;
  }

  @computed get siteId() {
    return (this.siteParams || {}).objectId;
  }

  @computed get activeTitleId() {
    return (this.activeTitle || {}).objectId;
  }

  @computed get siteInfo() {
    return this.assets[this.siteHash];
  }

  constructor(rootStore) {
    this.rootStore = rootStore;
  }

  ///////////////////////////////////////
  //Modal
  @observable modalTitle;

  @action.bound
  SetModalTitle = flow(function * (title) {
    if(title) {
      yield this.LoadAsset(title.baseLinkPath);
    }

    this.modalTitle = title;
  });

  ///////////////////////////////////////
  @action.bound
  Reset() {
    this.assets = {};

    this.dashSupported = false;
    this.activeTitle = undefined;
    this.playoutUrl = undefined;
    this.authToken = undefined;

    this.searching = false;
    this.searchQuery = "";
    this.searchCounter = 0;

    this.searchIndex = undefined;
    this.searchNodes = [];

    this.error = "";
  }

  // Load associated assets of specified object from its type
  async AssociatedAssets(versionHash) {
    const titleType = await this.client.ContentObjectMetadata({
      versionHash,
      metadataSubtree: "public/asset_metadata/title_type"
    });

    const typeHash = (await this.client.ContentObject({versionHash})).type;
    const latestTypeHash = await this.client.LatestVersionHash({versionHash: typeHash});

    const associatedAssets = (await this.client.ContentObjectMetadata({
      versionHash: latestTypeHash,
      metadataSubtree: "public/title_configuration/associated_assets"
    })) || DEFAULT_ASSOCIATED_ASSETS;

    return associatedAssets
      .filter(asset =>
        !asset.for_title_types ||
        asset.for_title_types.includes(titleType)
      )
      .sort((a, b) => a.name < b.name ? -1 : 1);
  }

  @action.bound
  LoadSite = flow(function * (objectId, writeToken) {
    this.Reset();

    this.siteParams = {
      libraryId: yield this.client.ContentObjectLibraryId({objectId}),
      objectId: objectId,
      versionHash: yield this.client.LatestVersionHash({objectId}),
      writeToken: writeToken
    };

    const availableDRMS = yield this.client.AvailableDRMs();
    this.dashSupported = availableDRMS.includes("widevine");

    this.searchIndex = yield this.client.ContentObjectMetadata({...this.siteParams, metadataSubtree: "public/site_index"});
    this.searchNodes = yield this.client.ContentObjectMetadata({...this.siteParams, metadataSubtree: "public/search_api"});

    this.siteHash = yield this.LoadAsset("public/asset_metadata");
  });

  @action.bound
  LoadAsset = flow(function * (linkPath) {
    try {
      const versionHash = yield this.client.LinkTarget({...this.siteParams, linkPath});
      const associatedAssets = yield this.AssociatedAssets(versionHash);

      let assetInfo = yield this.client.ContentObjectMetadata({
        ...this.siteParams,
        metadataSubtree: linkPath,
        resolveLinks: true,
        resolveIncludeSource: true,
        resolveIgnoreErrors: true,
        select: [
          "allowed_offerings",
          "title",
          "display_title",
          "playlists",
          UUID(),
          ...(associatedAssets.map(asset => asset.name))
        ]
      });

      assetInfo = {
        ...assetInfo,
        assets: {},
        versionHash,
        associatedAssets
      };

      assetInfo.name = assetInfo.display_title || assetInfo.title;
      assetInfo.baseLinkUrl = yield this.client.LinkUrl({...this.siteParams, linkPath});

      yield Promise.all(
        assetInfo.associatedAssets.map(async asset => {
          assetInfo.assets[asset.name] = await this.LoadTitles(this.siteParams, UrlJoin(linkPath, asset.name), assetInfo[asset.name]);
        })
      );

      assetInfo.playlists = yield this.LoadPlaylists(this.siteParams, linkPath, assetInfo.playlists);

      this.assets[assetInfo.versionHash] = assetInfo;

      return assetInfo.versionHash;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load asset:", linkPath);
      // eslint-disable-next-line no-console
      console.error(error);

      this.rootStore.SetError("Error");
    }
  });

  async ImageLinks({baseLinkUrl, versionHash, images}) {
    images = images || {};

    let landscapeUrl, portraitUrl, imageUrl;
    if(images.landscape) {
      landscapeUrl = this.CreateLink(baseLinkUrl, UrlJoin("images", "landscape", "default"));
    } else if(images.main_slider_background_desktop) {
      landscapeUrl = this.CreateLink(baseLinkUrl, UrlJoin("images", "main_slider_background_desktop", "default"));
    }

    if(images.poster) {
      portraitUrl = this.CreateLink(baseLinkUrl, UrlJoin("images", "poster", "default"));
    } else if(images.primary_portrait) {
      portraitUrl = this.CreateLink(baseLinkUrl, UrlJoin("images", "primary_portrait", "default"));
    } else if(images.portrait) {
      portraitUrl = this.CreateLink(baseLinkUrl, UrlJoin("images", "portrait", "default"));
    }

    imageUrl = await this.client.ContentObjectImageUrl({versionHash});

    return {
      landscapeUrl,
      portraitUrl,
      imageUrl
    };
  }

  async LoadTitle(params, title, baseLinkPath) {
    if(title["."] && title["."].resolution_error) {
      return;
    }

    title.displayTitle = title.display_title || title.title || "";

    title.versionHash = title["."] ? title["."].source : params.versionHash;
    title.objectId = this.client.utils.DecodeVersionHash(title.versionHash).objectId;

    title.titleId = Id.next();

    title.baseLinkPath = baseLinkPath;
    title.playoutOptionsLinkPath = UrlJoin(title.baseLinkPath, "sources", "default");
    title.baseLinkUrl =
      await this.client.LinkUrl({...params, linkPath: title.baseLinkPath});

    Object.assign(title, await this.ImageLinks({baseLinkUrl: title.baseLinkUrl, versionHash: title.versionHash, images: title.images}));

    return title;
  }

  @action.bound
  LoadTitles = flow(function * (siteParams, metadataKey, titleInfo) {
    if(!titleInfo) { return []; }

    // Titles: {[index]: {[title-key]: { ...title }}
    let titles = [];
    yield Promise.all(
      Object.keys(titleInfo).map(async index => {
        try {
          const titleKey = Object.keys(titleInfo[index])[0];
          let title = titleInfo[index][titleKey];

          titles[index] = await this.LoadTitle(this.siteParams, title, UrlJoin(metadataKey, index, titleKey));
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to load title ${index}`);
          // eslint-disable-next-line no-console
          console.error(error);
        }
      })
    );

    return titles.filter(title => title);
  });

  @action.bound
  LoadPlaylists = flow(function * (siteParams, metadataKey, playlistInfo) {
    // Playlists: {[slug]: { order, name, list: {[title-slug]: { ... }}}

    if(!playlistInfo || Object.keys(playlistInfo).length === 0) { return []; }

    let playlists = [];
    yield Promise.all(
      Object.keys(playlistInfo).map(async playlistSlug => {
        try {
          const {name, order, list} = playlistInfo[playlistSlug];

          let titles = [];
          await Promise.all(
            Object.keys(list || {}).map(async titleSlug => {
              try {
                let title = list[titleSlug];

                titles[parseInt(title.order)] = await this.LoadTitle(
                  this.siteParams,
                  title,
                  UrlJoin(metadataKey, "playlists", playlistSlug, "list", titleSlug)
                );
              } catch (error) {
                // eslint-disable-next-line no-console
                console.error(`Failed to load title ${titleSlug} in playlist ${order} (${name})`);
                // eslint-disable-next-line no-console
                console.error(error);
              }
            })
          );

          playlists[parseInt(order)] = {
            playlistId: Id.next(),
            name,
            titles: titles.filter(title => title)
          };
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to load playlist ${playlistSlug}`);
          // eslint-disable-next-line no-console
          console.error(error);
        }
      })
    );

    return playlists.filter(playlist => playlist);
  });

  @action.bound
  LoadActiveTitleOffering = flow(function * (offering) {
    if(this.activeTitle.playoutOptions && this.activeTitle.playoutOptions[offering]) {
      this.activeTitle.currentOffering = offering;
    }

    let params, linkPath;
    if(this.activeTitle.isSearchResult) {
      params = { versionHash: this.activeTitle.versionHash };
    } else {
      params = this.siteParams;
      linkPath = this.activeTitle.playoutOptionsLinkPath;
    }

    try {
      const playoutOptions = yield this.client.PlayoutOptions({
        ...params,
        offering,
        linkPath,
        protocols: ["hls", "dash"],
        drms: ["aes-128", "widevine", "clear"]
      });

      this.activeTitle.playoutOptions = {
        ...(this.activeTitle.playoutOptions || {}),
        [offering]: playoutOptions
      };

      this.activeTitle.currentOffering = offering;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error loading playout options for offering " + offering);
      // eslint-disable-next-line no-console
      console.error(error);
    }
  });

  @action.bound
  SetActiveTitle = flow(function * (title) {
    this.activeTitle = title;

    this.activeTitle.metadata = yield this.client.ContentObjectMetadata({
      ...(this.siteParams),
      metadataSubtree: title.baseLinkPath,
      resolveLinks: true,
      resolveIncludeSource: true,
      resolveIgnoreErrors: true
    });

    let params, linkPath;
    if(this.activeTitle.isSearchResult) {
      params = { versionHash: this.activeTitle.versionHash };
    } else {
      params = this.siteParams;
      linkPath = this.activeTitle.playoutOptionsLinkPath;
    }

    let availableOfferings = yield this.client.AvailableOfferings({...params, linkPath});

    const allowedOfferings = this.siteInfo.allowed_offerings;

    if(allowedOfferings) {
      Object.keys(availableOfferings).map(offeringKey => {
        if(!allowedOfferings.includes(offeringKey)) {
          delete availableOfferings[offeringKey];
        }
      });
    }

    this.activeTitle.availableOfferings = availableOfferings;

    const initialOffering = availableOfferings.default ? "default" : Object.keys(availableOfferings)[0];
    if(initialOffering) {
      yield this.LoadActiveTitleOffering(initialOffering);
    }
  });

  @action.bound
  SearchTitles = flow(function * ({query}) {
    if(!this.searchIndex || !this.searchNodes) { return; }

    this.ClearActiveTitle();

    if(!query) { return; }

    const client = this.client;

    try {
      this.searchQuery = query;
      this.searching = true;
      this.searchCounter = this.searchCounter + 1;

      const indexHash = yield client.LatestVersionHash({
        objectId: this.searchIndex
      });

      yield client.SetNodes({
        fabricURIs: toJS(this.searchNodes)
      });

      let url;
      try {
        url = yield client.Rep({
          versionHash: indexHash,
          rep: "search",
          queryParams: {
            terms: query,
            select: "public/asset_metadata"
          },
          noAuth: true
        });
      } finally {
        yield client.ResetRegion();
      }

      const results = ((yield client.Request({
        url,
      })).results || []);

      this.searchResults = (yield Promise.all(
        results.map(async ({id, hash, meta}) => {
          try {
            meta = ((meta || {}).public || {}).asset_metadata || {};
            let title = await this.LoadTitle({versionHash: hash}, meta, "public/asset_metadata");
            title.isSearchResult = true;

            return title;
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Error loading search result:", id, hash);
            // eslint-disable-next-line no-console
            console.error(error);
          }
        })
      )).filter(result => result);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error performing site search:");
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      this.searchCounter = this.searchCounter - 1;

      // Only clear searching flag if no other searches are ongoing
      if(this.searchCounter === 0) {
        this.searching = false;
      }
    }
  });

  @action.bound
  ClearSearch = flow(function * () {
    while(this.searchCounter > 0) {
      yield new Promise(resolve => setTimeout(resolve, 500));
    }

    this.searchQuery = "";
    this.searching = false;
  });

  @action.bound
  ClearActiveTitle() {
    this.activeTitle = undefined;
  }

  @action.bound
  CreateLink(baseLink, path, query={}) {
    if(!baseLink) { return ""; }

    const basePath = URI(baseLink).path();

    return URI(baseLink)
      .path(UrlJoin(basePath, path))
      .addQuery(query)
      .toString();
  }
}

export default SiteStore;
