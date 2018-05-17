// @flow
import React from "react";
import * as DraftJS from "draft-js";

import "./Draft.css";

export default class DraftEditor extends React.Component {
  constructor (props: Object, context: Object) {
    super(props, context);
    this.componentWillReceiveProps(props);
    let editorState = DraftJS.EditorState.createEmpty();
    this.DraftJS = DraftJS;
    if (props.onInitializeEditorState) {
      editorState = props.onInitializeEditorState(editorState, this);
    }
    this.state = { editorState };
  }

  getEditorState = () => this.state.editorState;
  setEditorState = (editorState: Object) => this.setState({ editorState });

  componentWillReceiveProps (nextProps: Object) {
    if (nextProps.onReactRef) nextProps.onReactRef(this);
    this.boundProps = {};
    for (const [name, prop] of Object.entries(nextProps)) {
      if ((name === "onInitializeEditorState") || (name === "onChangeEditorState")
          || (name === "onReactRef")) continue;
      this.boundProps[name] = (typeof prop === "function") ? prop.bind(this) : prop;
    }
  }

  render () {
    const Editor = DraftJS.Editor;
    return (<Editor
      {...(this.boundProps || {})}
      editorState={this.state && this.state.editorState}
      onChange={this.onChange}
    />);
  }

  onChange = (editorStateInput: Object) => {
    const editorState = (this.props.onChangeEditorState
            && this.props.onChangeEditorState(editorStateInput, this))
        || editorStateInput;
    this.setState({ editorState });
  }
}
