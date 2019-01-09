let encoded = [], scalesArray = [];

window.addEventListener('DOMContentLoaded', () => {
    scalesArray = apsc(document.getElementsByClassName('scale'));
    renderTables();

    addImage("lenna.png", "cnvsLennaBefore");
    
    document.getElementById("generate").addEventListener('click', () => encodeDecodeToCanvas(document.getElementById("cnvsLennaBefore"), "cnvsLennaAfter"));
    document.getElementById("default").addEventListener('click', () => {
        qtable = defaulTable;
        renderTables();
    });
    
    scalesArray.forEach((x, i) => { 
        x.addEventListener('change', () => {
            let tableStream = arrayToZigZag(defaulTable), bit = Math.round(tableStream.length / 3) + 1;
            let modified = tableStream.map((v, j) => Math.round(scalesArray[Math.floor(j/bit)].value * 254) + 1);
            qtable = zigZagToArray(modified);
            renderTables();
        });
    });
    
    fileUploadListener();
});

function renderTables() {
    drawOnCanvas(signals, "before", greyToHex);
    drawOnCanvas(qtable, "table", (i) => `rgba(${i},${i},${i},0.6)`);
    drawOnCanvas(decode(encode(signals, qtable), qtable), "after", greyToHex);
}

// https://stackoverflow.com/questions/22087076/how-to-make-a-simple-image-upload-using-javascript-html
function fileUploadListener() {
    document.querySelector('input[type="file"]').addEventListener('change', function() {
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
        canvas.width = img.width;
        canvas.height = img.width;
        canvas.getContext('2d').drawImage(img, 0, 0);
        encodeDecodeToCanvas(canvas, "cnvsLennaAfter");
     };
}

function encodeDecodeToCanvas(originalCanvas, afterCanvas) {
    let encodeDecodeResults = encodeDecode(originalCanvas);
    setMetaText(`You compressed ${encodeDecodeResults[1]} of the image, being ${formatBytes(encodeDecodeResults[2])} of the original ${formatBytes(encodeDecodeResults[3])}`);
    streamToCanvas(afterCanvas, encodeDecodeResults[0], originalCanvas.width, originalCanvas.width);
}

function encodeDecode(originalCanvas) {
    encoded = encodeCanvasImage(originalCanvas);
    let cr = compressionRatio(encoded);
    let decoded = decodeRGBA(encoded);
    let data = new Uint8ClampedArray(RGBArrayToStream(decoded));
    return [data, cr[0], cr[1], cr[2]]; // rgba stream, compressed ratio, after size, original size
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

function apsc(e) { 
    return Array.prototype.slice.call(e) 
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