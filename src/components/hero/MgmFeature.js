import React from "react";
import {inject, observer} from "mobx-react";
import styled from "styled-components";
import SubscriptionPayment from "../payment/SubscriptionPayment";
import {ImageIcon} from "elv-components-js";
import Logo from "../../static/images/meridianLogo.png";

@inject("rootStore")
@inject("siteStore")
@observer
class MgmFeature extends React.Component {
  preSubscribe() {
    return <SubscriptionPayment isNav={false} isFeature={true}/>;
  }

  afterSubscribe() {
    return (
      <button onClick={() => this.props.siteStore.PlayTitle(featuredTitle)} className={"btnPlay btnPlay__feature"}>
        {/* <PlayIcon className="modal__btn--icon" /> */}
        WATCH NOW
      </button>
    );
  }
  
  render() {    
    const featuredTitle = this.props.title;
    const titleInfo = featuredTitle.info || {};
    const synopsis = titleInfo.synopsis;
    const rating = "86%";
    const runtime = titleInfo.runtime;
    const release_date = titleInfo.release_date;

    const Maybe = (value, render) => value ? render() : null;

    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    
    const thumbnail = this.props.siteStore.CreateLink(
      featuredTitle.landscapeUrl || featuredTitle.imageUrl,
      "",
      { height: Math.max(150, Math.min(Math.floor(vh), Math.floor(vw))) }
    );

    

    const ImageContainer = styled.div`
      background-image: url(${thumbnail});
      margin-top: 7rem;
      background-size: cover;
      }
    `;

    const ColorContainer = styled.div`
      background: linear-gradient(90deg, ${this.props.backgroundColor} 50%, transparent);
      border-radius: 7px;
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: center;
      padding-left: 5rem;
      width: 70%;
      @media only screen and (max-height: 50em), screen and (max-width: 50em) {
        background: linear-gradient(90deg, ${this.props.backgroundColor} 70%, transparent);
        width: 80%;
      }
      
    }
    `;
    const backgroundStyle = {
      backgroundSize: "cover",
      marginTop: "7rem",
      // backgroundImage: `url(${thumbnail})`,
      // opacity: ".1"
    };
    
    return (
      <div
        style={backgroundStyle}
        className= "mgm-feature"
      >
        <div className="mgm-feature__container">
          {/* <h1 className="mgm-feature__title">
            {featuredTitle.displayTitle}
          </h1> */}
          <ImageIcon className="mgm-feature__titleIcon" icon={Logo} label="logo"/>

          {/* {Maybe(
            synopsis,
            () => <p className="mgm-feature__overview">{ synopsis }</p>
          )} */}
          <div className="mgm-feature__button">
            { this.props.siteStore.boughtSubscription ? this.afterSubscribe() : this.preSubscribe()}

            <button onClick={() => this.props.siteStore.SetModalTitle(featuredTitle)} className="btnDetails btnDetails__featureDetail">
                VIEW DETAILS
            </button>
          </div>

          
        </div>
        <div className="mgm-feature__image" >
          <img src={thumbnail} />
        </div>

        
      </div>

      // <div
      //   className= "box-feature"
      // >
      //   <ImageContainer />
      //   <ColorContainer>
      //     <h1 className="box-feature__title">
      //       {featuredTitle.displayTitle}
      //     </h1>
      //     <p className="box-feature__info">
      //       {Maybe(
      //         rating,
      //         () => <span className="box-feature__rating">Rating: { rating }</span>
      //       )}
      //       {Maybe(
      //         release_date,
      //         () => <span> | Release Date: { release_date }</span>
      //       )}
      //       {Maybe(
      //         runtime,
      //         () => <span> | Runtime: { runtime } minutes</span>
      //       )}
      //     </p>

      //     {Maybe(
      //       synopsis,
      //       () => <p className="box-feature__overview">{ synopsis }</p>
      //     )}
      //     <div className="box-feature__button">   
            
      //       { this.props.siteStore.boughtSubscription ? this.afterSubscribe() : this.preSubscribe()}

      //       <button onClick={() => this.props.siteStore.SetModalTitle(featuredTitle)} className="btnDetails btnDetails__feature">
      //           View Details
      //       </button>
      //     </div>
      //   </ColorContainer>
      // </div>
    );
  }
}

export default MgmFeature;