import { useState } from "react";

const SIZE = 9;

function isValid(board, row, col, num) {
  for (let i = 0; i < SIZE; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }

  return true;
}

function solveSudoku(board) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] === "") {
        for (let num = 1; num <= 9; num++) {
          const n = String(num);
          if (isValid(board, row, col, n)) {
            board[row][col] = n;
            if (solveSudoku(board)) return true;
            board[row][col] = "";
          }
        }
        return false;
      }
    }
  }
  return true;
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [grid, setGrid] = useState(
    Array.from({ length: SIZE }, () => Array(SIZE).fill(""))
  );

  const handleChange = (r, c, val) => {
    if (!/^[1-9]?$/.test(val)) return;
    const next = grid.map(row => [...row]);
    next[r][c] = val;
    setGrid(next);
  };

  const handleSolve = () => {
    const copy = grid.map(r => [...r]);
    if (solveSudoku(copy)) setGrid(copy);
    else alert("No solution");
  };

  const handleClear = () => {
    setGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill("")));
  };

  return (
    <div
      className={[
        "min-h-screen w-screen flex items-center justify-center",
        dark ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900",
      ].join(" ")}
    >
      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">9x9 Sudoku Solver</h1>

        <button
          onClick={() => setDark(!dark)}
          className="mb-4 px-3 py-1 rounded border text-sm"
        >
          Toggle Dark Mode
        </button>

        <div
          className={[
            "grid grid-cols-9 gap-px p-px",
            dark ? "bg-gray-600" : "bg-gray-400",
          ].join(" ")}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <input
                key={`${r}-${c}`}
                value={cell}
                onChange={e => handleChange(r, c, e.target.value)}
                className={[
                  "w-10 h-10 text-center text-lg font-semibold outline-none",
                  dark ? "bg-gray-800 text-gray-100" : "bg-white",
                  (c + 1) % 3 === 0 && c !== 8
                    ? "border-r border-gray-500"
                    : "",
                  (r + 1) % 3 === 0 && r !== 8
                    ? "border-b border-gray-500"
                    : "",
                ].join(" ")}
              />
            ))
          )}
        </div>

        <div className="mt-4 flex gap-4">
          <button
            onClick={handleSolve}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Solve
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
