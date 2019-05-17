import { withHandlers } from "recompose";

const withRef = (refName, getRefName) => {
  return withHandlers(() => {
    let ref_ = null;

    return {
      [refName]: () => ref => (ref_ = ref),
      [getRefName]: () => () => ref_
    };
  });
};

export default withRef;
