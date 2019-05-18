import React from "react";
import { Value } from "slate";
import { Editor } from "slate-react";
import io from "socket.io-client";
import renderAnnotation, { ANNOTATION_TYPES } from "./slate/renderAnnotation";

const HOST = "192.168.0.52:3001";

/** Class representing a collaboration client. */
class Client extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: null,
      syncing: false
    };
    this.editor = null;
    this.socket = null;
  }

  /** When client mounts, initialize socket connection. */
  componentDidMount() {
    this.socket = io(HOST);
    this.socket.on("change", this.onChangeServer);
  }

  onChangeServer = change => {
    const { value } = change;
    // If client has no value yet, initialize current server value
    if (!this.state.value) {
      this.setState({ value: Value.create(value) }, () => {
        this.applyServerChange(change);
      });
    } else {
      this.applyServerChange(change);
    }
  };

  /** Apply new operations and update annotations. */
  applyServerChange = ({ value, operations = [], annotations = [] }) => {
    const documentKey = this.editor.value.document.key;

    this.syncEditor(() => {
      // Apply operations
      if (operations.length) {
        this.editor.withoutSaving(() => {
          operations.forEach(op => {
            this.editor.applyOperation(op);
          });
        });
      }

      // Update all annotations
      this.editor.value.annotations.forEach(annotation => {
        if (annotation.type === ANNOTATION_TYPES.cursor) {
          this.editor.removeAnnotation(annotation)
        }
      });

      annotations.forEach(annotation => {
        // Skip this client's annotation
        if (annotation.key === this.socket.id) return;

        // Update the annotation key to match the client's document key
        annotation.anchor.key = documentKey;
        annotation.focus.key = documentKey;

        this.editor.addAnnotation({
          ...annotation,
          type: ANNOTATION_TYPES.cursor
        });
      });
    });
  };

  /** Send change to the server. */
  emitChange({ operations, value }) {
    this.socket.emit("change", {
      operations,
      // Send current selection as well so we can update annotations
      value: value.toJSON({ preserveSelection: true })
    });
  }

  editorRef = node => (this.editor = node);

  /** This wrapper allows us to update value without emitting to the server. */
  syncEditor = fn => {
    this.setState({ syncing: true }, fn);
  };

  onChange = change => {
    const { syncing } = this.state;
    const { value } = change;

    if (syncing) {
      this.setState({ value, syncing: false });
    } else {
      this.setState({ value });
      this.emitChange(change);
    }
  };

  render() {
    const { value } = this.state;
    return (
      <div className="Client">
        {value ? (
          <Editor
            value={value}
            onChange={this.onChange}
            ref={this.editorRef}
            renderAnnotation={renderAnnotation}
            className="Editor"
            placeholder="Type something together ..."
          />
        ) : (
          "Loading ..."
        )}
      </div>
    );
  }
}

export default Client;
