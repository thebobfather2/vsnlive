import React from "react";
import PropTypes from "prop-types";
import {inject, observer} from "mobx-react";
import {ImageIcon} from "elv-components-js";
import FallbackIcon from "../../static/icons/video.svg";

//SAME THING AS SwiperTitleIcon but with different OnPress
//TODO: Gonna merge this into SwiperTitleIcon 

@inject("rootStore")
@inject("siteStore")
@observer
class PlayTitleIcon extends React.Component {
  render() {

    //Getting metadata: thumbnail
    const title = this.props.title;

    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    const thumbnail = this.props.siteStore.CreateLink(
      title.landscapeUrl || title.imageUrl,
      "",
      { height: Math.max(150, Math.floor(vh / 3)) }
    );

    return (
      <React.Fragment>
        <div className={this.props.isPoster ? "swiper-slide swiper-slide__poster" : "swiper-slide"} onClick={() => {this.props.siteStore.PlayTitle(title); this.props.siteStore.OffModalTitle();}}>
          <ImageIcon
            className="swiper-slide__image"
            icon={thumbnail || FallbackIcon}
            alternateIcon={FallbackIcon}
          />
          <h3 className="swiper-slide__title"> { this.props.isEpisode === true ? `Episode ${this.props.episode + 1}: ${title.displayTitle}` : `Trailer: ${title.displayTitle}`}</h3>
        </div>
      </React.Fragment>
    );
  }
}

PlayTitleIcon.propTypes = {
  title: PropTypes.object.isRequired,
  visible: PropTypes.bool.isRequired
};

export default PlayTitleIcon;