/*AUDIO ANALYSIZER*/
window.AudioContext = window.AudioContext || window.webkitAudioContext;

window.PitchDet = {
  pitch: null,
  audioContext: null,
  analyser: null,
  mediaStreamSource: null,
  buflen: 2048,
  buf: null
}
window.PitchDet.buf = new Float32Array(window.PitchDet.buflen);

window.PitchDet.startPitchDetect = function () {	
    // grab an audio context
    this.audioContext = new AudioContext();

    // Attempt to get audio input
    navigator.mediaDevices.getUserMedia(
    {
        "audio": {
            "mandatory": {
                "googEchoCancellation": "false",
                "googAutoGainControl": "false",
                "googNoiseSuppression": "false",
                "googHighpassFilter": "false"
            },
            "optional": []
        },
    }).then((stream) => {
        // Create an AudioNode from the stream.
        this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      // Connect it to the destination.
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.mediaStreamSource.connect( this.analyser );
      this.updatePitch();
    }).catch((err) => {
        // always check for errors at the end.
        console.error(`${err.name}: ${err.message}`);
        alert('Stream generation failed.');
    });
}


window.PitchDet.autoCorrelate = function ( buf, sampleRate ) {
  // Implements the ACF2+ algorithm
  var SIZE = buf.length;
  var rms = 0;

  for (var i=0;i<SIZE;i++) {
    var val = buf[i];
    rms += val*val;
  }
  rms = Math.sqrt(rms/SIZE);
  if (rms<0.01) // not enough signal
    return -1;

  var r1=0, r2=SIZE-1, thres=0.2;
  for (var i=0; i<SIZE/2; i++)
    if (Math.abs(buf[i])<thres) { r1=i; break; }
  for (var i=1; i<SIZE/2; i++)
    if (Math.abs(buf[SIZE-i])<thres) { r2=SIZE-i; break; }

  buf = buf.slice(r1,r2);
  SIZE = buf.length;

  var c = new Array(SIZE).fill(0);
  for (var i=0; i<SIZE; i++)
    for (var j=0; j<SIZE-i; j++)
      c[i] = c[i] + buf[j]*buf[j+i];

  var d=0; while (c[d]>c[d+1]) d++;
  var maxval=-1, maxpos=-1;
  for (var i=d; i<SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  var T0 = maxpos;

  var x1=c[T0-1], x2=c[T0], x3=c[T0+1];
  a = (x1 + x3 - 2*x2)/2;
  b = (x3 - x1)/2;
  if (a) T0 = T0 - b/(2*a);

  return sampleRate/T0;
}

window.PitchDet.updatePitch = function () {
  //ensure correct 'this'
  var self = window.PitchDet;
  self.analyser.getFloatTimeDomainData(self.buf);
  var ac = self.autoCorrelate(self.buf, self.audioContext.sampleRate);
  // TODO: Paint confidence meter on canvasElem here.
    self.pitch = ac;
  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;
  rafID = window.requestAnimationFrame(self.updatePitch);
}
