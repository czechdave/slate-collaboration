const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const Value = require("../../slate/packages/slate").Value;

const INITIAL_VALUE = require("./initial-value.json");

app.get("/", function(req, res) {
  res.send("wha?");
});

let valueJSON = INITIAL_VALUE;

const clientsById = {};

function getClient(id) {
  return clientsById[id];
}

function setClient(client) {
  const { key } = client;

  clientsById[key] = {
    ...clientsById[key],
    ...client
  };

  return clientsById[key];
}

io.on("connection", function(socket) {
  console.log("A new client connected: ", socket.id);

  const clientsCount = Object.keys(clientsById).length;
  const annotation = setClient({
    key: socket.id,
    anchor: { offset: 0, path: [0, 0] },
    focus: { offset: 0, path: [0, 0] },
    data: {
      name: `User${clientsCount ? clientsCount : ""}`,
      // random color
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
    }
  });

  // Send initial welcome to the new client
  socket.emit("welcome", {
    value: valueJSON,
    annotation
  });

  function emitClients() {
    const annotations = Object.keys(clientsById).map(k => clientsById[k]);

    socket.broadcast.emit("client:update", { annotations });
  }

  // Tell others we have a new client
  emitClients();

  socket.on("client:change", change => {
    const { annotation } = change;
    setClient({
      ...annotation,
      key: socket.id
    });
    emitClients();
  });

  socket.on("value:change", change => {
    const { value, operations } = change;
    console.log("value:change", JSON.stringify(operations));
    if (value) valueJSON = value;
    socket.broadcast.emit("value:change", {
      change: { operations },
      id: socket.id
    });
  });

  socket.on("disconnect", function() {
    console.log("A client disconnected: ", socket.id);
    delete clientsById[socket.id];
  });
});

http.listen(3001, function() {
  console.log("listening on localhost:3001");
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
