import React from "react";

export const ANNOTATION_TYPES = {
  cursor: "cursor"
};

const renderAnnotation = (props, editor, next) => {
  const { children, annotation, attributes } = props;
  const { type, data } = annotation;
  const { color, name } = data.toJS();

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
