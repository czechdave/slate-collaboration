const express = require("express");
const app = express();
const socketIO = require("socket.io");
const path = require("path");
const Slate = require("slate");
const Clients = require("./clients");
const transform = require("../src/transform");
const uuid = require("../src/utils/uuid");

const PORT = process.env.PORT || 5000;
const INITIAL_VALUE = require("./initial-value.json");

app.use(express.static(path.resolve(__dirname + "/../build")));

app.get("/", function(req, res) {
  res.sendFile(path.resolve(__dirname + "/../build/index.html"));
});

const server = app.listen(PORT, function() {
  console.log(`listening on ${PORT}`);
});

const io = socketIO(server);

const Editor = new Slate.Editor({
  value: Slate.Value.create(INITIAL_VALUE)
});

/** Initialize history */
const HISTORY = [
  {
    id: uuid(8),
    value: Editor.value.toJSON(),
    operations: []
  }
];

function getLatestHistoryEntry() {
  return HISTORY[HISTORY.length - 1];
}

function createNewHistoryEntry({ operations, changeId, atEase }) {
  const newHistoryEntry = {
    id: uuid(8),
    value: Editor.value.toJSON(),
    operations,
    changeId,
    atEase
  };
  HISTORY.push(newHistoryEntry);
  setTimeout(() => {
    io.emit("value:change", {
      ...newHistoryEntry,
      annotations: Clients.getAnnotations()
    });
  }, 2000);
}

io.on("connection", function(socket) {
  console.log("A new client connected: ", socket.id);

  // Send current value and current client annotations to the new client
  socket.emit("value:initialize", {
    ...getLatestHistoryEntry(),
    annotations: Clients.getAnnotations()
  });

  // Tell others we have a new client
  const annotation = Clients.setClient(socket.id);
  socket.broadcast.emit("client:connection", annotation);

  // Listen for client selection changes so we can update annotations
  socket.on("client:selection", selection => {
    const { anchor, focus } = selection;
    const annotation = Clients.setClient({ anchor, focus, key: socket.id });
    socket.broadcast.emit("client:connection", annotation);
  });

  socket.on("value:change", change => {
    const {
      id,
      historyId,
      value: clientValue,
      operations: clientOperations
    } = change;
    console.log("A new change: ", id, historyId, change.operations.length);
    const { selection } = clientValue;
    const { anchor, focus } = selection;
    const latestHistoryEntry = getLatestHistoryEntry();

    if (historyId === latestHistoryEntry.id) {
      console.log(`Applying change from synced client`);
      // Client is operating on the latest server value, just apply operations
      // and acknowledge new history entry.
      Editor.applyOperations(clientOperations);
      // Update client's selection annotation
      Clients.setClient({ anchor, focus, key: socket.id });
      createNewHistoryEntry({
        changeId: id,
        operations: clientOperations,
        atEase: true
      });
      return;
    }

    // Client is sending operations based of a history entry that is not current
    let commonHistory = latestHistoryEntry;
    let i = HISTORY.length - 2;
    while (i >= 0) {
      commonHistory = HISTORY[i];
      if (commonHistory.id === historyId) break;
      i--;
    }

    if (i === -1) {
      // Client sent us a change with id that the server doesn't know about
      console.log(
        `Illegal change sent by a client: ${socket.id}\n`,
        HISTORY,
        "\n",
        historyId
      );
    }

    console.log(`[OT] Applying change from client with old history`);
    const baseValue = Slate.Value.create(commonHistory.value);
    // Get operations that happened since the client last synced
    const serverOperations = HISTORY.slice(i + 1).reduce((acc, h) => {
      acc.push(h.operations);
      return acc;
    }, []);
    const serverChange = {
      newValue: latestHistoryEntry.value,
      operations: serverOperations,
      prevValue: baseValue
    };
    const clientChange = {
      newValue: clientValue,
      operations: clientOperations,
      prevValue: baseValue
    };

    const [serverChangeT, clientChangeT] = transform(
      serverChange,
      clientChange
    );

    // Apply transformed change and create new history entry
    Editor.applyOperations(clientChangeT.operations);
    // Update client's selection annotation
    // TODO: Update `anchor` and `focus` to match Editor.value
    Clients.setClient({ anchor, focus, key: socket.id });
    createNewHistoryEntry({
      changeId: id,
      operations: clientChangeT.operations
    });
  });

  socket.on("disconnect", function() {
    console.log("A client disconnected: ", socket.id);
    Clients.deleteClient(socket.id);
    io.emit("client:disconnect", socket.id);
  });
});

/*

// sending to sender-client only
socket.emit('message', "this is a test");

// sending to all clients, include sender
io.emit('message', "this is a test");

// sending to all clients except sender
socket.broadcast.emit('message', "this is a test");

// sending to all clients in 'game' room(channel) except sender
socket.broadcast.to('game').emit('message', 'nice game');

// sending to all clients in 'game' room(channel), include sender
io.in('game').emit('message', 'cool game');

// sending to sender client, only if they are in 'game' room(channel)
socket.to('game').emit('message', 'enjoy the game');

// sending to all clients in namespace 'myNamespace', include sender
io.of('myNamespace').emit('message', 'gg');

// sending to individual socketid
socket.broadcast.to(socketid).emit('message', 'for your eyes only');

*/
