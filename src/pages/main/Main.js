import React from "react";
import {inject, observer} from "mobx-react";

import Copy from "./copy/Copy.yaml";

@inject("siteStore")
@observer
class Main extends React.Component {
  render() {
    return (
      <div className="page-content__main">
        Main Page
      </div>
    );
  }
}

export default Main;
