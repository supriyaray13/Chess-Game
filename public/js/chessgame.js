const socket = io('http://localhost:8080'); // Adjust to match the server port

// Create a new chess game instance
const chess = new Chess(); // This initializes the board correctly

const boardEle = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null; // This will be assigned based on the player's color (white/black)

// Function to render the chessboard and pieces
const renderBoard = () => {
  const board = chess.board();
  boardEle.innerHTML = ""; // Clears the previous elements before adding new ones

  board.forEach((row, rowInx) => {
    row.forEach((square, sqInx) => {
      const sqEle = document.createElement("div");
      sqEle.classList.add(
        "square",
        (rowInx + sqInx) % 2 === 0 ? "light" : "dark" // Alternates between light and dark squares
      );

      sqEle.dataset.row = rowInx;
      sqEle.dataset.col = sqInx;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerHTML = getPieceUnicode(square.type); // Get the correct Unicode for the piece

        // Ensure pieces are draggable only for the current player
        pieceElement.draggable = (playerRole === square.color);

        // Drag start event
        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowInx, col: sqInx };
            e.dataTransfer.setData("text/plain", ""); // Required for dragging on some platforms
          }
        });

        // Drag end event
        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        sqEle.appendChild(pieceElement);
      }

      // Prevent default behavior for dragover to allow dropping
      sqEle.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      // Drop event to handle when a piece is dropped on a square
      sqEle.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSquare = {
            row: parseInt(sqEle.dataset.row),
            col: parseInt(sqEle.dataset.col),
          };
          handleMove(sourceSquare, targetSquare);
        }
      });

      boardEle.appendChild(sqEle);
    });
  });
};

// Function to handle a move
const handleMove = (source, target) => {
  const move = chess.move({
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`, // Convert to chess notation
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
  });

  if (move) {
    renderBoard(); // Re-render the board after a valid move
    socket.emit("move", move); // Emit the move to the server
  } else {
    console.error("Invalid move:", source, target); // Log invalid move attempts
  }
};

// Function to get the Unicode for the chess pieces
const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: "♟", // Black pawn
    r: "♜", // Black rook
    n: "♞", // Black knight
    b: "♝", // Black bishop
    q: "♛", // Black queen
    k: "♚", // Black king
    P: "♙", // White pawn
    R: "♖", // White rook
    N: "♘", // White knight
    B: "♗", // White bishop
    Q: "♕", // White queen
    K: "♔", // White king
  };

  return unicodePieces[piece] || ""; // Return the Unicode symbol for the piece
};

// Listen for the player's role from the server
socket.on("playerRole", (role) => {
  playerRole = role; // 'w' for white, 'b' for black
  renderBoard(); // Render the board after assigning the role
});

socket.on("spectatorRole", () => {
  playerRole = null;
  renderBoard();
}); 

socket.on("boardRole", (fen) => {
  chess.load(fen);
  renderBoard();
}); 

socket.on("move", (move) => {
  chess.move(move);
  renderBoard();
}); 

// Initial render of the chessboard
renderBoard();
