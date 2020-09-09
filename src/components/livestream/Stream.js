import React from "react";
import {inject, observer} from "mobx-react";
import Logo from "../../static/images/Logo.png";
import {ImageIcon} from "elv-components-js";
import LiveChat from "./LiveChat";

@inject("rootStore")
@inject("siteStore")
@observer
class Stream extends React.Component {

  render() {

    return (
      <div className="live-container">
        {/* Stream */}
        <div className="stream-container">
          <div className="stream-container__streamBox">
            <div className="stream-container__streamBox--nav">
              <ImageIcon className="stream-container__streamBox--nav__container--logo" icon={Logo} label="Eluvio" />
            </div>

            <div className="stream-container__streamBox--video">
              Stream Video
            </div>

            <div className="stream-container__streamBox--info">
              Stream Info
            </div> 
          </div>
          <div className="stream-container__chat">
            <LiveChat /> 
          </div>
        </div>
      </div>
    );
  }
}

export default Stream;