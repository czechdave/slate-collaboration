import React from "react";
import { BLOCK_TYPES } from "./schema";

const renderNode = (props, editor, next) => {
  console.log("renderAnnotation", props);
  const { children, node, attributes } = props;
  const { type } = node;

  switch (type) {
    case [BLOCK_TYPES.p]:
      return <p {...attributes}>{children}</p>;
    default:
      return next();
  }
};

export default renderNode;
