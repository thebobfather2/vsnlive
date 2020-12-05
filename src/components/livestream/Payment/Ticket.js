import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import {inject, observer} from "mobx-react";
import axios from "axios";

import concertPoster from "../../../static/images/ritaora/ro3.jpg";
import Timer from "./Timer";
import { FaRegCalendarAlt, FaRegClock} from "react-icons/fa";
import { IconContext } from "react-icons";

@inject("rootStore")
@inject("siteStore")
@observer
class Ticket extends React.Component {

  // Calling Server-Side Code to generate Checkout Session
  handleClick = async (event) => {
    event.preventDefault();
    const stripe = await loadStripe("pk_test_51HpRJ7E0yLQ1pYr6m8Di1EfiigEZUSIt3ruOmtXukoEe0goAs7ZMfNoYQO3ormdETjY6FqlkziErPYWVWGnKL5e800UYf7aGp6");

    let priceID = this.props.priceID;
    let prodID = this.props.prodID;
    try {
      const response = await axios.post(
        `https://rocky-peak-15236.herokuapp.com/stripe-create-session`,
        {
          priceID: priceID,
          qty: 1,
          cancel_url:`${window.location.href.substring(0, window.location.href.lastIndexOf("#") + 2)}rita-ora/d457a576`, 
          success_url: `${window.location.href.substring(0, window.location.href.lastIndexOf("#") + 2)}d457a576/success/{CHECKOUT_SESSION_ID}`, 
          client_reference_id: prodID
        }
      );
      console.log("Stripe Post | data", response.data.success);
      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.id,
      });
  
      if (error) {
        console.error("Failed to handleSubmit for Stripe:");
        console.error(error);
      }
    } catch (error) {
      console.log("CheckoutForm.js 28 | ", error);
    }
  };

  // Client-Only Integration of Stripe Checkout Session 
  handleSubmit = (priceID, prodID) => async event => {
    event.preventDefault();
    const stripe = await loadStripe("pk_test_51HpRJ7E0yLQ1pYr6m8Di1EfiigEZUSIt3ruOmtXukoEe0goAs7ZMfNoYQO3ormdETjY6FqlkziErPYWVWGnKL5e800UYf7aGp6");
    const { error } = await stripe.redirectToCheckout({
      mode: "payment",
      lineItems: [{ price: priceID, quantity: 1 }],
      successUrl: `${window.location.href.substring(0, window.location.href.lastIndexOf("#") + 2)}d457a576/success/{CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.href.substring(0, window.location.href.lastIndexOf("#") + 2)}rita-ora/d457a576`,
      clientReferenceId: prodID
    });
    if (error) {
      console.error("Failed to handleSubmit for Stripe:");
      console.error(error);
    }
  }

  render() {
    let name = this.props.name;
    let description = this.props.description;
    let price = this.props.price;
    let priceID = this.props.priceID;
    let prodID = this.props.prodID;
    let date = this.props.date;

    return (
      <div className="ticket-event">
        <div className="ticket-image">
          <img src={concertPoster} className="ticket-image-img"/>
        </div>
        <div className="ticket-detail">
          <div className="ticket-top">
            <div className="ticket-top-labels"> 
              <span className="ticket-label-loc">
                Global
              </span>
              <span className="ticket-label-available">
                LIMITED TICKETS AVAILABLE
              </span>

            </div>
            <h3 className="ticket-top-title">
              {name}
            </h3>
            <p className="ticket-top-description">
              {description}
            </p>

          </div>
          <div className="ticket-bottom">
            <div className="ticket-bottom-info">
              <div className="ticket-bottom-price">
                {price}
              </div>

              <IconContext.Provider value={{ className: 'ticket-icon' }}>
                <div className="ticket-bottom-date">
                  <FaRegCalendarAlt />
                  <span className="ticket-bottom-date">
                    {date}
                  </span>
                </div>
              </IconContext.Provider>
              
              <div className="ticket-bottom-countdown">
              <Timer classProp="ticket-icon" premiereTime="January 28, 2021 20:00:00"/>
              </div>
            </div>
            <button className="ticket-bottom-button" role="link" onClick={this.handleSubmit(priceID, prodID)}>
              Buy Ticket
            </button>
            {/* <button className="ticket-bottom-button" role="link" onClick={this.handleClick}>
              Buy Ticket
            </button> */}
          </div>
        </div>
      </div>
    );
  }
}

export default Ticket;