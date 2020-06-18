import React from "react";
import HLSPlayer from "../../../node_modules/hls.js/dist/hls";
import DashJS from "dashjs";
import {inject, observer} from "mobx-react";
import {ImageIcon} from "elv-components-js";
import {DateTime} from "luxon";

import FallbackIcon from "../../static/icons/video.svg";

@inject("siteStore")
@observer
class ChannelSchedule extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      startIndex: props.currentIndex || 0,
      visible: 5
    };
  }

  ProgramIcon(program, index) {
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    const thumbnail = this.props.siteStore.CreateLink(
      this.props.siteStore.activeTitle.baseLinkUrl,
      `channel_info/schedule/daily_schedules/${this.props.date}/${index}/program_image/thumbnail`,
      { height: Math.floor(vh / 2) }
    );

    const visible = index >= this.state.startIndex
      && index < this.state.startIndex + this.state.visible;

    const startTime = DateTime.fromMillis(program.start_time_epoch).toLocaleString(DateTime.TIME_SIMPLE);

    return (
      <div
        key={`title-${index}-${program.title}`}
        className={`title ${visible ? "" : "hidden-title"}`}
      >
        <div className="ar-container">
          { index === this.props.currentIndex ? <div className="current-program-indicator" /> : null }
          <div className="title-vignette" />
          <ImageIcon
            className="title-image"
            icon={thumbnail}
            alternateIcon={FallbackIcon}
          />
        </div>
        <h4>{program.title} - {startTime}</h4>
      </div>
    );
  }

  render() {
    if(!this.props.schedule) { return null; }

    const showLeft = this.state.startIndex !== 0;
    const showRight = this.state.startIndex + this.state.visible < this.props.schedule.length;

    return (
      <div className="title-reel-container channel-schedule-reel">
        <h3 className="title-reel-header">Schedule</h3>
        <div className="title-reel">
          <div
            className={`reel-arrow reel-arrow-left ${showLeft ? "" : "hidden"}`}
            onClick={event => {
              event.stopPropagation();
              this.setState({startIndex: this.state.startIndex - 1});
            }}
          >
            ➢
          </div>

          <div className="title-reel-titles">
            { this.props.schedule.map((program, i) => this.ProgramIcon(program, i)) }
          </div>

          <div
            className={`reel-arrow reel-arrow-right ${showRight ? "" : "hidden"}`}
            onClick={event => {
              event.stopPropagation();
              this.setState({startIndex: this.state.startIndex + 1});
            }}
          >
            ➢
          </div>
        </div>
      </div>
    );
  }
}

@inject("siteStore")
@observer
class ActiveTitle extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showControls: false,
      activeTab: "Video",
      tabs: ["Video", "Details", "Metadata"]
    };

    this.InitializeVideo = this.InitializeVideo.bind(this);
  }

  componentWillMount() {
    window.scrollTo(0, 0);
  }

  componentWillUnmount() {
    this.DestroyPlayer();
  }

  DestroyPlayer() {
    if(this.player) {
      this.player.destroy ? this.player.destroy() : this.player.reset();
    }
  }

  Tabs() {
    return (
      <nav className="tabs">
        {
          this.state.tabs.map(tab =>
            <button
              key={`active-title-tab-${tab}`}
              className={tab === this.state.activeTab ? "active-tab" : ""}
              onClick={() => {
                this.setState({activeTab: tab});
                if(this.video) {
                  this.video.pause();
                }
              }}
            >
              { tab }
            </button>
          )
        }
      </nav>
    );
  }

  Schedule() {
    return {};

    // eslint-disable-next-line no-unreachable
    const channel = this.props.siteStore.activeTitle;
    const date = DateTime.local().toFormat("yyyyLLdd");

    if(!channel.channel_info || !channel.channel_info.schedule || !channel.channel_info.schedule.daily_schedules) {
      return { date };
    }

    const schedule = channel.channel_info.schedule.daily_schedules[date] || [];

    const now = DateTime.local().ts;
    const currentIndex = schedule.findIndex(program =>
      program.start_time_epoch <= now &&
      (program.start_time_epoch + program.duration_sec * 1000) >= now
    );

    return {
      schedule,
      currentIndex: currentIndex >= 0 ? currentIndex : undefined,
      date
    };
  }

  InitializeVideo(element) {
    if(!element) { return; }

    this.DestroyPlayer();

    try {
      element.addEventListener("canplay", () => this.setState({showControls: true}));

      const offering = this.props.siteStore.activeTitle.currentOffering;
      let playoutOptions = this.props.siteStore.activeTitle.playoutOptions;

      if(!offering || !playoutOptions || !playoutOptions[offering]) { return; }

      playoutOptions = playoutOptions[offering];

      let player;
      if(this.props.siteStore.dashSupported && playoutOptions.dash) {
        // DASH

        player = DashJS.MediaPlayer().create();

        const playoutUrl = (playoutOptions.dash.playoutMethods.widevine || playoutOptions.dash.playoutMethods.clear).playoutUrl;
        if(playoutOptions.dash.playoutMethods.widevine) {
          const widevineUrl = playoutOptions.dash.playoutMethods.widevine.drms.widevine.licenseServers[0];

          player.setProtectionData({
            "com.widevine.alpha": {
              "serverURL": widevineUrl
            }
          });
        }

        player.initialize(element, playoutUrl);
      } else {
        // HLS

        // Prefer AES playout
        const playoutUrl = (playoutOptions.hls.playoutMethods["aes-128"] || playoutOptions.hls.playoutMethods.clear).playoutUrl;

        if(!HLSPlayer.isSupported()) {
          element.src = playoutUrl;
          return;
        }

        const player = new HLSPlayer();
        player.loadSource(playoutUrl);
        player.attachMedia(element);
      }

      this.player = player;
      this.video = element;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  Offerings() {
    const availableOfferings = this.props.siteStore.activeTitle.availableOfferings;

    if(!availableOfferings || Object.keys(availableOfferings).length < 2) {
      return null;
    }

    return (
      <select
        className="active-title-offerings"
        onChange={event => this.props.siteStore.LoadActiveTitleOffering(event.target.value)}
      >
        {Object.keys(availableOfferings).map(offeringKey =>
          <option key={`offering-${offeringKey}`} value={offeringKey}>
            { availableOfferings[offeringKey].display_title || offeringKey }
          </option>
        )}
      </select>
    );
  }

  MetadataPage() {
    const title = this.props.siteStore.activeTitle;

    return (
      <div className={`active-title-metadata ${this.state.activeTab === "Metadata" ? "" : "hidden"}`}>
        <h2>{ title.displayTitle.toString() } - Metadata</h2>
        <div className="metadata-path">{title.isSearchResult ? "" : this.props.siteStore.currentSite.name + " - "}{title.baseLinkPath}</div>
        <pre>
          { JSON.stringify(title.metadata, null, 2)}
        </pre>
      </div>
    );
  }

  DetailsPage() {
    const title = this.props.siteStore.activeTitle;

    const titleInfo = title.info || {};

    const Maybe = (value, render) => value ? render() : null;

    return (
      <div className={`active-title-details-page ${this.state.activeTab === "Details" ? "" : "hidden"}`}>
        <ImageIcon icon={title.portraitUrl || title.imageUrl || title.landscapeUrl || FallbackIcon} alternateIcon={FallbackIcon} className="active-title-detail-image" title="Poster" />
        <div className="active-title-details">
          <h2>{ title.displayTitle.toString() }</h2>
          {Maybe(
            titleInfo.synopsis,
            () => <div className="synopsis">{ titleInfo.synopsis.toString() }</div>
          )}
          <div className="details-section">
            {Maybe(
              titleInfo.talent && titleInfo.talent.cast,
              () => <div className="detail">
                <label>Cast</label>
                { titleInfo.talent.cast.map(actor => `${actor.talent_first_name} ${actor.talent_last_name}`).join(", ") }
              </div>
            )}
            {Maybe(
              titleInfo.runtime,
              () => <div className="detail">
                <label>Runtime</label>
                { titleInfo.runtime } minutes
              </div>
            )}
            {Maybe(
              titleInfo.release_date,
              () => <div className="detail">
                <label>Release Date</label>
                { new Date(titleInfo.release_date).toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric"}) }
              </div>
            )}
            {Maybe(
              titleInfo.creator,
              () => <div className="detail">
                <label>Creator</label>
                { titleInfo.creator }
              </div>
            )}
          </div>
          {Maybe(
            titleInfo.copyright,
            () => <div className="copyright">
              { titleInfo.copyright.toString().startsWith("©") ? "" : "©" } { titleInfo.copyright.toString() }
            </div>
          )}
        </div>
      </div>
    );
  }

  VideoPage() {
    const { schedule, currentIndex, date } = this.Schedule();

    const title = this.props.siteStore.activeTitle;

    let displayTitle = title.displayTitle;
    let synopsis = (title.info || {}).synopsis || "";
    if(currentIndex !== undefined) {
      const program = schedule[currentIndex];
      displayTitle = program.title || displayTitle;
      synopsis = program.description !== undefined ? program.description : synopsis;
    }

    const poster = this.props.siteStore.activeTitle.landscapeUrl || this.props.siteStore.activeTitle.imageUrl;

    // Include poster image to pre-load it for details page
    return (
      <div className={`active-title-video-page ${this.state.activeTab === "Video" ? "" : "hidden"}`}>
        <ImageIcon icon={title.portraitUrl || title.imageUrl || title.landscapeUrl} className="hidden" />
        <video
          key={`active-title-video-${title.titleId}-${title.currentOffering}`}
          ref={this.InitializeVideo}
          autoPlay
          poster={poster}
          controls={this.state.showControls}
        />
        <div className="video-info">
          <h4>
            { displayTitle.toString() }
            { this.Offerings() }
          </h4>
          <div className="synopsis">
            { synopsis.toString() }
          </div>
          <ChannelSchedule
            schedule={schedule}
            date={date}
            currentIndex={currentIndex}
          />
        </div>
      </div>
    );
  }

  render() {
    if(!this.props.siteStore.activeTitle) { return null; }

    return (
      <div className="active-title">
        { this.Tabs() }
        { this.VideoPage() }
        { this.DetailsPage() }
        { this.MetadataPage() }
      </div>
    );
  }
}

export default ActiveTitle;