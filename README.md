## Slate collaboration example

This repo shows a basic starting point for collaborative editor using Express, Socket.IO and Slate.

- Server code can be found at [/server/index.js](https://github.com/czechdave/slate-collaboration/blob/master/server/index.js)
- Client code can be found at [/src/Client.js](https://github.com/czechdave/slate-collaboration/blob/master/src/Client.js)

Running example: https://slate-collaboration.herokuapp.com/

### Current implementation issues

- This is only a naive initial setup without any conflict resolution so clients do get out of sync or crash if there's enough activity.

### Current Slate issues

##### Slate issues already fixed in a PR:
- Slate annotations bug https://github.com/ianstormtaylor/slate/pull/2797
- Slate annotations bug https://github.com/ianstormtaylor/slate/pull/2766
##### Slate issues without a fix:
- Annotations don't show at the start of a block node

### Available Scripts

In the project directory, you can run:

#### `npm run dev`

Runs the client app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

#### `npm run build`

Builds the app for production to the `build` folder.<br>

#### `npm run start`

Starts the socket.io server and serves files from `build` folder

---
This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
