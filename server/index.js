const express = require("express");
const app = express();
const socketIO = require("socket.io");
const path = require("path");
const Clients = require("./clients");

const PORT = process.env.PORT || 5000;
const INITIAL_VALUE = require("./initial-value.json");
let valueJSON = INITIAL_VALUE;

app.use(express.static(path.resolve(__dirname + "/../build")));

app.get("/", function(req, res) {
  res.sendFile(path.resolve(__dirname + "/../build/index.html"));
});

const server = app.listen(PORT, function() {
  console.log(`listening on ${PORT}`);
});

const io = socketIO(server);

io.on("connection", function(socket) {
  console.log("A new client connected: ", socket.id);

  Clients.setClient(socket.id);

  const annotations = Clients.getAnnotations();

  // Send current value and current client annotations to the new client
  socket.emit("change", { value: valueJSON, annotations });

  // Tell others we have a new client
  socket.broadcast.emit("change", { annotations });

  socket.on("change", change => {
    const { value, operations } = change;
    const { document, selection } = value;

    // Store the latest value in memory so new clients get correct current value
    if (document) valueJSON = { document };

    // Update client's selection annotation
    const { anchor, focus } = selection;
    Clients.setClient({ anchor, focus, key: socket.id });

    socket.broadcast.emit("change", {
      value,
      operations: operations.filter(o => o.type !== "set_selection"),
      annotations: Clients.getAnnotations()
    });
  });

  socket.on("disconnect", function() {
    console.log("A client disconnected: ", socket.id);
    Clients.deleteClient(socket.id);
  });
});
