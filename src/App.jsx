import { useState } from "react";
import { scanSudokuFromImage } from "./scan/scanSudoku"

const SIZE = 9;

function isValid(board, row, col, num) {
  for (let i = 0; i < SIZE; i++) {
    if (i !== col && board[row][i] === num) return false;
    if (i !== row && board[i][col] === num) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === num) return false;
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

function computeCandidates(board) {
  return board.map((row, r) =>
    row.map((cell, c) => {
      if (cell !== "") return null;
      const possible = [];
      for (let num = 1; num <= 9; num++) {
        if (isValid(board, r, c, String(num))) {
          possible.push(num);
        }
      }
      return possible;
    })
  );
}

const emptyCandidates = () =>
  Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

export default function App() {
  const [dark, setDark] = useState(false);
  const [grid, setGrid] = useState(
    Array.from({ length: SIZE }, () => Array(SIZE).fill(""))
  );
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [candidates, setCandidates] = useState(emptyCandidates());
  const [hintMode, setHintMode] = useState("pencil"); // "pencil" | "list"

  const handleChange = (r, c, val) => {
    if (!/^[1-9]?$/.test(val)) return;
    const next = grid.map(row => [...row]);
    next[r][c] = val;
    setGrid(next);
    setCandidates(emptyCandidates());
  };

  const handleSolve = () => {
    const copy = grid.map(r => [...r]);

    if (!isInitialGridValid(copy)) {
      alert("Invalid puzzle configuration");
      return;
    }

    if (solveSudoku(copy)) {
      setGrid(copy);
      setCandidates(emptyCandidates());
    }
    else alert("No solution");
  };

  const handleClear = () => {
    setGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill("")));
    setCandidates(emptyCandidates());
  };

  const handleHint = () => {
    if (!isInitialGridValid(grid)) {
      alert("Invalid puzzle configuration");
      return;
    }
    setCandidates(computeCandidates(grid));
  };

  async function handleScanClick() {
    try {
      setIsScanning(true);
      setScanError(null);

      const file = await pickImageFromCameraOrGallery();
      if (!file) return;

      const canvas = await loadImageToCanvas(file);
      const detectedGrid = await scanSudokuFromImage(canvas);

      fillGridWithDetectedNumbers(detectedGrid);

    } catch (err) {
      console.error(err);
      setScanError("Failed to scan Sudoku puzzle.");
    } finally {
      setIsScanning(false);
    }
  }

  function pickImageFromCameraOrGallery() {
    return new Promise(resolve => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = false;
      
      input.onchange = (event) => {
        const file = event.target.files[0];
        resolve(file || null);
      };
      input.click();
    });
  }

  function loadImageToCanvas(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }

  function fillGridWithDetectedNumbers(detectedGrid) {
    setGrid(
      detectedGrid.map(row =>
        row.map(value => value != null ? String(value) : "")
      )
    );
    setCandidates(emptyCandidates());
  }

  function isInitialGridValid(board) {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const value = board[row][col];
        if (value !== "") {
          if (!isValid(board, row, col, value)) {
            return false;
          }
        }
      }
    }
    return true;
  }

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
            row.map((cell, c) => {
              const cellCandidates = candidates[r][c];
              const showCandidates = cell === "" && Array.isArray(cellCandidates);

              return (
                <div
                  key={`${r}-${c}`}
                  className={[
                    "w-10 h-10 flex items-center justify-center",
                    dark ? "bg-gray-800" : "bg-white",
                    (c + 1) % 3 === 0 && c !== 8 ? "border-r-2 border-gray-500" : "",
                    (r + 1) % 3 === 0 && r !== 8 ? "border-b-2 border-gray-500" : "",
                  ].join(" ")}
                >
                  {showCandidates ? (
                    hintMode === "pencil" ? (
                      <div className="grid grid-cols-3 w-full h-full p-px">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <span
                            key={n}
                            className={[
                              "flex items-center justify-center text-[7px] leading-none",
                              cellCandidates.includes(n)
                                ? (dark ? "text-blue-300" : "text-blue-600")
                                : "text-transparent",
                            ].join(" ")}
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className={[
                        "text-[7px] leading-tight text-center px-px break-all",
                        dark ? "text-blue-300" : "text-blue-600",
                      ].join(" ")}>
                        {cellCandidates.join(",")}
                      </span>
                    )
                  ) : (
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[1-9]*"
                      value={cell}
                      onChange={e => handleChange(r, c, e.target.value)}
                      className={[
                        "w-full h-full text-center text-lg font-semibold outline-none bg-transparent",
                        dark ? "text-gray-100" : "text-gray-900",
                      ].join(" ")}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex gap-4 flex-wrap justify-center">
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
          <button
            onClick={handleScanClick}
            disabled={isScanning}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            {isScanning ? "Scanning..." : "Scan"}
          </button>
        </div>
        <div className="mt-4 flex gap-4 flex-wrap justify-center">
          <button
            onClick={handleHint}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Hints
          </button>
          <div className="flex rounded border overflow-hidden text-sm">
            <button
              onClick={() => setHintMode("pencil")}
              title="Pencil marks"
              className={[
                "px-3 py-2",
                hintMode === "pencil"
                  ? "bg-green-600 text-white"
                  : dark ? "bg-gray-700 text-gray-300" : "bg-white text-gray-700",
              ].join(" ")}
            >
              ✏️
            </button>
            <button
              onClick={() => setHintMode("list")}
              title="List"
              className={[
                "px-3 py-2",
                hintMode === "list"
                  ? "bg-green-600 text-white"
                  : dark ? "bg-gray-700 text-gray-300" : "bg-white text-gray-700",
              ].join(" ")}
            >
              🔢
            </button>
          </div>
        </div>

        {scanError && (
          <p className="text-red-500 text-sm mt-2">{scanError}</p>
        )}
      </div>
    </div>
  );
}
