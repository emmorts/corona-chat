const WIDTH = 400;
const HEIGHT = 300;

export function visualiseAnalyser(analyserNode: AnalyserNode) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  canvas.style.position = "absolute";
  canvas.style.top = "120px";
  canvas.style.right = "0";

  const canvasContext = canvas.getContext("2d");

  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  analyserNode.getByteFrequencyData(dataArray);

  draw(canvas, canvasContext, analyserNode, dataArray);

  document.body.appendChild(canvas);
}

function draw(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, analyserNode: AnalyserNode, dataArray: Uint8Array) {
  const bufferLength = analyserNode.frequencyBinCount;

  let drawVisual = requestAnimationFrame(() => draw(canvas, context, analyserNode, dataArray));

  analyserNode.getByteFrequencyData(dataArray);

  // TODO
  // const avg = dataArray.reduce((sum, value) => sum += value, 0) / dataArray.length;
  // console.log(avg);

  context.fillStyle = 'rgb(200, 200, 200)';
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.lineWidth = 2;
  context.strokeStyle = 'rgb(0, 0, 0)';

  context.beginPath();

  const sliceWidth = WIDTH * 1.0 / bufferLength;

  let x = 0;

  for (let i = 0; i < bufferLength; i++) {

    const v = dataArray[i] / 128.0;
    const y = v * HEIGHT/2;

    if(i === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }

    x += sliceWidth;
  }

  context.lineTo(canvas.width, canvas.height / 2);
  context.stroke();
};