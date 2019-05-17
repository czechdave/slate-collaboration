import React from "react";
import { ANNOTATION_TYPES } from "./schema";

const renderAnnotation = (props, editor, next) => {
  console.log("renderAnnotation", props);
  const { children, annotation, attributes } = props;
  const { type, key, data } = annotation;
  const { color, name } = data.toJS();

  console.log(data, color, name);

  switch (type) {
    case ANNOTATION_TYPES.cursor:
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
              {name}
            </span>
          </span>
        </span>
      );
    default:
      return next();
  }
};

export default renderAnnotation;
