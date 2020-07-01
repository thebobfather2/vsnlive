import React, { Component } from 'react'
import {inject, observer} from "mobx-react";

@inject("rootStore")
@inject("siteStore")
@observer
export default class Timer extends Component {
    state = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 20,
    }

    renderClock(days, hours, minutes, seconds) {
      return (
        <React.Fragment>
          <h1>Premiering in: </h1>
          <div id="clockdiv" >
            <div>
              <span className="days"> {days} </span>
              <div className="smalltext">Days</div>
            </div>
            <div>
              <span className="hours"> {hours} </span>
              <div className="smalltext">Hours</div>
            </div>
            <div>
              <span className="minutes"> {minutes}</span>
              <div className="smalltext">Minutes</div>
            </div>
            <div>
              <span className="seconds"> {seconds} </span>
              <div className="smalltext">Seconds</div>
            </div>
          </div>
        </React.Fragment>
      );
    }

    componentDidMount() {
      this.myInterval = setInterval(() => {
          const { seconds, minutes } = this.state

          if (seconds > 0) {
            this.setState(({ seconds }) => ({
              seconds: seconds - 1
            }))
          }
          if (seconds === 0) {
            if (minutes === 0) {
              clearInterval(this.myInterval)
              this.props.siteStore.setPremiereCountdown();
            } else {
              this.setState(({ minutes }) => ({
                minutes: minutes - 1,
                seconds: 59
            }))
          }
        } 
      }, 1000);
    };

    componentWillUnmount() {
      clearInterval(this.myInterval);
    };

    render() {
      const { days, hours, minutes, seconds } = this.state;
      return (
        <div className="hero-view-container__timer">
          { (days === 0 && hours === 0 && minutes === 0 && seconds === 0)
            ? <h1>Premiering Now!</h1>
            : this.renderClock(days, hours, minutes, seconds)
          }
        </div>
      );
    }
}