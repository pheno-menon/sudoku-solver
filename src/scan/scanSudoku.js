import Tesseract from "tesseract.js";
import cv from "@techstark/opencv-js";

export async function scanSudokuFromImage(canvas) {

  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const thresh = new cv.Mat();

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(gray, blurred, new cv.Size(7, 7), 0);

  cv.adaptiveThreshold(
    blurred,
    thresh,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY_INV,
    11,
    2
  );

  const contour = findLargestSquareContour(thresh);
  if (!contour) throw new Error("Grid not found");

  const warped = warpToSquare(src, contour);
  const cells = extractCells(warped);

  const grid = await recognizeDigits(cells);

  cleanup([src, gray, blurred, thresh, warped, contour, ...cells]);

  return grid;
}

function findLargestSquareContour(thresh) {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let maxArea = 0;
  let best = null;

  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);
    const peri = cv.arcLength(cnt, true);

    const approx = new cv.Mat();
    cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

    if (area > maxArea && approx.rows === 4) {
      maxArea = area;
      best = approx;
    }
  }

  contours.delete();
  hierarchy.delete();
  return best;
}

function warpToSquare(src, contour) {
  const pts = contour.data32S;

  const points = [
    { x: pts[0], y: pts[1] },
    { x: pts[2], y: pts[3] },
    { x: pts[4], y: pts[5] },
    { x: pts[6], y: pts[7] }
  ];

  // Order points correctly
  const sum = points.map(p => p.x + p.y);
  const diff = points.map(p => p.y - p.x);

  const topLeft = points[sum.indexOf(Math.min(...sum))];
  const bottomRight = points[sum.indexOf(Math.max(...sum))];
  const topRight = points[diff.indexOf(Math.min(...diff))];
  const bottomLeft = points[diff.indexOf(Math.max(...diff))];

  const ordered = [topLeft, topRight, bottomLeft, bottomRight];

  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    ordered[0].x, ordered[0].y,
    ordered[1].x, ordered[1].y,
    ordered[2].x, ordered[2].y,
    ordered[3].x, ordered[3].y
  ]);

  const size = 450;

  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    size, 0,
    0, size,
    size, size
  ]);

  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  const dst = new cv.Mat();

  cv.warpPerspective(src, dst, M, new cv.Size(size, size));

  srcTri.delete();
  dstTri.delete();
  M.delete();

  return dst;
}

function extractCells(warped) {
  const cells = [];
  const cellSize = warped.rows / 9;

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const cell = warped.roi(
        new cv.Rect(
          x * cellSize + 8,
          y * cellSize + 8,
          cellSize - 16,
          cellSize - 16
        )
      );
      cells.push(cell);
    }
  }

  return cells;
}

async function recognizeDigits(cells) {
  const worker = await Tesseract.createWorker("eng");

  await worker.setParameters({
    tessedit_char_whitelist: "123456789",
  });

  const grid = Array.from({ length: 9 }, () => Array(9).fill(null));

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];

    // Convert to grayscale
    const gray = new cv.Mat();
    cv.cvtColor(cell, gray, cv.COLOR_RGBA2GRAY);

    // Apply threshold to isolate digits
    const thresh = new cv.Mat();
    cv.threshold(gray, thresh, 150, 255, cv.THRESH_BINARY_INV);

    const canvas = document.createElement("canvas");
    cv.imshow(canvas, thresh);

    const { data } = await worker.recognize(canvas);

    const digit = parseInt(data.text.trim(), 10);

    if (digit >= 1 && digit <= 9 && data.confidence > 60) {
      grid[Math.floor(i / 9)][i % 9] = digit;
    }

    gray.delete();
    thresh.delete();
  }

  await worker.terminate();
  return grid;
}

function cleanup(mats) {
  mats.forEach(m => m?.delete?.());
}