To Run:

The index.html file cannot be opened locally and work due to CORS issues, specifically this error:
"Failed to execute 'getImageData' on 'CanvasRenderingContext2D': The canvas has been tainted by cross-origin data. at Image.img.onload"

Instead it needs to be ran on a server (which can be local), the easiest way to run this project is to use the "Live Server" extension through Visual Studio Code.
Or, it can be deployed to GitHub and have "GitHub Pages" set to the main branch, which will then host it as a static website which can be visited.

Features:
1. Modify the scales then click the Quantize button to view compression
2. Use the default table (reset) even after modification
3. Upload your own image to be compressed
4. Copy a text version of the table (via the copy button)
5. Paste a previously copied table to use (via the paste button)
6. Modify the tables values in a text based format (in the text box and pressing enter)
7. Click on either image to view that segment
8. Change the size of the segment shown (via the sample size scale)
9. View the images in colour (then change back)