// @flow
import React from "react";
import ReactDOM from "react-dom";

import { createPartitionURI, getPartitionRawIdFrom } from "~/valaa-core/tools/PartitionURI";

import Cog from "~/valaa-engine/Cog";
import Vrapper from "~/valaa-engine/Vrapper";

import * as InspireCSS from "~/valaa-inspire/ui/Inspire.css";
import ReactRoot from "~/valaa-inspire/ui/ReactRoot";

import { getGlobal } from "~/valaa-tools";

/**
 * This class is the view entry point
 */
export default class InspireView extends Cog {
  async initialize ({ name, container, rootId, size, rootPartitionURI }: Object) {
    try {
      if (!rootPartitionURI) {
        throw new Error(`No view ${name} options.rootPartitionURI found`);
      }
      // Load project
      const partitionURI = createPartitionURI(rootPartitionURI);
      this._rootConnection = await this.engine.prophet.acquirePartitionConnection(partitionURI);
      this._vUIRoot = await this.engine.getVrapper(getPartitionRawIdFrom(partitionURI));
      this.warnEvent(`initialize(): partition '${this._vUIRoot.get("name")}' UI root set:`,
          this._vUIRoot.debugId());
      // this.warn("\n\n");
      // this.warnEvent(`createView('${name}'): LISTING ENGINE RESOURCES`);
      // engine.outputStatus(this.getLogger());

      // Renderer
      this._createReactRoot(rootId, container, this._vUIRoot);
      this.engine.addCog(this);
      this.warnEvent(`initialize(): engine running and view connected to DOM (size`,
          size, `unused)`);
      return this;
    } catch (error) {
      throw this.wrapErrorEvent(error, `initialize('${name}' -> ${rootPartitionURI})`);
    }
  }

 /**
  * Creates the root UI component with the react context, and connects it to the html container.
  */
  _createReactRoot (rootId: string, container: Object, vUIRoot: Vrapper) {
    this._rootElement = document.createElement("DIV");
    this._rootElement.setAttribute("id", rootId);
    container.appendChild(this._rootElement);
    this._reactRoot = (<ReactRoot
      vUIRoot={vUIRoot}
      lensProperty={["ROOT_LENS", "LENS", "EDITOR_LENS", "EDITOR_UI_JSX"]}
      inspireCSS={InspireCSS}
    />);
    ReactDOM.render(this._reactRoot, this._rootElement);
  }

  _destroy () {
    // This is not called from anywhere as is...
    ReactDOM.unmountComponentAtNode(this._rootElement);
  }

  getSelfAsHead () {
    return this._vUIRoot.getSelfAsHead();
  }


  setAsActiveInspireView () {
    console.log("Setting active Inspire View to", this.name);
    this.pauseActiveInspireView();
    getGlobal().activeInspireView = this;
    if (this.getTimeDilation() < 0) {
      this.resumeActiveInspireView();
    }
  }

  play () {
    const currentDilation = this.getTimeDilation();
    if (currentDilation > 0.00001) {
      return;
    } else if (currentDilation < -0.00001) {
      this.resumeActiveInspireView();
    } else {
      this.setTimeDilation(1);
      this.start();
    }
  }

  stop () {
    this.pause();
  }

  pause () {
    const currentTimeDilation = this.engine.getTimeDilation();
    if (currentTimeDilation > 0) {
      this.engine.setTimeDilation(currentTimeDilation * -1);
    }
  }

  resume () {
    const currentTimeDilation = this.engine.getTimeDilation();
    if (currentTimeDilation < 0) {
      this.engine.setTimeDilation(currentTimeDilation * -1);
    }
  }

  toggleBulletTime (bulletTimeDilation) {
    const currentTimeDilation = this.engine.getTimeDilation();
    if (currentTimeDilation < 1) {
      console.log("Resuming full speed playback for engine", this.name,
          "from", currentTimeDilation);
      this.engine.setTimeDilation(1);
    } else {
      console.log("Bullet timing engine", this.name, "playback to", bulletTimeDilation);
      this.engine.setTimeDilation(bulletTimeDilation);
    }
  }
}
