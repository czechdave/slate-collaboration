import React from "react";
import { Value } from "slate";
import { Editor } from "slate-react";
import { compose, lifecycle, withHandlers, withState } from "recompose";
import "./App.css";
import renderNode from "./slate/renderNode";
import renderAnnotation from "./slate/renderAnnotation";
import SCHEMA, { ANNOTATION_TYPES } from "./slate/schema";
import withRef from "./recompose/withRef";
import { notifyServer, initSocket } from "./socket";

const App = ({ value, onChange, editorRef }) => {
  console.log("render");
  return (
    <div className="App">
      {value ? (
        <Editor
          schema={SCHEMA}
          value={value}
          onChange={onChange}
          ref={editorRef}
          renderAnnotation={renderAnnotation}
          renderNode={renderNode}
          className="Editor"
        />
      ) : (
        "Loading ..."
      )}
    </div>
  );
};

export default compose(
  withState("value", "setValue", null),
  withState("syncing", "setSyncing", false),
  withRef("editorRef", "getEditor"),
  withHandlers({
    onChange: ({
      setValue,
      value: currentValue,
      syncing,
      setSyncing
    }) => change => {
      const { value, operations } = change;

      console.log(value.toJSON(), operations);

      setValue(value);

      if (syncing) {
        setSyncing(false);
        return;
      }

      notifyServer(change);
    },
    withoutBroadcast: ({ setSyncing }) => fn => {
      setSyncing(true, fn);
    }
  }),
  lifecycle({
    componentDidMount() {
      console.log("mount");
      const { setValue, getEditor, withoutBroadcast } = this.props;
      const socket = initSocket();
      let id;

      socket.on("welcome", function({ value, annotation }) {
        console.log("welcome ", annotation);
        id = annotation.key;
        setValue(Value.create(value));
      });

      socket.on("client:update", ({ annotations }) => {
        console.log("setAnnotations", annotations);
        const editor = getEditor();
        const key = editor.value.document.key;
        withoutBroadcast(() => {
          annotations.forEach(annotation => {
            if (annotation.key === id) return;
            const { anchor, focus } = annotation;
            anchor.key = key;
            focus.key = key;
            editor.setAnnotation({
              ...annotation,
              type: ANNOTATION_TYPES.cursor
            });
          });
        });
      });

      socket.on("value:change", function({ change, id }) {
        const { value, operations } = change;
        const editor = getEditor();

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
