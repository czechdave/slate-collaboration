const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const Value = require("../../slate/packages/slate").Value;

const INITIAL_VALUE = require("./initial-value.json");

app.get("/", function(req, res) {
  res.send("wha?");
});

let valueJSON = INITIAL_VALUE;

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

io.on("connection", function(socket) {
  console.log(
    "A client connected: ",
    socket.id,
    "\n current value: ",
    Value.create(valueJSON).document.text
  );
  socket.emit("welcome", "Hi! I'll be your server today :-)");

  // Send initial value to new client
  socket.emit("value:init", valueJSON);

  // Tell others we have a new client
  socket.broadcast.emit("newClient", {
    id: socket.id
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

  socket.on("client:change", change => {
    const { annotation } = change;
    socket.broadcast.emit("client:change", {
      annotation: {
        ...annotation,
        key: socket.id,
      }
    });
  });

  socket.on("disconnect", function() {
    console.log("A client disconnected: ", socket.id);
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
