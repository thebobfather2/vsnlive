import React from "react";
import {inject, observer} from "mobx-react";
// import { Link } from "react-router-dom";
// import {ImageIcon} from "elv-components-js";
// import axios from "axios";
// import AsyncComponent from "../../support/AsyncComponent";
import {LoadingElement, onEnterPressed} from "elv-components-js";
import { loadStripe } from "@stripe/stripe-js";

import Navigation from "./Navigation";
import concertPoster from "../../static/images/ritaora/ro3.jpg";
import unicefImg from "../../static/images/ritaora/unicef.png";
import merchImg from "../../static/images/ritaora/merchFront.jpg";
import loreal from "../../static/images/sponsor/loreal.png";
import mercedes from "../../static/images/sponsor/mercedes.png";
import kerastase from "../../static/images/sponsor/keraAd.png";


@inject("rootStore")
@inject("siteStore")
@observer
class PaymentOverview extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      email: "",
      email_placeholder: "Email",
      donationChecked: false,
      merchChecked: false,
      merchSize: false
    };

  }


  render() {
    const handleEmailChange = (event) => {
      this.setState({email: event.target.value});
    }
    const handledDonationChange = () => {
      this.setState({donationChecked: !(this.state.donationChecked)})
    }
    const handledMerchChange = () => {
      this.setState({merchChecked: !(this.state.merchChecked)})
    }

    const handleSubmit = (priceID, prodID) => async event => {
      event.preventDefault();
      const stripe = await loadStripe("pk_test_51HpRJ7E0yLQ1pYr6m8Di1EfiigEZUSIt3ruOmtXukoEe0goAs7ZMfNoYQO3ormdETjY6FqlkziErPYWVWGnKL5e800UYf7aGp6");
      let totalItems = [
        { price: priceID, quantity: 1 }
      ];
      if (this.state.merchChecked) {
        totalItems.push({ price: "price_1HynknE0yLQ1pYr6q7F7B4iC", quantity: 1 });
      }
      if (this.state.donationChecked) {
        totalItems.push({ price: "price_1HyngME0yLQ1pYr6U9C3Vr8K", quantity: 1 });
      }
      
      const { error } = await stripe.redirectToCheckout({
        mode: "payment",
        lineItems: totalItems,
        successUrl: `${window.location.origin}/d457a576/success/{CHECKOUT_SESSION_ID}`, 
        cancelUrl: `${window.location.origin}/d457a576/rita-ora`, 
        clientReferenceId: prodID,
        shippingAddressCollection: {
          allowedCountries: ['US', 'CA'],
        },
        customerEmail: this.state.email

      });
      if (error) {
        console.error("Failed to handleSubmit for Stripe:");
        console.error(error);
      }
    }

    
    return (


        <div className="payment-container">
          {/* <div className="payment-event-overview">
            <div className="payment-inner-overview"> */}
              <div className="payment-info">
                <div className="payment-info-img-container">
                  <img src={concertPoster} className="payment-info-img" />
                </div>
                <span className="payment-info-artist">
                  Rita Ora Presents
                </span>
                <h3 className="payment-info-event">
                  RO3 Tour - Eiffel Tower 
                </h3>
                <p className="payment-info-date">
                  January 28th, 2021 - 6:00 PM - 7:30 PM PST
                </p>
                <p className="payment-info-description">
                  Rita Ora will be making history on January 28th with a global live stream from the legendary Paris landmark, the Eiffel Tower, to celebrate the release of her third studio album: RO3.
                </p>
                <div className="sponsor-container"> 
                  <span className="sponsor-title payment-info-artist">
                    Our Sponsors
                  </span>
                  <img src={loreal} className="big-sponsor-img" />
                  <div className="sponsor-img-container"> 
                    <img src={mercedes} className="sponsor-img1" />
                    <img src={kerastase} className="sponsor-img2" />
                  </div>
                </div>
              </div>
              
            {/* </div>

          </div> */}


          <div className="payment-checkout">

            {/* Currency and Quantity Selector */}
            {/* <div className="checkout-section">
              <div className="currency-quantity-container">
                <div className="currency-select">
                  Currency Select 
                </div>
                <div className="quantity-select">
                  Quantity Select 
                </div>
              </div>
            </div> */}

            {/* Donation Selector */}
            <div className="checkout-section">
              <div className="checkout-checkbox-container">
               <input
                    checked={this.state.donationChecked}
                    onChange={handledDonationChange}
                    className="checkout-checkbox-input"
                    id={`checkbox-merch`}
                    type="checkbox"
                  />
                <div className="checkout-checkbox-label">
                  <h5 className="checkout-checkbox-heading">
                    Unicef Donation
                  </h5>  
                  <span>
                    $5.00
                  </span>
                </div>
              </div>

              <div className="checkout-checkbox-bundle">
                <img src={unicefImg} className="checkout-checkbox-bundle-img" />
                <div className="checkout-checkbox-bundle-info">
                  <span className="checkout-checkbox-bundle-name">
                    Support Unicef
                  </span>  
                  <p className="checkout-checkbox-bundle-description">
                    Add a donation to help sponsor the Unicef, an organization we have partnered with this Holiday Season to provide humanitarian and developmental aid to children worldwide.
                  </p>  
                </div>
              </div>
            </div>

            {/* Merch Selector */}
            <div className="checkout-section">
              <div className="checkout-checkbox-container">
                <input
                    checked={this.state.merchChecked}
                    onChange={handledMerchChange}
                    className="checkout-checkbox-input"
                    id={`checkbox-merch`}
                    type="checkbox"
                  />
                <div className="checkout-checkbox-label">
                  <h5 className="checkout-checkbox-heading">
                   RO3 Tour Merchandise
                  </h5>  
                  <span>
                    $25.00
                  </span>
                </div>
              </div>

              <div className="checkout-checkbox-bundle">
                <img src={merchImg} className="checkout-checkbox-bundle-img" />
                <div className="checkout-checkbox-bundle-info">
                  <span className="checkout-checkbox-bundle-name">
                    RO3 Tour T-Shirt
                  </span>  
                  <p className="checkout-checkbox-bundle-description">
                   Rita Ora's 'RO3 Live Dream T-Shirt' features a hd print of 'Phoenix' logo on the front of a black washed unisex t-shirt. *all merch to ship following the event*
                  </p>  
                  {/* <div className="checkout-checkbox-bundle-size">
                    Size Selection
                  </div>   */}
                </div>
              </div>
            </div>

            {/* Email Form*/}
            <div className="checkout-section">
                <div className="checkout-email-form">
                  <input
                    onFocus={() => this.setState({email_placeholder: ""})}
                    onBlur={() => this.setState({email_placeholder: "Email"})}
                    placeholder={this.state.email_placeholder}
                    value={this.state.email}
                    onChange={handleEmailChange} 
                    // onKeyPress={onEnterPressed(Submit)}
                  />
                </div>
                <p className="checkout-email-info">
                  Please make sure that you entered your email address correctly as it will be used to send the digital ticket.
                </p>
            </div>

            {/* Stripe Checkout Redirect Button*/}
            <button className="checkout-button" role="link" onClick={handleSubmit(this.props.siteStore.priceId, this.props.siteStore.prodId)}>
              Continue to Payment
            </button>

          </div>
        </div>

      
    );
  }
}


export default PaymentOverview;