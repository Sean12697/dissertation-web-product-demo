let encoded = [];

window.addEventListener('DOMContentLoaded', () => {
    let quantized = encode(signals, qtable);
    let reconstructed = decode(quantized, qtable);

    drawOnCanvas(signals, "before", greyToHex);
    drawOnCanvas(qtable, "table", (i) => `rgba(${i},${i},${i},0.7)`);
    drawOnCanvas(reconstructed, "after", greyToHex);

    addImage("lenna.png", "cnvsLennaBefore", );
    fileUploadListener();
});

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
        let encodeDecodeResults = encodeDecode(canvas);
        setMetaText(`You compressed ${encodeDecodeResults[1]} of the image, being ${formatBytes(encodeDecodeResults[2])} of the original ${formatBytes(encodeDecodeResults[3])}`);
        streamToCanvas("cnvsLennaAfter", encodeDecodeResults[0], img.width, img.width);
     };
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
    after.getContext('2d').putImageData(new ImageData(stream, width, height), 0, 0, 0, 0, width, height);
}

function setMetaText(text) {
    document.getElementById("meta").innerHTML = text;
}

function drawOnCanvas(arr, cnvs, background) {
    let ctx = document.getElementById(cnvs).getContext("2d");
    ctx.font = "13px Arial";
    arr.forEach((x, i) => {
        x.forEach((y, j) => {
            ctx.fillStyle = background(y);
            ctx.fillRect(j * 50, i * 50, 50, 50);
            ctx.fillStyle = "#000";
            ctx.fillText(y, j * 50 + 2, i * 50 + 15);
        });
    });
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