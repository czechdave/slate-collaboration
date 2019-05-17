import splitOperations from "../slate/utils/splitOperations";
import io from "socket.io-client";

const HOST = "192.168.0.52:3001";
let SOCKET;

export function initSocket() {
  SOCKET = io(HOST);
  return SOCKET;
}

export function notifyServer({ operations, value }) {
  const [valueOperations, selectionOperations] = splitOperations(
    operations
  );

  if (valueOperations.length) {
    console.log("socket send value:change ", valueOperations);
    SOCKET.emit("value:change", {
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
    SOCKET.emit("client:change", { annotation });
  }
}

export default SOCKET
