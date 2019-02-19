let encoded = [],
    scalesArray = [];

window.addEventListener('DOMContentLoaded', () => {
    scalesArray = apsc(document.getElementsByClassName('scale'));
    scalesMatchArray();
    renderTables();

    addImage("lenna.png", "cnvsLennaBefore");

    document.getElementById("cnvsLennaBefore").addEventListener("mouseup", e => {
        let width = 8, height = 8, snippetArray = make2DArray(width, height);
        let canvas = document.getElementById("cnvsLennaBefore"), canvasSnippet = document.getElementById("cnvsBeforeSnippet");
        let x = e.offsetX * (canvas.width / canvas.clientWidth), y = e.offsetY * (canvas.height / canvas.clientHeight);
        let canvasCtx = canvas.getContext("2d"), canvasSnippetCtx = canvasSnippet.getContext("2d");
        let snippet = canvasCtx.getImageData(x, y, width, height); // getting pixels of where clicked
        // console.log(snippet)
        canvasCtx.fillRect(x, y, width, height); // filling in black
        snippet.data.forEach((pix, i) => {
            let pos = Math.floor(i/4), col = i % 4, x = pos % width, y = Math.floor(pos / width), curr = snippetArray[y][x];
            snippetArray[y][x] = (curr) ? curr : "#"; // if null/empty add a # at the begining
            snippetArray[y][x] += (col == 3) ? "" : componentToHex(pix); // if the alpha channel
        });
        drawSnippet(snippetArray, "cnvsBeforeSnippet");
        // encodeDecodeToCanvas(canvasSnippet, "cnvsAfterSnippet");
    });

    document.getElementById("generate").addEventListener('click', () => encodeDecodeToCanvas(document.getElementById("cnvsLennaBefore"), "cnvsLennaAfter"));
    document.getElementById("copy").addEventListener('click', () => {
        let copyText = document.getElementById("txtTable");
        copyText.select();
        document.execCommand("copy");
        // alert("Copied the array: " + copyText.value);
    });
    document.getElementById("default").addEventListener('click', () => {
        qtable = defaulTable;
        scalesMatchArray();
        renderTables();
    });

    scalesArray.forEach((x, i) => {
        x.addEventListener('change', () => {
            let tableStream = arrayToZigZag(defaulTable),
                bit = Math.round(tableStream.length / scalesArray.length) + 1;
            let modified = tableStream.map((v, j) => Math.round(scalesArray[Math.floor(j / bit)].value * 254) + 1);
            qtable = zigZagToArray(modified);
            renderTables();
        });
    });

    fileUploadListener();
});

// https://stackoverflow.com/questions/14224535/scaling-between-two-number-ranges
function convertRange(value, r1, r2) {
    return (value - r1[0]) * (r2[1] - r2[0]) / (r1[1] - r1[0]) + r2[0];
}

// added UX for reset to default table
function scalesMatchArray() {
    scalesArray.forEach((x, i) => {
        let tableStream = arrayToZigZag(qtable),
            bits = Math.round(tableStream.length / scalesArray.length) + 1,
            averageInSteamPart = tableStream.reduce((total, currentValue, currentIndex) => (currentIndex > (i * bits) && currentIndex < ((i + 1) * bits)) ? total + currentValue : total, 0) / bits;
        x.value = convertRange(averageInSteamPart, [0, 255], [0, 1]);
    });
}

function renderTables() {
    // drawOnCanvas(signals, "before", greyToHex);
    drawOnCanvas(qtable, "table", (i) => `rgba(${i},${i},${i},0.6)`);
    document.getElementById("txtTable").value = `[ ${qtable.map(line => '[' + line.toString() + ']').toString()} ]`;
    // console.log(encode(signals, qtable))
    // drawOnCanvas(decode(encode(signals, qtable), qtable), "after", greyToHex);
}

// https://stackoverflow.com/questions/22087076/how-to-make-a-simple-image-upload-using-javascript-html
function fileUploadListener() {
    document.querySelector('input[type="file"]').addEventListener('change', function () {
        if (this.files && this.files[0]) {
            addImage(URL.createObjectURL(this.files[0]), "cnvsLennaBefore");
        }
    });
}

function addImage(image, cnvs) {
    setMetaText('<div class="loader"></div>');
    let img = new Image();
    img.src = image;
    img.onload = () => {
        let canvas = document.getElementById(cnvs);
        let MAX_WIDTH = 512,
            MAX_HEIGHT = 512,
            width = img.width,
            height = img.height;

        // Downscaling if necessary
        // https://codepen.io/tuanitpro/pen/wJZJbp
        if (width > height) {
            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }
        } else {
            if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
            }
        }

        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        encodeDecodeToCanvas(canvas, "cnvsLennaAfter");
    };
}

function encodeDecodeToCanvas(originalCanvas, afterCanvas) {
    encodeDecode(originalCanvas).then(encodeDecodeResults => {
        setMetaText(`You compressed ${encodeDecodeResults[1]}% of the image, being ${formatBytes(encodeDecodeResults[2])} of the original ${formatBytes(encodeDecodeResults[3])} channel data.`);
        streamToCanvas(afterCanvas, encodeDecodeResults[0], originalCanvas.width, originalCanvas.height);
    });
}

async function encodeDecode(originalCanvas) {
    encoded = encodeCanvasImage(originalCanvas);
    let cr = compressionRatio(encoded);
    let decoded = decodeRGBA(encoded);
    let data = new Uint8ClampedArray(RGBArrayToStream(decoded));
    return Promise.resolve([data, cr[0], cr[1], cr[2]]); // rgba stream, compressed ratio, after size, original size
}

function streamToCanvas(canvasID, stream, width, height) {
    let after = document.getElementById(canvasID);

    after.width = width;
    after.height = height;

    after.getContext('2d').clearRect(0, 0, after.width, after.height);
    after.getContext('2d').putImageData(new ImageData(stream, width, height), 0, 0, 0, 0, width, height);
}

function setMetaText(text) {
    document.getElementById("meta").innerHTML = text;
}

function drawOnCanvas(arr, cnvs, background) {
    let canvas = document.getElementById(cnvs);
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "18px Arial";
    arr.forEach((x, i) => {
        x.forEach((y, j) => {
            ctx.fillStyle = background(y);
            ctx.fillRect(j * 50, i * 50, 50, 50);
            ctx.fillStyle = "#000";
            ctx.fillText(y, j * 50 + 2, i * 50 + 18);
        });
    });
}

function drawSnippet(array, cnvs) {
    // console.log(array)
    let canvas = document.getElementById(cnvs), ctx = canvas.getContext("2d"), xSize = canvas.width / array[0].length, ySize = canvas.height / array.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    array.forEach((x, i) => {
        x.forEach((y, j) => {
            ctx.fillStyle = y; // .reduce(a => componentToHex(a), "#"); // [255, 0, 0] to #ff0000
            ctx.fillRect(j * 50, i * 50, 50, 50);
        });
    });
}

function apsc(e) {
    return Array.prototype.slice.call(e);
}

function greyToHex(grey) {
    return rgbToHex(grey, grey, grey);
}

// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}