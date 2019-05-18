const clientsById = {};

function getRandomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`
}

function setClient(clientOrId) {
  let client;
  if (typeof clientOrId === "object") {
    client = clientOrId;
  } else {
    // Create new client.
    const clientsCount = Object.keys(clientsById).length;
    client = {
      key: clientOrId,
      anchor: { offset: 0, path: [0, 0] },
      focus: { offset: 0, path: [0, 0] },
      data: {
        name: `User${clientsCount || ""}`,
        color: getRandomColor()
      }
    };
  }

  const { key } = client;

  clientsById[key] = {
    ...(clientsById[key] || {}),
    ...client
  };

  return clientsById[key];
}

function getClient(id) {
  return clientsById[id];
}

function deleteClient(id) {
  return delete clientsById[id];
}

function getAnnotations() {
  return Object.keys(clientsById).map(getClient);
}

module.exports = {
  setClient,
  deleteClient,
  getAnnotations,
};
