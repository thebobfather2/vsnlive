import React from "react";
import {observer} from "mobx-react";
import ImageIcon from "Common/ImageIcon";
import CloseIcon from "Icons/x";
import {ToggleZendesk} from "Utils/Misc";

@observer
class Modal extends React.Component {
  constructor(props) {
    super(props);

    this.Close = this.Close.bind(this);
  }

  Close(event) {
    if(event && (event.key || "").toLowerCase() !== "escape") { return; }

    document.removeEventListener("keydown", this.Close);
    document.body.style.overflowY = "auto";

    ToggleZendesk(true);

    this.props.Toggle(false);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.Close);
    document.body.style.overflowY = "hidden";

    ToggleZendesk(false);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.Close);
    document.body.style.overflowY = "auto";

    ToggleZendesk(true);
  }

  render() {
    return (
      <div className={`modal ${this.props.className || ""}`} onClick={() => this.Close()}>
        <ImageIcon
          key={"back-icon-Close Modal"}
          className={"modal__close-button"}
          title={"Close Modal"}
          icon={CloseIcon}
          onClick={() => this.Close()}
        />
        <div className="modal__content" onClick={event => event.stopPropagation()}>
          { this.props.content || this.props.children }
        </div>
      </div>
    );
  }
}

export default Modal;
