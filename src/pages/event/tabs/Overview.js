import React from "react";
import {inject, observer} from "mobx-react";
import Ticket from "Event/tickets/Ticket";

@inject("rootStore")
@inject("siteStore")
@observer
class ConcertOverview extends React.Component {
  render() {
    return (
      <div className={"overview-container"} id="overview-container">
        <div className="ticket-group">
          {
            this.props.siteStore.ticketClasses.map((_, index) =>
              <Ticket ticketClassIndex={index} key={`ticket-class-${index}`} />
            )
          }
        </div>
      </div>
    );
  }
}

export default ConcertOverview;
