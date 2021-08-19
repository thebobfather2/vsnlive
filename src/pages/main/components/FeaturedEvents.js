import React from "react";
import {inject, observer} from "mobx-react";
import UrlJoin from "url-join";

import ImageIcon from "Common/ImageIcon";

import LeftArrow from "Icons/left-arrow.svg";
import RightArrow from "Icons/right-arrow.svg";
import EluvioPlayer, {EluvioPlayerParameters} from "@eluvio/elv-player-js";

@inject("mainStore")
@inject("siteStore")
@observer
class FeaturedEvents extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selected: 0,
      previous: undefined
    };

    this.Event = this.Event.bind(this);
  }

  ChangePage(page) {
    page = page < 0 ? this.props.mainStore.featuredSites.length - 1 : page;

    if(this.state.player) {
      this.state.player.Destroy();
    }

    this.setState({
      selected: page % this.props.mainStore.featuredSites.length,
      previous: this.state.selected,
      player: undefined
    }, () => setTimeout(() => this.setState({previous: undefined}), 1500));
  }

  HeroVideo(site) {
    const heroVideo = site.info.event_images.hero_video;

    if(!heroVideo || !heroVideo["."]) { return; }

    return (
      (
        <div className="featured-event__hero-video-container">
          <div
            className="featured-event__hero-video"
            ref={element => {
              if(!element || this.state.player) { return; }

              this.setState({
                player: (
                  new EluvioPlayer(
                    element,
                    {
                      clientOptions: {
                        client: this.props.mainStore.rootStore.client
                      },
                      sourceOptions: {
                        playoutParameters: {
                          versionHash: heroVideo["."].source
                        }
                      },
                      playerOptions: {
                        watermark: EluvioPlayerParameters.watermark.OFF,
                        muted: EluvioPlayerParameters.muted.ON,
                        autoplay: EluvioPlayerParameters.autoplay.WHEN_VISIBLE,
                        controls: EluvioPlayerParameters.controls.OFF,
                      }
                    }
                  )
                )
              });
            }}
          />
        </div>
      )
    );
  }

  Event(site, index) {
    if(!site) { return; }

    const accessible = typeof site.info.state === "undefined"
      ? site.info.accessible :
      !["Inaccessible", "Live Ended"].includes(site.info.state);

    const header = site.info.event_info.feature_header || site.info.event_info.event_header;
    const subheader = site.info.event_info.date_subheader || site.info.event_info.date;
    return (
      <div
        className={`featured-event ${index === this.state.selected ? "featured-event-selected" : ""} ${index === this.state.previous ? "featured-event-fading-out" : ""}`}
        key={`featured-event-${index}`}
      >
        <div className="featured-event__hero-image-container">
          <img
            src={this.props.mainStore.FeaturedSiteImageUrl(site.siteSlug, "hero_background")}
            alt={header}
            className="featured-event__hero-image"
          />
        </div>
        { this.HeroVideo(site) }
        <div className="featured-event__details">
          <h2 className="featured-event__header">{ header }</h2>

          {
            site.info.event_info.hero_info ? null :
              <h3 className="featured-event__subheader">
                {subheader || "Streaming Soon"}
              </h3>
          }
          {
            accessible ?
              <a href={UrlJoin("/", site.tenantSlug || "", site.siteSlug)} className="featured-event__event-link">
                Buy Tickets
              </a> : null
          }
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="featured-events scroll-block" id="scroll-block-featured-events">
        <button
          className="arrow-left"
          onClick={() => this.ChangePage(this.state.selected - 1)}
        >
          <ImageIcon icon={LeftArrow} label="Previous" />
        </button>

        { this.props.siteStore.featuredSitesLoaded ? this.props.mainStore.featuredSites.map(this.Event) : null }
        <button
          className="arrow-right"
          onClick={() => this.ChangePage(this.state.selected + 1)}
        >
          <ImageIcon icon={RightArrow} label="Next" />
        </button>
      </div>
    );
  }
}

export default FeaturedEvents;
