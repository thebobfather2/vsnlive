import React from "react";
import {inject, observer} from "mobx-react";
import Ticket from "Event/payment/Ticket";
import SocialMediaBar from "Event/tabs/SocialMediaBar";

@inject("rootStore")
@inject("siteStore")
@observer
class ConcertOverview extends React.Component {
  render() {
    return (
      <div className={"overview-container"} id="overview-container">
        <SocialMediaBar />

        <div className="ticket-group">
          {
            this.props.siteStore.ticketClasses.map((ticketClass, index) =>
              <Ticket ticketClass={ticketClass} key={`ticket-class-${index}`} />
            )
          }
        </div>
      </div>
    );
  }
}

export default ConcertOverview;
