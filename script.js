let encoded = [],
    scalesArray = [],
    snippetBefore,
    snippetAfter,
    xPreviousClicked,
    yPreviousClicked,
    snippetSize = 16,
    txtTable,
    arrayRegex = /(\[((\[((([1-9]|[1-8][0-9]|9[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]),){7}([1-9]|[1-8][0-9]|9[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\]),){7}(\[((([1-9]|[1-8][0-9]|9[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]),){7}([1-9]|[1-8][0-9]|9[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\])\])/;

window.addEventListener('DOMContentLoaded', () => {
    txtTable = document.getElementById("txtTable");
    scalesArray = apsc(document.getElementsByClassName('scale'));
    scalesMatchArray();
    renderTables();

    addImage("lenna.png", "cnvsLennaBefore");

    document.getElementById("cnvsLennaBefore").addEventListener("mouseup", e => {
        // Creating canvas element variable
        let canvasBefore = document.getElementById("cnvsLennaBefore");
        // Creating x/y of where the user has clicked
        let x = e.offsetX * (canvasBefore.width / canvasBefore.clientWidth),
            y = e.offsetY * (canvasBefore.height / canvasBefore.clientHeight);
        // Setting global x/y for use when getting the same block after re-quantising the image
        xPreviousClicked = x;
        yPreviousClicked = y;
        // Creating snippets
        createSnippets();
        // Show selection
        let beforeSelectionBox = document.getElementById("lennaBeforeSelectedBox");
        beforeSelectionBox.style.display = `inline-block`;
        beforeSelectionBox.style.width = `${snippetSize}px`;
        beforeSelectionBox.style.height = `${snippetSize}px`;
        beforeSelectionBox.style.left = `${e.pageX-(snippetSize/2)}px`;
        beforeSelectionBox.style.top = `${e.pageY-(snippetSize/2)}px`;
        beforeSelectionBox.style["z-index"] = 2;
    });

    document.getElementById("generate").addEventListener('click', () => {
        encodeDecodeToCanvas(document.getElementById("cnvsLennaBefore"), "cnvsLennaAfter");
    });
    document.getElementById("copy").addEventListener('click', () => {
        txtTable.select();
        document.execCommand("copy");
        // alert("Copied the array: " + copyText.value);
    });
    document.getElementById("default").addEventListener('click', () => {
        qtable = defaulTable;
        scalesMatchArray();
        renderTables();
    });

    // If the user changes the text of the array, it will text the format and convert it to the array
    txtTable.addEventListener("change", () => {
        if (txtTable.value.toString().match(arrayRegex)) {
            let flatStream = txtTable.value.toString().replace(/[\[\]']+/g, '').split(',');
            qtable = flatArrayTo2DArray(flatStream);
            scalesMatchArray();
            renderTables();
        }
    });

    // changing the global snippet size
    document.getElementById("size").addEventListener("change", () => {
        snippetSize = parseInt(document.getElementById("size").value);
        document.getElementById("txtSize").innerHTML = `${snippetSize}*${snippetSize}`;
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

function createSnippets() {
    // Getting imageData of where clicked
    snippetBefore = document.getElementById("cnvsLennaBefore").getContext("2d").getImageData(xPreviousClicked - (snippetSize / 2), yPreviousClicked - (snippetSize / 2), snippetSize, snippetSize);
    snippetAfter = document.getElementById("cnvsLennaAfter").getContext("2d").getImageData(xPreviousClicked - (snippetSize / 2), yPreviousClicked - (snippetSize / 2), snippetSize, snippetSize);
    // Setting snippet values
    hexArrayToCanvas(arrayRGBAToHexes(imageDataToRGBArray(snippetBefore)), "cnvsBeforeSnippet");
    hexArrayToCanvas(arrayRGBAToHexes(imageDataToRGBArray(snippetAfter)), "cnvsAfterSnippet");
}

function flatArrayTo2DArray(array) {
    let size = Math.sqrt(array.length),
        newArray = make2DArray(size, size);
    array.forEach((v, i) => newArray[Math.floor(i / size)][i % size] = parseInt(v));
    return newArray;
}

function imageDataToRGBArray(imageData) {
    let rgba = make3DArray(4, imageData.width, imageData.height);
    imageData.data.forEach((pix, i) => {
        let pos = Math.floor(i / 4),
            col = i % 4,
            x = pos % imageData.width,
            y = Math.floor(pos / imageData.width);
        rgba[col][y][x] = pix - 1;
    });
    return rgba;
}

function arrayRGBAToHexes(RGBArray) {
    let arr = make2DArray(RGBArray[0][0].length, RGBArray[0].length);
    for (let y = 0; y < RGBArray[0].length; y++) {
        for (let x = 0; x < RGBArray[0][0].length; x++) {
            arr[y][x] = `#${componentToHex(RGBArray[0][y][x])}${componentToHex(RGBArray[1][y][x])}${componentToHex(RGBArray[2][y][x])}`;
        }
    }
    return arr;
}

function make3DArray(count, width, height) {
    var arr = new Array(count);
    for (var i = 0; i < count; i++) arr[i] = make2DArray(width, height);
    return arr;
}

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
    drawOnCanvas(qtable, "table", (i) => `rgba(${i},${i},${i},0.6)`);
    txtTable.value = `[${qtable.map(line => '[' + line.toString() + ']').toString()}]`;
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
        if (snippetBefore && snippetAfter && xPreviousClicked && yPreviousClicked) createSnippets();
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

function hexArrayToCanvas(array, cnvs) {
    let canvas = document.getElementById(cnvs),
        ctx = canvas.getContext("2d"),
        xSize = canvas.width / array[0].length,
        ySize = canvas.height / array.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    array.forEach((x, i) => {
        x.forEach((y, j) => {
            ctx.fillStyle = y;
            ctx.fillRect(j * xSize, i * ySize, xSize, ySize);
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