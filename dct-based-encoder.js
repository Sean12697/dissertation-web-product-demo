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
const qtable = [
  [16, 11, 10, 16, 34, 40, 51, 61],
  [12, 12, 14, 19, 26, 58, 60, 55],
  [14, 13, 16, 24, 40, 57, 69, 56],
  [14, 17, 22, 29, 51, 87, 80, 62],
  [18, 22, 37, 56, 68, 109, 103, 77],
  [24, 35, 55, 64, 81, 104, 113, 92],
  [49, 64, 78, 87, 103, 121, 120, 101],
  [72, 92, 95, 98, 112, 100, 103, 99]
];

// ----------------------- MAIN FUNCTIONS ------------------------

function fdct(signals) {
  var coef = dct([].concat.apply([], signals)).map(n => Math.round(n * 10) / 10);
  return signals.map((line, i) => line.map((e, j) => coef[(i * line.length) + j]));
}

function idct(signals) {
  var coef = idct1d([].concat.apply([], signals)).map(n => Math.round(n * 10) / 10);
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
  let rgba = [[],[],[],[]], rgbaCompressed = [[],[],[],[]];
  // Getting colour spaces in different arrays
  stream.forEach((pix, i) => rgba[i % 4].push(pix));
  // converting those 1d colour arrays to 2d arrays
  rgbaCompressed = rgbaCompressed.map(arr => make2DArray(height, width));
  rgba.forEach((carr, csi) => carr.forEach((pix, index) => rgbaCompressed[csi][Math.floor(index/width)].push(pix)));
  return rgbaCompressed.map(arr => arr.map(lines => lines.filter(el => el != null)));
}

function RGBArrayToStream(array) {
  let temp = new Array();
  array = array.map(colour => [].concat.apply([], colour));
  for (let i = 0; i < array.length * array[0].length; i++) temp.push(array[i%4][Math.floor(i/4)]);
  return temp;
}

function encodeRGBA(array) {
  return array.map(colourSpace => applyToArray(colourSpace, encode, array[0].length, array[0][0].length));
}

function decodeRGBA(array) {
  return array.map(colourSpace => applyToArray(colourSpace, decode, array[0].length, array[0][0].length));
}

function applyToArray(array, func, width, height) {
  for (let i = 0; i < Math.floor(width / 8); i++) {
    for (let j = 0; j < Math.floor(height / 8); j++) {
      array = applyToArrayBlock(array, i*8, j*8, func, 8, 8)
    }
  } return array;
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
  } return block;
}

function setArrayBlock(array, block, x, y, xlen, ylen) {
  for (let i = x, xi = 0; i < x + xlen; i++, xi++) {
    for (let j = y, yj = 0; j < y + ylen; j++, yj++) {
      array[i][j]= block[xi][yj];
    }
  } return array;
}

// ----------------------- TESTS / OTHERS ------------------------

function compressionRatio(encoded) {
  let length = RGBArrayToStream(encoded).length;
  let lengthAfterCompressed = compressedRGBASize(encoded);
  return [`${100-Math.round((lengthAfterCompressed/length)*100)}%`, lengthAfterCompressed, length];
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
      let block = getArrayBlock(array, i*8, j*8, 8, 8);
      size += compressStream(flattern(block)).length;
    }
  } return size;
}

function compressStream(stream) { // if 0 and previous element was 0, do not keep
  return stream.filter((val, idx, arr) => (val == 0 && idx != 0) ? (arr[idx-1] == 0) ? false : true : true);
}

function flattern(array) {
  // in future this should be zig-zag: http://rosettacode.org/wiki/Zig-zag_matrix#JavaScript
  return [].concat.apply([], array);
}

function make2DArray(a, b) {
  var arr = new Array(a);
  for (var i = 0; i < a; i++) arr[i] = new Array(b); 
  return arr;
}

// var coef = fdct(signals);
// var quantized = quantize(coef, qtable);
// var dequantized = dequantize(quantized, qtable);
// var reconstructed = idct(dequantized);

// console.log(signals);
// console.log(coef);
// console.log(quantized);
// console.log(dequantized);
// console.log(reconstructed);

// http://refactorman.com/2015/04/28/exploring-the-dct-part-i/
function dct(input) {
  var output = [],
    v, u, x, y, sum, val, au, av;
  for (v = 0; v < 8; v++) {
    for (u = 0; u < 8; u++) {
      sum = 0;
      for (y = 0; y < 8; y++) {
        for (x = 0; x < 8; x++) {
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

function idct1d(dct) {
  var N = dct.length,
    signal = [],
    sum, k, n, s;

  for (n = 0; n < N; n++) {
    sum = 0;
    for (k = 0; k < N; k++) {
      s = k === 0 ? Math.sqrt(0.5) : 1;
      sum += s * dct[k] * Math.cos(Math.PI * (n + 0.5) * k / N);
    }
    signal[n] = Math.sqrt(2 / N) * sum;
  }
  return signal;
};