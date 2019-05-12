import React from "react";
import logo from "./logo.svg";
import { Value, Annotation } from "slate";
import { Editor } from "slate-react";
import { compose, lifecycle, withHandlers, withState } from "recompose";
import "./App.css";
import io from "socket.io-client";
import splitOperations from "./utils/splitOperations";

const CLIENT_ANNOTATION_TYPE = "cursor";

const schema = {
  annotations: {
    [CLIENT_ANNOTATION_TYPE]: {
      isAtomic: true
    }
  }
};

const renderAnnotation = (props, editor, next) => {
  console.log("renderAnnotation", props);
  const { children, annotation, attributes } = props;
  const { type, key } = annotation;
  const color = "yellow";

  switch (type) {
    case "cursor":
      return (
        <span
          {...attributes}
          style={{
            backgroundColor: color
          }}
        >
          {children}
          <span
            style={{
              backgroundColor: color,
              paddingRight: "2px",
              position: "relative"
            }}
          >
            <span
              style={{
                position: "absolute",
                bottom: "100%",
                left: "100%",
                color: color,
                fontSize: "5px"
              }}
            >
              {key}
            </span>
          </span>
        </span>
      );
    default:
      return next();
  }
};

const App = ({ value, onChange, editorRef, renderNode }) => {
  console.log("render");
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        {value ? (
          <Editor
            // schema={schema}
            value={value}
            onChange={onChange}
            ref={editorRef}
            renderAnnotation={renderAnnotation}
            renderNode={renderNode}
            renderMark={(props, editor, next) => {
              console.log("renderMark", props);
              return next();
            }}
            decorateNode={(props, editor, next) => {
              console.log("decorateNode", props);
              return next();
            }}
            renderBlock={(props, editor, next) => {
              console.log("renderBlock", props);
              return next();
            }}
            renderDecoration={(props, editor, next) => {
              console.log("renderDecoration", props);
              return next();
            }}
          />
        ) : (
          "Loading ..."
        )}
      </header>
    </div>
  );
};

const withRef = (refName, getRefName) => {
  return withHandlers(() => {
    let ref_ = null;

    return {
      [refName]: () => ref => (ref_ = ref),
      [getRefName]: () => () => ref_
    };
  });
};

export default compose(
  withState("value", "setValue", null),
  withState("syncing", "setSyncing", false),
  withState("socket", "setSocket"),
  withRef("editorRef", "getEditor"),
  withHandlers({
    onChange: ({
      setValue,
      value: currentValue,
      socket,
      syncing,
      setSyncing
    }) => change => {
      const { value, operations } = change;
      console.log(
        "onChange\n - syncing:",
        syncing,
        "\n - value: ",
        value.annotations.toJS()
      );

      setValue(value);

      if (syncing) {
        // TODO: queue incoming operations
        console.log("setSyncing false");
        setSyncing(false);
        return;
      }

      const [valueOperations, selectionOperations] = splitOperations(
        operations
      );

      if (valueOperations.length) {
        console.log("socket send value:change ", valueOperations);
        socket.emit("value:change", {
          operations: valueOperations,
          value
        });
      }

      if (selectionOperations.length) {
        const { anchor, focus } = value.selection;
        const annotation = {
          anchor,
          focus
        };
        console.log("socket send client:change ", anchor, focus);
        socket.emit("client:change", { annotation });
      }
    },
    withoutBroadcast: ({ setSyncing }) => fn => {
      setSyncing(true, fn);
    }
  }),
  lifecycle({
    componentDidMount() {
      console.log("mount");
      const { setSocket, setValue, getEditor, withoutBroadcast } = this.props;
      const socket = io("localhost:3001");

      setSocket(socket);

      socket.on("welcome", function(message) {
        console.log("welcome: ", message);
      });
      socket.on("value:init", value => {
        console.log("value:init ", Value.create(value).document.text);
        setValue(Value.create(value));
      });
      socket.on("newClient", ({ id }) => {
        const editor = getEditor();
        withoutBroadcast(() => {
          const key = editor.value.document.key;
          editor.withoutSaving(() => {
            editor.addAnnotation({
              type: CLIENT_ANNOTATION_TYPE,
              key: id,
              anchor: { offset: 0, path: [0, 0], key },
              focus: { offset: 0, path: [0, 0], key }
            });
          });
        });
      });

      socket.on("client:change", ({ annotation }) => {
        console.log("setAnnotation", annotation);
        const editor = getEditor();
        const key = editor.value.document.key;
        const { anchor, focus } = annotation;
        anchor.key = key;
        focus.key = key;
        withoutBroadcast(() => {
          editor.setAnnotation({
            ...annotation,
            type: CLIENT_ANNOTATION_TYPE
          });
        });
      });

      socket.on("value:change", function({ change, id }) {
        console.log("socket receive value:change", change);
        const { value, operations } = change;
        const editor = getEditor();

        console.log("setSyncing true");
        withoutBroadcast(() => {
          editor.withoutSaving(() => {
            operations.forEach(op => {
              console.log("applyOperation", op);
              editor.applyOperation(op);
            });
          });
        });
      });
    }
  })
)(App);
