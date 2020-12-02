import React from "react";
import {inject, observer} from "mobx-react";
import concertPoster from "../../../static/images/ritaora/ro3.jpg";
import Tickets from "../../livestream/Payment/Tickets";

@inject("rootStore")
@inject("siteStore")
@observer
class ConcertOverview extends React.Component {

  render() {
    // let eventInfo = this.props.siteStore.eventAssets.get(this.props.title);
    // const featuredTitle = eventInfo.title;
    // let eventInfo = this.props.siteStore.eventAssets.get("rita-ora");;

    const Maybe = (value, render) => value ? render() : null;

    return (
      <div className={"overview-container"}>
        <div className="overview-container__eventInfo">
          <div className="overview-container__info">
            <div className="overview-container__info__title">
              <div>RO3 World Tour</div>
              <div className="overview-container__info__title__desc">{`Live Virtual Concert`}</div>
            </div>

            <div className="overview-container__info__synopsis">
              Rita Ora will be making history on January 28th with a global live stream from the legendary Paris landmark, the Eiffel Tower, to celebrate the release of her third studio album: RO3. Tickets and VIP packages for this historic streaming event are on sale now. 
            </div>
            <div className="overview-container__info__synopsis">
              The stream will feature a full production complete with a visual feast of lights and pyrotechnics, a stacked set list featuring all tracks from RO3, her top hits, a handful of covers, and a guest performance. A special pre-show will kick-off 1 hour before the event featuring exclusive interviews and behind-the-scenes footage.
            </div>
          </div>

          <div className="overview-container__photoGroup">
            <img
              src={concertPoster}
              className= "overview-container__photoGroup__singlePhoto"
            />     
          </div>
        </div>
        
        <Tickets />
      </div>
    );
  }
}

export default ConcertOverview;