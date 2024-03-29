// Global variables needed for persistance
let encoded = [],
    scalesArray = [],
    useColour = false,
    snippetBefore,
    snippetAfter,
    xPreviousClicked,
    yPreviousClicked,
    pageXPreviousClicked,
    pageYPreviousClicked,
    snippetSize = 16,
    txtTable,
    imageDataUsing,
    arrayRegex = /(\[((\[((([1-9]|[1-8][0-9]|9[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]),){7}([1-9]|[1-8][0-9]|9[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\]),){7}(\[((([1-9]|[1-8][0-9]|9[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]),){7}([1-9]|[1-8][0-9]|9[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\])\])/;

// --------------------------------------- WINDOW LOADED ---------------------------------------------------

window.addEventListener('DOMContentLoaded', () => {
    txtTable = document.getElementById("txtTable");
    scalesArray = apsc(document.getElementsByClassName('scale'));
    scalesMatchArray();
    renderTables();
    addImage("lenna.png", "cnvsLennaBefore");
    // Setting up event listeners for important elements
    mouseUpCanvasBeforeEventListener();
    mouseUpCanvasAfterEventListener();
    clickGenerateEventListner();
    clickCopyEventListener();
    clickDefaultTableEventListener();
    changeTxtTableEventListener();
    clickPasteEventListener();
    changeSizeEventListener();
    clickColourSwitchEventListener();
    changeScalesArrayEventListener();
    changeFileEventListener();
});

// --------------------------------------- EVENT LISTENERS ----------------------------------------------------

function mouseUpCanvasBeforeEventListener() {
    document.getElementById("cnvsLennaBefore").addEventListener("mouseup", canvasClick);
}

function mouseUpCanvasAfterEventListener() {
    document.getElementById("cnvsLennaAfter").addEventListener("mouseup", canvasClick);
}

function canvasClick(e) {
    // Creating canvas element variable
    let canvasBefore = document.getElementById("cnvsLennaBefore");
    // Creating x/y of where the user has clicked on the canvas
    // width divided by client width needed to fix the issue the canvas is being scaled with CSS (for responsiveness)
    let x = e.offsetX * (canvasBefore.width / canvasBefore.clientWidth),
        y = e.offsetY * (canvasBefore.height / canvasBefore.clientHeight);
    // Setting global x/y for use when getting the same block after re-quantizing the image
    xPreviousClicked = x;
    yPreviousClicked = y;
    pageXPreviousClicked = e.pageX;
    pageYPreviousClicked = e.pageY;
    // Creating snippets
    createSnippets();
}

function clickGenerateEventListner() {
    document.getElementById("generate").addEventListener('click', () => {
        let warningText = document.getElementById("warningText");
        warningText.classList.remove("animateIn");
        warningText.innerHTML = "_";
        encodeDecodeToCanvas(document.getElementById("cnvsLennaBefore"), "cnvsLennaAfter");
    });
}

function clickCopyEventListener() {
    document.getElementById("copy").addEventListener('click', () => {
        txtTable.select();
        document.execCommand("copy");
    });
}

function clickDefaultTableEventListener() {
    document.getElementById("default").addEventListener('click', () => {
        setWarningText();
        qtable = defaulTable;
        scalesMatchArray();
        renderTables();
    });
}

// If the user changes the text of the array, it will text the format and convert it to the array
function changeTxtTableEventListener() {
    // This regex is essentially matching a value of 1-255 7 times with a comma afterwards, then one more time without, with square brackets around it
    // Then similar again, it will match this array definition 7 times with a comma afterwards, then one more time without, with square brackets around it again 
    txtTable.addEventListener("change", () => {
        if (txtTable.value.toString().match(arrayRegex)) { // ensuring the text can be converted
            textToArray(txtTable.value.toString());
        }
    });
}

function clickPasteEventListener() {
    document.getElementById("paste").addEventListener("click", () => {
        navigator.clipboard.readText().then(t => {
            if (t.match(arrayRegex)) textToArray(t);
        }).catch(alert('Failed to read clipboard contents: ' + err));
    });
}

function changeSizeEventListener() {
    document.getElementById("size").addEventListener("change", () => {
        snippetSize = parseInt(document.getElementById("size").value);
        document.getElementById("txtSize").innerHTML = `${snippetSize}*${snippetSize}`;
        createSnippets();
    });
}

function clickColourSwitchEventListener() {
    document.getElementById("colourSwitch").addEventListener("click", () => {
        useColour = !useColour; // flipping the boolean value
        document.getElementById("colourSwitch").innerHTML = (useColour) ? "Use B&W (FASTER)" : "Use Colour (SLOWER)";
        let canvas = document.getElementById("cnvsLennaBefore");
        if (useColour) redrawCanvas(canvas, imageDataUsing);
        if (!useColour) redrawCanvas(canvas, imageDataToBlackAndWhiteImageData(imageDataUsing));
        encodeDecodeToCanvas(canvas, "cnvsLennaAfter")
    });
}

function changeScalesArrayEventListener() {
    scalesArray.forEach((x, i) => {
        x.addEventListener('change', () => {
            setWarningText();
            let tableStream = arrayToZigZag(defaulTable),
                bit = Math.round(tableStream.length / scalesArray.length) + 1;
            let modified = tableStream.map((v, j) => Math.round(scalesArray[Math.floor(j / bit)].value * 254) + 1);
            qtable = zigZagToArray(modified);
            renderTables();
        });
    });
}

function changeFileEventListener() {
    document.getElementById("upload").addEventListener('change', function () {
        if (this.files && this.files[0]) {
            addImage(URL.createObjectURL(this.files[0]), "cnvsLennaBefore");
        }
    });
}

// --------------------------------------- MAIN FUNCTIONS -----------------------------------------------------

function encodeDecodeToCanvas(originalCanvas, afterCanvas) {
    encodeDecode(originalCanvas).then(encodeDecodeResults => {
        setMetaText(`You compressed ${encodeDecodeResults[1]}% of the image, being ${formatBytes(encodeDecodeResults[2])} of the original ${formatBytes(encodeDecodeResults[3])} channel data.`);
        streamToCanvas(afterCanvas, encodeDecodeResults[0], originalCanvas.width, originalCanvas.height);
        // only updating the snippets below the images if the variables for them have been set
        if (snippetBefore && snippetAfter && xPreviousClicked && yPreviousClicked) createSnippets();
    });
}

async function encodeDecode(originalCanvas) {
    encoded = encodeCanvasImage(originalCanvas);
    let cr = compressionRatio(encoded); // holding the array of text values
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

// -------------------------------------- DOM MANIPULATION ----------------------------------------------------

function createSnippets() {
    // Getting imageData of where clicked
    snippetBefore = document.getElementById("cnvsLennaBefore").getContext("2d").getImageData(xPreviousClicked - (snippetSize / 2), yPreviousClicked - (snippetSize / 2), snippetSize, snippetSize);
    snippetAfter = document.getElementById("cnvsLennaAfter").getContext("2d").getImageData(xPreviousClicked - (snippetSize / 2), yPreviousClicked - (snippetSize / 2), snippetSize, snippetSize);
    // Setting snippet values
    hexArrayToCanvas(imageDataToHexes(snippetBefore), "cnvsBeforeSnippet");
    hexArrayToCanvas(imageDataToHexes(snippetAfter), "cnvsAfterSnippet");
    // Show selection via modifying a floating elements style properties
    let beforeSelectionBox = document.getElementById("lennaBeforeSelectedBox");
    beforeSelectionBox.style.display = `inline-block`;
    beforeSelectionBox.style.width = `${snippetSize}px`;
    beforeSelectionBox.style.height = `${snippetSize}px`;
    beforeSelectionBox.style.left = `${pageXPreviousClicked-(snippetSize/2)}px`; // to centralize the element
    beforeSelectionBox.style.top = `${pageYPreviousClicked-(snippetSize/2)}px`; // to centralize the element
}

// added UX for reset to default table
function scalesMatchArray() {
    scalesArray.forEach((x, i) => {
        let tableStream = arrayToZigZag(qtable),
            bits = Math.round(tableStream.length / scalesArray.length) + 1,
            // only reducing / adding up the values in the flat table array when they are in the indexed range for the particular slider the loop is currently on
            averageInSteamPart = tableStream.reduce((total, currentValue, currentIndex) => (currentIndex > (i * bits) && currentIndex < ((i + 1) * bits)) ? total + currentValue : total, 0) / bits;
        x.value = convertRange(averageInSteamPart, 0, 255, 0, 1);
    });
}

function renderTables() {
    drawOnCanvas(qtable, "table", (i) => {
        let c = convertRange(i, 1, 255, 200, 100);
        return `rgba(${c},${c},${c},1)`;
    });
    txtTable.value = `[${qtable.map(line => '[' + line.toString() + ']').toString()}]`;
}

function hexArrayToCanvas(hexes, cnvs) {
    let canvas = document.getElementById(cnvs),
        ctx = canvas.getContext("2d"),
        xSize = canvas.width / hexes[0].length,
        ySize = canvas.height / hexes.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hexes.forEach((x, i) => {
        x.forEach((y, j) => {
            ctx.fillStyle = y;
            ctx.fillRect(j * xSize, i * ySize, xSize, ySize);
        });
    });
}

function drawOnCanvas(arr, canvasID, background) {
    let canvas = document.getElementById(canvasID);
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

function addImage(image, canvasID) {
    setMetaText('<div class="loader"></div>');
    let img = new Image();
    img.src = image;
    img.onload = () => {
        let canvas = document.getElementById(canvasID);
        let MAX_WIDTH = 512,
            MAX_HEIGHT = 512,
            width = img.width,
            height = img.height;

        // Downscale if necessary to optimise load times due to the actual canvas size not displaying 
        // all the data of the image given, although would have been processed if not for these rules
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
        imageDataUsing = canvas.getContext('2d').getImageData(0, 0, width, height);
        if (!useColour) { // Convert to black and white
            redrawCanvas(canvas, imageDataToBlackAndWhiteImageData(imageDataUsing));
        }

        encodeDecodeToCanvas(canvas, "cnvsLennaAfter");
    };
}

function redrawCanvas(canvas, imageData) {
    canvas.getContext('2d').putImageData(imageData, 0, 0, 0, 0, canvas.width, canvas.height);
}

function setWarningText() {
    let element = document.getElementById("warningText");
    element.innerHTML = "Remember to click the <b>Quantize</b> button for the image to update";
    element.classList.add("animateIn");
}

function setMetaText(text) {
    document.getElementById("meta").innerHTML = text;
}

// ------------------------------------- TYPE CONVERSIONS -----------------------------------------------------

function imageDataToBlackAndWhiteImageData(imageData) { // going through each index that is not the alpha and adding the surrounding values then dividing to work out the average
    return new ImageData(imageData.data.map((v, i, arr) => (i % 4 == 3) ? v : ((v + arr[gni(i, -1)] + arr[gni(i, 1)]) / 3)), imageData.width, imageData.height);
}

// flat being a one dimensional array
function flatArrayTo2DArray(array) {
    let size = Math.sqrt(array.length),
        newArray = make2DArray(size, size);
    array.forEach((v, i) => newArray[Math.floor(i / size)][i % size] = parseInt(v));
    return newArray;
}

function imageDataToHexes(imageData) {
    let hexes = make2DArray(imageData.width, imageData.height);
    imageData.data.forEach((pix, i) => {
        let pos = Math.floor(i / 4),
            col = i % 4,
            x = pos % imageData.width,
            y = Math.floor(pos / imageData.width),
            curr = hexes[y][x];
        hexes[y][x] = (curr) ? curr : "#"; // if null/empty add a # at the beginning
        hexes[y][x] += (col == 3) ? "" : componentToHex(pix); // if the alpha channel do not do anything
    });
    return hexes;
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
    let hexes = make2DArray(RGBArray[0][0].length, RGBArray[0].length);
    for (let y = 0; y < RGBArray[0].length; y++) {
        for (let x = 0; x < RGBArray[0][0].length; x++) {
            hexes[y][x] = `#${componentToHex(RGBArray[0][y][x])}${componentToHex(RGBArray[1][y][x])}${componentToHex(RGBArray[2][y][x])}`;
        }
    }
    return hexes;
}

// ------------------------------------- HELPER FUNCTIONS -----------------------------------------------------

function textToArray(text) {
    let flatArrayStream = text.replace(/[\[\]']+/g, '').split(',');
    qtable = flatArrayTo2DArray(flatArrayStream);
    scalesMatchArray();
    renderTables();
}

function make3DArray(depth, width, height) {
    let arr = new Array(depth);
    for (let i = 0; i < depth; i++) arr[i] = make2DArray(width, height);
    return arr;
}

function convertRange(value, r1start, r1end, r2start, r2end) {
    return (value - r1start) * (r2end - r2start) / (r1end - r1start) + r2start;
}

function apsc(e) {
    return Array.prototype.slice.call(e);
}

function greyToHex(grey) {
    return rgbToHex(grey, grey, grey);
}

function rgbToHex(r, g, b) {
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function componentToHex(c) {
    let hex = c.toString(16);
    return (hex.length == 1) ? "0" + hex : hex;
}

const gni = (i, s) => getNearestIndex(i, s);
// Used to get the nearest index value that is not its own 
function getNearestIndex(index, side) {
    //     -1        :       1
    // 1 -> 2 = + 1  :  1 -> 3 =   2
    // 2 -> 1 = - 1  :  2 -> 3 =   1
    // 3 -> 1 = - 2  :  3 -> 2 = - 1
    let offset, t = index % 4;
    switch (t) {
        case 0:
            offset = (side == -1) ? 1 : 2;
            break;
        case 1:
            offset = (side == -1) ? -1 : 1;
            break;
        case 2:
            offset = (side == -1) ? -2 : -1;
            break;
    }
    return (index + offset);
}