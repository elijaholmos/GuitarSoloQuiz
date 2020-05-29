window.onload = function() {
//taken from https://codepen.io/nfj525/pen/rVBaab
var context = new AudioContext();
var src = context.createMediaElementSource(audio);
var analyser = context.createAnalyser();

var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var ctx = canvas.getContext("2d");
ctx.fillStyle = "#000";
ctx.fillRect(0, 0, canvas.width, canvas.height);

function resetFrame() {
    audio.pause();
}

     
    //audio.src = URL.createObjectURL();
    src.connect(analyser);
    analyser.connect(context.destination);

    analyser.fftSize = 256;

    var bufferLength = analyser.frequencyBinCount;
    console.log(bufferLength);

    var dataArray = new Uint8Array(bufferLength);

    var WIDTH = canvas.width;
    var HEIGHT = canvas.height;

    var barWidth = (WIDTH / bufferLength) * 2.5;
    var barHeight;
    var x = 0;

    function renderFrame() {
      requestAnimationFrame(renderFrame);
    
      x = 0;
    
      analyser.getByteFrequencyData(dataArray);
    
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
      for (var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        barHeight *= 2;

        //mess with these to change colors
        var r = barHeight/2 + (5 * (i/bufferLength));
        var g = 270 * ((i * 2)/bufferLength);
        var b = 50 * ((i * 2)/bufferLength);
    
        ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
    
        x += barWidth + 1;
      }
    }

    
    renderFrame();
}