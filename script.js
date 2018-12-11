let encoded = [];

window.addEventListener('DOMContentLoaded', () => {
    let quantized = encode(signals, qtable);
    let reconstructed = decode(quantized, qtable);

    drawOnCanvas(signals, "before");
    drawOnCanvas(reconstructed, "after");

    addImage("lenna.png", "cnvsLennaBefore");
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
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);

        // encode
        console.log(canvas.getContext('2d').getImageData(0, 0, img.width, img.height).data);
        encoded = encodeCanvasImage(canvas);
        console.log(RGBArrayToStream(encoded));
        let compressedResults = compressionRatio(encoded);
        setMetaText(`You compressed ${compressedResults[0]} of the image, being ${compressedResults[1]} of the original ${compressedResults[2]} bytes`);
        
        // decode
        let decoded = decodeRGBA(encoded);
        let data = new Uint8ClampedArray(RGBArrayToStream(decoded));
        console.log(data);

        // set
        let after = document.getElementById("cnvsLennaAfter");
        after.width = img.width;
        after.height = img.height;
        after.getContext('2d').putImageData(new ImageData(data, img.width, img.height), 0,0,0,0,img.width, img.height);
     };
}

function setMetaText(text) {
    document.getElementById("meta").innerHTML = text;
}

function drawOnCanvas(arr, cnvs) {
    let ctx = document.getElementById(cnvs).getContext("2d");
    ctx.font = "13px Arial";
    arr.forEach((x, i) => {
        x.forEach((y, j) => {
            ctx.fillStyle = greyToHex(y);
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