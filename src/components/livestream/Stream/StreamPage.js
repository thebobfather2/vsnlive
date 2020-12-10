import React from 'react';
import clsx from 'clsx';

import {inject, observer} from "mobx-react";
import {Redirect} from "react-router";

import Drawer from '@material-ui/core/Drawer';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import { withStyles } from "@material-ui/core/styles";

import AsyncComponent from "../../support/AsyncComponent";
import LiveChat from "./LiveChat";
import Switch from "../../support/Switch";
import MultiView from "./MultiView";
import MultiViewJson from './example.json';
import ViewStream from "./ViewStream";
// import StreamTabs from './StreamTabs';

const drawerWidth = 450;

const styles = theme => ({
  root: {
    display: 'flex',
    background: "rgba(245, 239, 234, .8)",
    height: "100vh",
    overflow: "hidden"
  },
  appBar: {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    background: "transparent",
    height: "75px"
  },
  appBarShift: {
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: drawerWidth,
    background: "transparent",
    height: "75px"
  },
  title: {
    flexGrow: 1,
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    ...theme.mixins.toolbar,
    justifyContent: 'flex-start',
    height: "75px",
    minHeight: "56px"
  },
  content: {
    flexGrow: 1,
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginRight: -drawerWidth,
    height: "100vh"
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: 0,
    height: "100vh"
  },
});

@inject("rootStore")
@inject("siteStore")
@observer
class Stream extends React.Component {
  
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      name: "",
      openMultiView: false,
      openedView: undefined,
      openedGridSpecs: "",
      switchValue: false
    };
  }

  render() {
    if(!this.props.rootStore.client || (!this.props.rootStore.accessCode && !this.props.rootStore.chatClient)) {
      return <Redirect to={`/code`} />;
    }
  
    const handleDrawerOpen = () => {
      this.setState({open: true});
    };
  
    const handleDrawerClose = () => {
      this.setState({open: false});
    };

    const handleViewOpen = event => {
      this.setState({openMultiView: true, openedGridSpecs: event.currentTarget.style.gridArea,openedView: event.currentTarget.style});
      event.currentTarget.style.gridArea = '1 / 1 / span 3 / span 3';
      event.currentTarget.style.zIndex = '10';
      console.log('box clicked!');
    }

    const handleViewClose = () => {
      console.log(this.state.openedView)
      this.state.openedView.gridArea = this.state.openedGridSpecs;
      this.state.openedView.zIndex = '5';
      this.setState({openMultiView: false, openedGridSpecs: "",openedView: undefined});
      console.log('box closed!');
    }

    const { classes } = this.props;

    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    let vw = window.innerWidth * 0.01;
    document.documentElement.style.setProperty('--vw', `${vw}px`);

    const renderFeed = (switchValue) => {
      if (switchValue) {
        return <MultiView config={MultiViewJson} handleViewOpen={handleViewOpen} handleViewClose={handleViewClose} isOpen={this.state.openMultiView} />    
      }
      else {
        return (
          <div className="singleFeed">
            <ViewStream feedOption={0} classProp = "stream-video" mutedOption = {false} showControls = {true}/>
          </div>
        )
      }
    }


    return (
      <AsyncComponent
        Load={async () => {
          await this.props.siteStore.LoadStreamSite(this.props.match.params.siteId, "");
        }}
        render={() => {
          if(!this.props.siteStore.siteInfo) { return null; }

          return (
            <div className={classes.root}>
              <AppBar
                position="fixed"
                className={clsx(classes.appBar, {
                  [classes.appBarShift]: this.state.open,
                })}
              >
                <Toolbar>
                  <div className="stream-nav">
                    {/* <ImageIcon className="stream-nav__logo" icon={Logo} label="Eluvio" /> */}
                    <h1 className="stream-nav__title"> Eluvio Live </h1>
                    <div className="stream-nav__button-grp">

                      <div className="switch-container">
                      <span className="switch-text">
                          MultiView
                        </span>
                        <Switch
                          isOn={this.state.switchValue}
                          onColor="linear-gradient(160deg, #0610a1 7%,#4553ff 32.5%, #07c2e7 60%, #05d5ff  70%,#d694c6 95%)"
                          handleToggle={() => this.setState({switchValue: !(this.state.switchValue)})}
                        />
                      </div>

                      <div className="stream-nav__button-grp2">
                        <IconButton
                          color="inherit"
                          aria-label="open drawer"
                          edge="end"
                          onClick={handleDrawerOpen}
                          className={clsx(this.state.open && classes.hide)}
                          size="medium"
                        >
                          <MenuIcon style={{ color: "black" }} />
                        </IconButton>

                        <IconButton
                          color="inherit"
                          aria-label="close drawer"
                          edge="end"
                          onClick={handleDrawerClose}
                          className={clsx(!(this.state.open) && classes.hide)}
                          size="medium"
                        >
                          <ChevronRightIcon style={{ color: "black" }} />
                        </IconButton>
                      </div>
                    </div>
                  </div>            
                </Toolbar>
                
                </AppBar>
                <main
                  className={clsx(classes.content, {
                    [classes.contentShift]: this.state.open,
                  })}
                >
                  <div className={classes.drawerHeader} />

                  <div className="stream-container">
                    <div className="stream-container__streamBox">
                      {renderFeed(this.state.switchValue)}

                      <div className="stream-container__streamBox--info">
                        <h2 className="stream-container__streamBox--info__subtitle">
                          Rita Ora 
                        </h2>
                        <h1 className="stream-container__streamBox--info__title">
                          RO3 World Tour - Eiffel Tower
                        </h1>
                      </div> 
                    </div>
                  </div>

                </main>
                <Drawer
                  className={classes.drawer}
                  variant="persistent"
                  anchor="right"
                  open={this.state.open}
                  classes={{
                    paper: classes.drawerPaper,
                  }}
                >
                  <LiveChat />
                </Drawer>
              </div>
          );
        }}
      />
    );
  }
}

export default withStyles(styles, { withTheme: true })(Stream);