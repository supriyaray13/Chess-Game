const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app); // Link HTTP server to Express
const io = socket(server);

const chess = new Chess(); // Chess.js game instance
let players = {};
let currPlayer = "w"; // White plays first

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Serve the main page
app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
  console.log("Player connected:", uniquesocket.id);

  // Assign player roles (white, black, or spectator)
  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w"); // Assign white pieces
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b"); // Assign black pieces
  } else {
    uniquesocket.emit("spectatorRole"); // All other connections are spectators
    // Send the current board state to spectators
    uniquesocket.emit("boardState", chess.fen());
  }

  // Handle player disconnects
  uniquesocket.on("disconnect", function () {
    console.log("Player disconnected:", uniquesocket.id);
    if (uniquesocket.id === players.white) {
      delete players.white;
    } else if (uniquesocket.id === players.black) {
      delete players.black;
    }
  });

  // Handle player moves
  uniquesocket.on("move", (move) => {
    try {
      // Validate turn: White player should make white's move, black player for black's turn
      if (chess.turn() === "w" && uniquesocket.id !== players.white) {
        return uniquesocket.emit("notYourTurn", "It's white's turn!");
      }
      if (chess.turn() === "b" && uniquesocket.id !== players.black) {
        return uniquesocket.emit("notYourTurn", "It's black's turn!");
      }

      // Attempt the move
      const result = chess.move(move);
      if (result) {
        currPlayer = chess.turn(); // Update the current player
        io.emit("move", move); // Broadcast the move to all clients
        io.emit("boardState", chess.fen()); // Update board state for all clients
      } else {
        console.log("Invalid Move:", move);
        uniquesocket.emit("invalidMove", move); // Inform the player of an invalid move
      }
    } catch (err) {
      console.log(err);
      uniquesocket.emit("error", "Invalid move");
    }
  });
});

// Start the server
server.listen(8080, function () {
  console.log("Server is running on port 8080");
});
