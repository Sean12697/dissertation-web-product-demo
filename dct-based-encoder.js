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

let defaulTable = [
  [16, 11, 10, 16, 34, 40, 51, 61],
  [12, 12, 14, 19, 26, 58, 60, 55],
  [14, 13, 16, 24, 40, 57, 69, 56],
  [14, 17, 22, 29, 51, 87, 80, 62],
  [18, 22, 37, 56, 68, 109, 103, 77],
  [24, 35, 55, 64, 81, 104, 113, 92],
  [49, 64, 78, 87, 103, 121, 120, 101],
  [72, 92, 95, 98, 112, 100, 103, 99]
];

let qtable = [
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

// -------------------------- COMPRESSION ---------------------------

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
  return arrayToZigZag(array);
}

// ------------------------------- ZIG ZAG ------------------------------
// An assumption is they have the same height as in width

function arrayToZigZag(arr) {
  let stream = [], strips = ((arr.length * 2) - 1), x = 0, y = 0, xadd = -1, yadd = 1;
  for (let strip = 0; strip < strips; strip++) {
    let stripValuesCount = (arr.length > strip) ? (strip % arr.length) + 1 : arr.length - 1 - (strip % arr.length);
    for (let val = 0; val < stripValuesCount; val++) {
      stream.push(arr[x][y]);
      // if go negative or off the edge, keep, else increment/decrement
      x = (x + xadd == -1 || x + xadd > zigZagShortening(stripValuesCount, arr.length)) ? x : x + xadd;
      y = (y + yadd == -1 || y + yadd > zigZagShortening(stripValuesCount, arr.length)) ? y : y + yadd;
    } xadd = flip(xadd); yadd = flip(yadd);
  }
  return stream;
}

// const zig = (x) => [for(y of[...x,...x[0]].keys())for(z of Array(y+1).keys())if(a=x[y%2?z:y-z])if(b=a[y%2?y-z:z])b];

function zigZagToArray(vect) {
  let length = Math.sqrt(vect.length), arr = make2DArray(length,length), strips = ((arr.length * 2) - 1), x = 0, y = 0, xadd = -1, yadd = 1, i = 0;
  for (let strip = 0; strip < strips; strip++) {
    let stripValuesCount = (arr.length > strip) ? (strip % arr.length) + 1 : arr.length - 1 - (strip % arr.length);
    for (let val = 0; val < stripValuesCount; val++, ++i) {
      arr[x][y] = vect[i];
      // if go negative or off the edge, keep, else increment/decrement
      x = (x + xadd == -1 || x + xadd > zigZagShortening(stripValuesCount, arr.length)) ? x : x + xadd;
      y = (y + yadd == -1 || y + yadd > zigZagShortening(stripValuesCount, arr.length)) ? y : y + yadd;
    } xadd = flip(xadd); yadd = flip(yadd);
  }
  return arr;
}

function zigZagShortening(valuesCount, arrLength) {
  return (valuesCount >= (arrLength / 2)) ? valuesCount - 1 : valuesCount;
}

function flip(one) {
  return (one == 1) ? -1 : 1;
}

// ------------------------------- OTHERS -------------------------------

// https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
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

// var coef = fdct(signals);
// var quantized = quantize(coef, qtable);
// var dequantized = dequantize(quantized, qtable);
// var reconstructed = idct(dequantized);

// console.log(signals);
// console.log(coef);
// console.log(quantized);
// console.log(dequantized);
// console.log(reconstructed);

// http://js2.coffee/
// https://codepen.io/32bitkid/post/exploring-the-discrete-cosine-transform
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

// http://js2.coffee/ 
// https://codepen.io/32bitkid/post/exploring-the-dct-part-ii
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