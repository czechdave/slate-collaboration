function splitOperations(operations) {
  const valueOperations = [];
  const selectionOperations = [];
  operations.forEach(op => {
    (op.type === "set_selection" ? selectionOperations : valueOperations).push(
      op
    );
  });
  return [valueOperations, selectionOperations];
}

export default splitOperations;
