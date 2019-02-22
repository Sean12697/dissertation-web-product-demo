const signals = [
  [139, 144, 149, 153, 155, 155, 155, 155],
  [144, 151, 153, 156, 159, 156, 156, 156],
  [150, 155, 160, 163, 158, 156, 156, 156],
  [159, 161, 162, 160, 160, 159, 159, 159],
  [159, 160, 161, 162, 162, 155, 155, 155],
  [161, 161, 161, 161, 160, 157, 157, 157],
  [162, 162, 161, 163, 162, 157, 157, 157],
  [162, 162, 161, 161, 163, 158, 158, 158]
];

const defaulTable = [
  [16, 11, 10, 16, 34, 40, 51, 61],
  [12, 12, 14, 19, 26, 58, 60, 55],
  [14, 13, 16, 24, 40, 57, 69, 56],
  [14, 17, 22, 29, 51, 87, 80, 62],
  [18, 22, 37, 56, 68, 109, 103, 77],
  [24, 35, 55, 64, 81, 104, 113, 92],
  [49, 64, 78, 87, 103, 121, 120, 101],
  [72, 92, 95, 98, 112, 100, 103, 99]
];

let qtable = defaulTable;

// ----------------------- MAIN FUNCTIONS ------------------------

function fdct(signals) {
  var coef = dct([].concat.apply([], signals).map(v => v-128));
  return signals.map((line, i) => line.map((e, j) => coef[(i * line.length) + j]));
}

function idct(signals) {
  var coef = idct1d([].concat.apply([], signals)).map(v => v+128);
  return signals.map((line, i) => line.map((e, j) => Math.round(coef[(i * line.length) + j])));
}

function quantize(coef, table) {
  return coef.map((row, i) => row.map((e, j) => Math.round(e / table[i][j])))
}

function dequantize(coef, table) {
  return coef.map((row, i) => row.map((e, j) => Math.round(e * table[i][j])))
}

// ----------------------- 8x8 FUNCTIONS ------------------------

function encode(signals) {
  return quantize(fdct(signals), qtable);
}

function encodeWithTable(signals, qtable) {
  return quantize(fdct(signals), qtable);
}

function decode(quantized) {
  return idct(dequantize(quantized, qtable));
}

function decodeWithTable(quantized, qtable) {
  return idct(dequantize(quantized, qtable));
}

// ----------------------- IMAGE FUNCTIONS ------------------------

function encodeCanvasImage(canvas) {
  let width = canvas.width;
  let height = canvas.height;
  let ctx = canvas.getContext('2d');
  let stream = ctx.getImageData(0, 0, width, height).data;
  return encodeRGBA(streamToRGBArray(stream, width, height));
}

function streamToRGBArray(stream, width, height) {
  let rgba = [
      [],
      [],
      [],
      []
    ],
    rgbaCompressed = [
      [],
      [],
      [],
      []
    ];
  // Getting colour spaces in different arrays
  stream.forEach((pix, i) => rgba[i % 4].push(pix));
  // converting those 1d colour arrays to 2d arrays
  rgbaCompressed = rgbaCompressed.map(arr => make2DArray(height, width));
  rgba.forEach((carr, csi) => carr.forEach((pix, index) => rgbaCompressed[csi][Math.floor(index / width)].push(pix)));
  return rgbaCompressed.map(arr => arr.map(lines => lines.filter(el => el != null)));
}

function RGBArrayToStream(array) {
  let temp = new Array();
  array = array.map(colour => [].concat.apply([], colour));
  for (let i = 0; i < array.length * array[0].length; i++) temp.push(array[i % 4][Math.floor(i / 4)]);
  return temp;
}

function encodeRGBA(array) {
  if (!useColour) { // Decode in B&W
    array = advRGB(array);
    let applied = applyToArray(array[0], encode, array[0].length, array[0][0].length);
    return array.map((colourSpace, i) => (i != 3) ? applied : colourSpace);
  } else { // Decode in Colour
    return array.map(colourSpace => applyToArray(colourSpace, encode, array[0].length, array[0][0].length));
  }
}

function advRGB(rgbarray) {
  for (let i = 0; i < rgbarray[0].length; i++) {
    for (let j = 0; j < rgbarray[0][0].length; j++) {
      let sum = 0;
      for (let c = 0; c < 3; c++) sum += rgbarray[c][i][j];
      sum = sum / 3;
      for (let c = 0; c < 3; c++) rgbarray[c][i][j] = sum;
    }
  }
  return rgbarray;
}

function decodeRGBA(array) {
  if (!useColour) { // Decode in B&W
    let applied = applyToArray(array[0], decode, array[0].length, array[0][0].length);
    return array.map((colourSpace, i) => (i != 3) ? applied : colourSpace);
  } else { // Decode in Colour
    return array.map(colourSpace => applyToArray(colourSpace, decode, array[0].length, array[0][0].length));
  }
}

function applyToArray(array, func, width, height) {
  for (let i = 0; i < Math.floor(width / 8); i++) {
    for (let j = 0; j < Math.floor(height / 8); j++) {
      array = applyToArrayBlock(array, i * 8, j * 8, func, 8, 8)
    }
  }
  return array;
}

function applyToArrayBlock(array, x, y, func, xlen, ylen) {
  return setArrayBlock(array, func(getArrayBlock(array, x, y, xlen, ylen)), x, y, xlen, ylen);
}

function getArrayBlock(array, x, y, xlen, ylen) {
  let block = make2DArray(xlen, ylen);
  for (let i = x, xi = 0; i < x + xlen; i++, xi++) {
    for (let j = y, yj = 0; j < y + ylen; j++, yj++) {
      block[xi][yj] = array[i][j];
    }
  }
  return block;
}

function setArrayBlock(array, block, x, y, xlen, ylen) {
  for (let i = x, xi = 0; i < x + xlen; i++, xi++) {
    for (let j = y, yj = 0; j < y + ylen; j++, yj++) {
      array[i][j] = block[xi][yj];
    }
  }
  return array;
}

// -------------------------- COMPRESSION ---------------------------

function compressionRatio(encoded) {
  let length = encoded[0].length * encoded[0][0].length;
  let lengthAfterCompressed = compressedArraySize(encoded[0]);
  return [(100 - Math.round((lengthAfterCompressed / length) * 100)), lengthAfterCompressed, length];
}

function compressedRGBASize(array) {
  array = array.map(colourSpace => compressedArraySize(colourSpace));
  return array.reduce((a, b) => a + b, 0);
}

function compressedArraySize(array) {
  let size = 0;
  for (let i = 0; i < Math.floor(array.length / 8); i++) {
    for (let j = 0; j < Math.floor(array[0].length / 8); j++) {
      // each block
      let block = getArrayBlock(array, i * 8, j * 8, 8, 8);
      size += compressStream(flattern(block)).length;
    }
  }
  return size;
}

function compressStream(stream) { // if 0 and previous element was 0, do not keep
  return stream.filter((val, idx, arr) => (val == 0 && idx != 0) ? (arr[idx - 1] == 0) ? false : true : true);
}

function flattern(array) {
  return arrayToZigZag(array);
}

// ------------------------------- ZIG ZAG ------------------------------
// An assumption is they have the same height as in width

function arrayToZigZag(matrix) {
  let m = matrix.length,
    n = matrix[0].length,
    result = [],
    t = 0;

  for (let i = 0; i < n + m - 1; i++) {
    if (i % 2 == 1) {
      // down left
      let x = i < n ? 0 : i - n + 1;
      let y = i < n ? i : n - 1;
      while (x < m && y >= 0) {
        result[t++] = matrix[x++][y--];
      }
    } else {
      // up right
      let x = i < m ? i : m - 1;
      let y = i < m ? 0 : i - m + 1;
      while (x >= 0 && y < n) {
        result[t++] = matrix[x--][y++];
      }
    }
  }
  return result;
}

function zigZagToArray(vect) {
  let length = Math.sqrt(vect.length),
    matrix = make2DArray(length, length);
  let m = matrix.length,
    n = matrix[0].length,
    t = 0;

  for (let i = 0; i < n + m - 1; i++) {
    if (i % 2 == 1) {
      // down left
      let x = i < n ? 0 : i - n + 1;
      let y = i < n ? i : n - 1;
      while (x < m && y >= 0) {
        matrix[x++][y--] = vect[t++];
      }
    } else {
      // up right
      let x = i < m ? i : m - 1;
      let y = i < m ? 0 : i - m + 1;
      while (x >= 0 && y < n) {
        matrix[x--][y++] = vect[t++];
      }
    }
  }
  return matrix;
}

// ------------------------------- OTHERS -------------------------------

function formatBytes(a, b) {
  if (0 == a) return "0 Bytes";
  var c = 1024,
    d = b || 2,
    e = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    f = Math.floor(Math.log(a) / Math.log(c));
  return parseFloat((a / Math.pow(c, f)).toFixed(d)) + " " + e[f]
}

function make2DArray(a, b) {
  var arr = new Array(a);
  for (var i = 0; i < a; i++) arr[i] = new Array(b);
  return arr;
}

function dct(input) {
  var au, av, i, j, k, l, output, sum, u, v, val, x, y;
  output = [];
  for (v = i = 0; i < 8; v = ++i) {
    for (u = j = 0; j < 8; u = ++j) {
      sum = 0;
      for (y = k = 0; k < 8; y = ++k) {
        for (x = l = 0; l < 8; x = ++l) {
          val = input[y * 8 + x];
          val *= Math.cos(((2 * x + 1) * u * Math.PI) / 16);
          val *= Math.cos(((2 * y + 1) * v * Math.PI) / 16);
          sum += val;
        }
      }
      au = u === 0 ? 1 / Math.SQRT2 : 1;
      av = v === 0 ? 1 / Math.SQRT2 : 1;
      output[v * 8 + u] = 1 / 4 * au * av * sum;
    }
  }
  return output;
}

function idct1d(block) {
  var au, av, i, j, k, l, output, sum, u, v, val, x, y;
  output = [];
  for (y = i = 0; i < 8; y = ++i) {
    for (x = j = 0; j < 8; x = ++j) {
      sum = 0;
      for (v = k = 0; k < 8; v = ++k) {
        for (u = l = 0; l < 8; u = ++l) {
          au = u === 0 ? 1 / Math.SQRT2 : 1;
          av = v === 0 ? 1 / Math.SQRT2 : 1;
          val = block[v * 8 + u];
          val *= au;
          val *= av;
          val *= Math.cos(((2 * x + 1) * u * Math.PI) / 16);
          val *= Math.cos(((2 * y + 1) * v * Math.PI) / 16);
          sum += val;
        }
      }
      output[y * 8 + x] = 0.25 * sum;
    }
  }
  return output;
};

// ----------------------------------- SANITY TESTING ----------------------------------

// From the following samples on page 12 of this publication
// https://www.ijg.org/files/Wallace.JPEG.pdf

var coef = fdct(signals);
var quantized = quantize(coef, qtable);
var dequantized = dequantize(quantized, qtable);
var reconstructed = idct(dequantized);

console.log("Sanity Tests matching up the values produced by my implementations (being called at the end of my 'dct-based-encoder.js' script), to the values shown on page 12 of the following research document: ");
console.log("https://www.ijg.org/files/Wallace.JPEG.pdf");

console.log("Source Image Samples");
console.table(signals);
console.log("Forward DCT Coefficients");
console.table(coef);
console.log("Quantization Table");
console.table(qtable);
console.log("Normalized Quantized Coefficients");
console.table(quantized);
console.log("Denormalized Quantized Coefficients");
console.table(dequantized);
console.log("Reconstructed Image Samples");
console.table(reconstructed);