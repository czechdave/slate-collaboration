import { Block } from "slate";

export const ANNOTATION_TYPES = {
  cursor: "cursor"
};

export const BLOCK_TYPES = {
  p: "paragraph"
};

const SCHEMA = {
/*  annotations: {
    [ANNOTATION_TYPES.cursor]: {
      //isAtomic: true
    }
  },*/
  /*document: {
    nodes: [
      {
        match: [{ type: BLOCK_TYPES.p, object: "block" }],
        min: 1
      }
    ],
    normalize: (editor, error) => {
      const { node, code } = error;
      switch (code) {
        case "child_required": {
          const paragraph = Block.create(BLOCK_TYPES.p);
          editor.insertNodeByKey(node.key, node.nodes.size, paragraph);
          break;
        }
        case "child_object_invalid": {
          editor.wrapBlockByKey(node.key, BLOCK_TYPES.p);
          break;
        }
        case "child_type_invalid": {
          editor.setNodeByKey(node.key, BLOCK_TYPES.p);
          break;
        }
        default:
      }
    }
  }*/
};

export default SCHEMA;
