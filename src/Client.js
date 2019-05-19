import React from "react";
import { Value, Editor as Controller } from "slate";
import { Editor } from "slate-react";
import io from "socket.io-client";
import renderAnnotation, { ANNOTATION_TYPES } from "./slate/renderAnnotation";
import uuid from "./utils/uuid";
import transform from "./transform";

const SUPPORTED_OPERATION_TYPES = ["insert_text", "remove_text"];

/** Class representing a collaboration client. */
class Client extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: null,
      syncing: false,
      isAwaiting: false
    };
    this.editor = null;
    this.socket = null;
    this.buffer = [];
    this.flush = [];
    this.lastServerChange = null;
  }

  /** When client mounts, initialize socket connection. */
  componentDidMount() {
    this.socket = io(`localhost:5000`);
    console.log("Client socket connected: ", this.socket);
    this.socket.on("value:change", this.onChangeFromServer);
    this.socket.on("value:initialize", this.onInitialize);
    this.socket.on("client:disconnect", this.onClientDisconnect);
    this.socket.on("client:connection", this.onClientConnection);
  }

  onInitialize = ({ id, value: valueJSON, annotations }) => {
    console.log("Initialize with: ", { id, valueJSON, annotations });
    const value = Value.create(valueJSON);
    this.lastServerChange = { value, id };
    this.setState({ value }, () => {
      this.updateAnnotations(annotations);
    });
  };

  onChangeFromServer = serverChange => {
    const {
      id,
      changeId,
      value: serverValue,
      operations: serverOperations = [],
      annotations: serverAnnotations = [],
      atEase = false
    } = serverChange;
    const lastSentChange = this.getLastChange();

    if (!this.state.isAwaiting) {
      console.log(
        "[At Ease] Server is sending a change from another client while this client is idle",
        serverChange
      );
      // Client is in sync, just apply change
      this.syncEditor(() => {
        this.applyOperations(serverOperations);
        this.updateAnnotations(serverAnnotations);
      });
      this.lastServerChange = { value: serverValue, id };
      return;
    }

    const isAcknowledgment = changeId === lastSentChange.id;
    if (isAcknowledgment) {
      // Server is acknowledging this client's last sent operation

      if (!this.buffer.length) {
        console.log(
          "[At Ease] Server is acknowledging this client's last sent operation while this client is idle",
          serverChange
        );
        // Client is in sync
        this.lastServerChange = { value: serverValue, id };
        this.setState({ isAwaiting: false });
        return;
      }

      if (atEase) {
        console.log(
          "[At Ease] Server is acknowledging this client's last sent operation while this client is waiting.",
          serverChange,
          "\n",
          this.buffer,
          this.getBufferedOperations()
        );
        // Client is operating in sync with the server, no OT necessary, just send buffered change
        this.lastServerChange = { value: serverValue, id };
        this.emitChange(
          this.getChange({ operations: this.getBufferedOperations() })
        );
        this.buffer = [];
        return;
      }

      console.log(
        "[OT] Server is acknowledging this client's last sent operation while this client is waiting.",
        serverChange
      );

      // Server has made other edits while we were waiting for acknowledgment.
      // Transform buffered operations for the new server state
      const [clientChangeT, serverChangeT] = transform(
        {
          newValue: this.editor.value.toJSON(),
          operations: this.getBufferedOperations(),
          prevValue: this.lastServerChange.value
        },
        {
          newValue: serverValue,
          operations: serverOperations,
          prevValue: this.lastServerChange.value
        }
      );

      this.lastServerChange = { value: serverValue, id };
      this.emitChange(this.getChange({ operations: clientChangeT.operations }));
      this.buffer = [];
      return;
    }

    console.log(
      "[OT] Server is sending a change from another client while this client is waiting",
      serverChange
    );

    const [lastSentChangeT, serverChangeT] = transform(
      lastSentChange,
      serverChange
    );
    lastSentChange.operationsT = lastSentChangeT.operations;

    this.syncEditor(() => {
      this.applyOperations(serverChangeT.operations);
      this.lastServerChange = { value: serverValue, id };
      this.updateAnnotations(serverAnnotations);
    });
  };

  getBufferedOperations = () => {
    console.log("getBufferedOperations", this.buffer);
    const operations = this.buffer.reduce(
      (ops, ch) => ops.concat(ch.operations),
      []
    );
    console.log(operations);
    return operations;
  };

  /** Utility wrapper to ensure our change objects always have correct default props */
  getChange = ({
    id = uuid(8),
    historyId = this.lastServerChange.id,
    operations = this.getBufferedOperations(),
    value = this.editor.value
  } = {}) => {
    console.log("getChange ", operations);
    return {
      id,
      historyId,
      operations,
      // Send current selection as well so we can update annotations
      value: value.toJSON({ preserveSelection: true })
    };
  };

  onChangeForServer = ({ operations, value }) => {
    const valueOperations = operations
      .filter(o => SUPPORTED_OPERATION_TYPES.some(type => type === o.type))
      .toJS(); // Operations are an Immutable.List

    if (!valueOperations.length) {
      this.emitSelection();
      return;
    }

    const change = this.getChange({ operations: valueOperations, value });

    if (this.state.isAwaiting) {
      console.log("buffering", change);
      this.buffer.push(change);
    } else {
      console.log("onChangeForServer", change);
      this.emitChange(change);
    }
  };

  emitChange = change => {
    console.log("Sending change to server: ", change);
    this.setState({ isAwaiting: true }, () => {
      console.log("Sending change to server isAwaiting");
      this.flush.push(change);
      this.socket.emit("value:change", change);
    });
  };

  emitSelection = () => {
    this.socket.emit("client:selection", this.editor.value.selection.toJSON());
  };

  getLastChange = () => {
    return this.flush[this.flush.length - 1];
  };

  applyOperations = operations => {
    if (operations.length) {
      this.editor.withoutSaving(() => {
        operations.forEach(op => {
          this.editor.applyOperation(op);
        });
      });
    }
  };

  clearAnnotations = () => {
    this.editor.value.annotations.forEach(annotation => {
      if (annotation.type === ANNOTATION_TYPES.cursor) {
        this.editor.removeAnnotation(annotation);
      }
    });
  };

  updateAnnotations = (annotations, { clear = true } = {}) => {
    console.log("Updating annotations: ", annotations);
    const documentKey = this.editor.value.document.key;

    if (clear) {
      this.clearAnnotations();
    }

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
  };

  onClientConnection = annotation => {
    console.log("Updating annotation: ", annotation);
    this.syncEditor(() => {
      this.updateAnnotations([annotation], { clear: false });
    });
  };

  onClientDisconnect = key => {
    this.syncEditor(() => {
      this.editor.removeAnnotation({ key, type: ANNOTATION_TYPES.cursor });
    });
  };

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
      this.onChangeForServer(change);
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
