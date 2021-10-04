import React, {lazy, Suspense} from "react";
import {render} from "react-dom";
import {inject, observer} from "mobx-react";

import EventTabs from "Event/tabs/EventTabs";
import Footer from "Layout/Footer";

import Modal from "Common/Modal";
import UpcomingEvents from "Common/UpcomingEvents";
import EluvioPlayer, {EluvioPlayerParameters} from "@eluvio/elv-player-js";
import ImageIcon from "Common/ImageIcon";
import UrlJoin from "url-join";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import {Link} from "react-router-dom";
import Countdown from "Common/Countdown";

const PromoPlayer = lazy(() => import("Event/PromoPlayer"));

@inject("rootStore")
@inject("siteStore")
@inject("cartStore")
@observer
class Event extends React.Component {
  constructor(props) {
    super(props);

    this.mobileCutoff = this.props.siteStore.eventInfo.hero_info ? 600 : 900;

    this.state = {
      showPromo: false,
      showGetStartedModal: false,
      tab: 0,
      heroBackground: null
    };
  }

  Branding() {
    const branding = this.props.siteStore.currentSiteInfo.branding || {};

    let info = {};
    Object.keys(branding).forEach(key => {
      let styles = {};
      Object.keys(branding[key] || {}).forEach(style => {
        if(style === "background_color") {
          styles.backgroundColor = branding[key].background_color.color;
        } else if(style === "text_color") {
          styles.color = branding[key].text_color.color;
        }
      });

      info[key] = {
        text: branding[key].text,
        styles
      };
    });

    return info;
  }

  Promos() {
    if(!this.state.showPromo) { return; }

    return (
      <Modal
        Toggle={show => this.setState({showPromo: show})}
        className="modal--promo-modal"
        content={
          <Suspense fallback={<div/>}>
            {this.props.siteStore.promos.length > 0 ? <PromoPlayer/>
              : <div className="error-message error-message-modal"> No Promos Available</div>
            }
          </Suspense>
        }
      />
    );
  }

  GetStartedModal() {
    if(!this.state.showGetStartedModal) { return null; }

    const messageInfo = this.props.siteStore.currentSiteInfo.event_info.modal_message_get_started;

    if(!messageInfo || !messageInfo.show) {
      this.props.rootStore.SetWalletPanelVisibility({visibility: "modal"});
      return;
    }
    
    return (
      <Modal
        className="event-message-container"
        Toggle={() => this.setState({showGetStartedModal: false})}
      >
        <div className="event-message">
          <div className={`event-message__content ${!messageInfo.message ? "no-padding" : ""}`}>
            {
              messageInfo.message ?
                <div
                  className="event-message__content__message"
                  ref={element => {
                    if(!element) { return; }

                    render(
                      <ReactMarkdown linkTarget="_blank" allowDangerousHtml>
                        {SanitizeHTML(messageInfo.message)}
                      </ReactMarkdown>,
                      element
                    );
                  }}
                /> : null
            }
            {
              !messageInfo.image ? null:
                <ImageIcon
                  className={`event-message__content__image ${!messageInfo.message ? "no-padding" : ""}`}
                  icon={this.props.siteStore.SiteUrl(UrlJoin("info", "event_info", "modal_message_get_started", "image"))}
                />
            }
          </div>
          <div className="event-message__actions">
            {
              !this.props.siteStore.nextDrop || this.props.siteStore.nextDrop.requires_login ?
                <button
                  onClick={() => {
                    this.props.rootStore.SetWalletPanelVisibility({visibility: "modal"});
                    this.setState({showGetStartedModal: false});
                  }}
                  className="event-message__button"
                >
                  { messageInfo.button_text || "Create Wallet" }
                </button> :
                <Link
                  to={this.props.siteStore.nextDrop.link}
                  className="event-message__button"
                  onClick={() => this.setState({showGetStartedModal: false})}
                >
                  { messageInfo.button_text || "Join the Drop" }
                </Link>
            }
          </div>
        </div>
      </Modal>
    );
  }

  ScrollToTickets() {
    this.setState({
      tab: 0,
    }, () => {
      const target = document.querySelector(".ticket-group") || document.querySelector("event-page__overview");
      window.scrollTo({top: target.getBoundingClientRect().top + window.pageYOffset - 80, behavior: "smooth"});
    });
  }

  Actions() {
    if(this.props.siteStore.isDropEvent) {
      const hasLoggedIn = (this.props.rootStore.walletLoggedIn || localStorage.getItem("hasLoggedIn"));

      const branding = this.Branding();
      return (
        <div className="event-page__buttons">
          {
            !hasLoggedIn ?
              <button
                style={(branding.get_started || {}).styles}
                className="btn btn--gold"
                onClick={() => this.setState({showGetStartedModal: true})}
              >
                { (branding.get_started || {}).text || "Get Started" }
              </button> : null
          }
          {
            hasLoggedIn && this.props.siteStore.nextDrop ?
              <Link
                style={(branding.join_drop || {}).styles}
                to={this.props.siteStore.nextDrop.link}
                className="btn btn--gold"
                onClick={() => this.setState({showGetStartedModal: true})}
              >
                { (branding.join_drop || {}).text || "Join the Drop" }
              </Link>
              : null
          }
          {
            this.props.siteStore.promos.length > 0 ?
              <button
                style={(branding.watch_promo || {}).styles}
                onClick={() => this.setState({showPromo: true})}
                className={`btn ${ this.props.rootStore.walletLoggedIn && !this.props.siteStore.nextDrop ? "btn--gold" : ""}`}
              >
                { (branding.watch_promo || {}).text || "Watch Promo" }
              </button> : null
          }
        </div>
      );
    }

    return (
      <div className="event-page__buttons">
        {
          // Ended
          this.props.siteStore.currentSiteInfo.state === "Live Ended" ||
          // Any tickets available for purchase
          !this.props.siteStore.ticketClasses.find(ticketClass => !ticketClass.hidden && (!ticketClass.release_date || ticketClass.release_date < new Date())) ?
            null :
            <button
              className={this.props.siteStore.promos.length > 0 ? "btn" : "btn btn--gold"}
              onClick={() => this.ScrollToTickets()}
            >
              Buy Tickets
            </button>
        }
        {
          this.props.siteStore.promos.length > 0 ?
            <button onClick={() => this.setState({showPromo: true})} className="btn btn--gold">
              Watch Promo
            </button> : null
        }
      </div>
    );
  }

  HeroVideo() {
    const heroVideo = this.props.siteStore.currentSiteInfo.event_images.hero_video;

    if(!heroVideo || !heroVideo["."]) { return; }

    return (
      (
        <div className="event-page__hero-video-container">
          <div
            className="event-page__hero-video"
            ref={element => {
              if(!element || this.state.player) { return; }

              this.setState({
                player: (
                  new EluvioPlayer(
                    element,
                    {
                      clientOptions: {
                        client: this.props.rootStore.client
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
                        playerCallback: ({videoElement}) => this.setState({video: videoElement})
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

  render() {
    const handleChange = (event, newValue) => {
      this.setState({tab: newValue});
    };

    const mobile = this.props.rootStore.pageWidth < this.mobileCutoff;
    const heroKey = mobile && this.props.siteStore.SiteHasImage("hero_background_mobile") ? "hero_background_mobile" : "hero_background";
    const headerKey = this.props.siteStore.darkMode ? "header_light" : "header_dark";
    const hasHeaderImage = this.props.siteStore.SiteHasImage(headerKey);

    let style = { height: window.innerHeight - (window.innerWidth < 1400 ? 60 : 0) };
    if(this.props.siteStore.eventInfo.hero_info && window.innerWidth > this.mobileCutoff) {
      style = {};
    }

    return (
      <div className={`page-container event-page ${this.props.siteStore.eventInfo.hero_info ? "event-page-no-header-info" : ""} ${mobile ? "event-page-mobile" : ""}`}>
        <div className="event-page__hero-container" style={style}>
          <div className="event-page__hero" style={{backgroundImage: `url(${this.props.siteStore.SiteImageUrl(heroKey)})`}} />
          { this.HeroVideo() }
          <div className="event-page__heading">
            {
              hasHeaderImage ?
                <div className="event-page__header-logo">
                  <img className="event-page_header-logo-image" src={this.props.siteStore.SiteImageUrl(headerKey)} alt={this.props.siteStore.eventInfo.event_header} />
                </div>
                : null
            }

            <h1 className={`event-page__header-name ${hasHeaderImage ? "hidden" : ""}`}>
              { this.props.siteStore.eventInfo.event_header }
            </h1>

            {
              this.props.siteStore.eventInfo.event_subheader ?
                <h2 className="event-page__subheader">{this.props.siteStore.eventInfo.event_subheader}</h2> : null
            }
            {
              this.props.siteStore.isDropEvent ?
                <h2 className="event-page__date-header">{this.props.siteStore.eventInfo.date_subheader}</h2> :
                this.props.siteStore.eventInfo.date ?
                  <h2 className="event-page__date">{this.props.siteStore.eventInfo.date}</h2> : null
            }
          </div>

          {
            this.props.siteStore.isDropEvent && this.props.siteStore.eventInfo.show_countdown && this.props.siteStore.nextDrop ?
              <Countdown
                time={this.props.siteStore.nextDrop.start_date}
                Render={({diff, countdown}) =>
                  diff > 0 ? <div className="event-page__countdown">Next drop in {countdown}</div> : null
                }
              /> : null
          }

          { this.Actions() }
        </div>

        {
          this.props.siteStore.isDropEvent ?
            <UpcomingEvents header="Upcoming Events" events={this.props.siteStore.upcomingDropEvents} /> :
            null
        }

        <div className="event-page__overview">
          <EventTabs title={null} tab={this.state.tab} handleChange={handleChange} type={"concert"} />
        </div>

        { this.state.showPromo ? this.Promos(): null}
        { this.state.showGetStartedModal ? this.GetStartedModal(): null}
        <Footer />
      </div>
    );
  }
}

export default Event;
