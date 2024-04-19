/*global varabile declarations*/
//declare elements (drop box)
const dropBox = document.getElementById("dropZone");
const fileSelect = document.getElementById("input");

//declare elements (canvas)
const canvasSize = document.getElementById("centerTabs");
const canvas = document.getElementById('tabHome');
const ctx = canvas.getContext('2d');

//declare elements (control panel)
const play = document.getElementById("playButton");
const color1 = document.getElementById("color1");
const color2 = document.getElementById("color2");
const songName = document.getElementById("title");
const songBy = document.getElementById("author");
const reset = document.getElementById("reset");
const pace = document.getElementById("pacer");
const SynthVolume = document.getElementById("synth");
const SynthAttack = document.getElementById("attack")
const SynthSustain = document.getElementById("sustain")

//declare element (indicator)
const indicator = document.getElementById("indicator");
indicator.currentTimeout = null;

//current animation frame
var frame;

//declare song Object
var song;

//declare audio analyser set
const audioSet = window.PitchDet;
const tabToFrecq = {
  6:[82.41, 87.31, 92.50, 98.00, 103.83, 110.00, 
     116.54, 123.47, 130.81, 138.59, 146.83, 155.56,
     164.81, 174.61, 185.00, 196.00, 207.65, 220.00,
     233.08, 246.94],
  5:[110.00, 116.54, 123.47, 130.81, 138.59, 146.83,
     155.56, 164.81,  174.61, 185.00, 196.00, 207.65,
     220.00, 233.08, 246.94, 261.63, 277.18, 293.66,
     311.13, 329.63],
  4:[146.83, 155.56, 164.81,  174.61, 185.00, 196.00,
     207.65, 220.00, 233.08, 246.94, 261.63, 277.18, 
     293.66, 311.13, 329.63, 349.23, 369.99, 392.00,
     415.30, 440.00],
  3:[196.00, 207.65, 220.00, 233.08, 246.94, 261.63,
     277.18, 293.66, 311.13, 329.63, 349.23, 369.99,
     392.00, 415.30, 440.00, 466.16, 493.88, 523.25,
     554.37, 587.33],
  2:[246.94, 261.63, 277.18, 293.66, 311.13, 329.63,
     349.23, 369.99, 392.00, 415.30, 440.00, 466.16,
     493.88, 523.25, 554.37, 587.33, 622.25, 659.26,
     698.46, 739.99],
  1:[329.63, 349.23, 369.99, 392.00, 415.30, 440.00,
     466.16, 493.88, 523.25, 554.37, 587.33, 622.25,
     659.26, 698.46, 739.99, 783.99, 830.61, 880.00,
     932.33, 987.77],
  0:-1
  };

//declare Synth Object
const Synth = window.Synth;

//set up the tab storage
var tabs = [];

/*CONTROL PANEL*/
//event listener for the play button
play.onclick = drawTab;

//custom value for play button state
play.state = false;

//event listener for restart button
reset.onclick = function(){
  tabs = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setUp();
  scanScore();
  play.state = false;
  window.cancelAnimationFrame(frame);
};

//event listener for volume
SynthVolume.onchange = function(){
  Synth.setVolume(SynthVolume.value);
};

//event listener for attack
SynthAttack.onchange = function(){
  Synth.setAttack(SynthAttack.value);
};

//event listener for sustain
SynthSustain.onchange = function(){
   Synth.setSustain(SynthSustain.value);
};

/*DROP BOX*/
//handle input
fileSelect.onchange = handleJSON;

async function handleJSON() {
  let promise = new Promise((resolve, reject) => {
    let reader = new FileReader();
    let file = fileSelect.files[0];
    reader.readAsText(file);
    reader.onload = event => (resolve(JSON.parse(event.target.result)));
    reader.onerror = error => reject(error);
  });
  song = await promise;
  console.log(song);
  songName.innerHTML = typeof song.Song.Name == "string" ? song.Song.Name : "Unkown";
  songBy.innerHTML = typeof song.Song.Composer == "string" ? song.Song.Composer : "Unkown";
  tabs = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setUp();
  scanScore();
  play.state = false;
  window.cancelAnimationFrame(frame);
}

//hande drop
dropBox.ondragover = function(ev){
  ev.preventDefault();
};

dropBox.ondrop = function(ev){
  ev.preventDefault();
  fileSelect.files = ev.dataTransfer.files;
  handleJSON();
}

/*VISUALIZOR*/
//set up the tab vizualizor
function setUp() {
  //draw guitar
    //strings
  ctx.strokeStyle = "black";
  for (let i = 1; i < 7; i++) {
    let step = canvas.height / 9;
    ctx.beginPath();
    ctx.moveTo(canvas.width, i * step + 1 * step);
    ctx.lineTo(0, i * step + 1 * step);
    ctx.stroke();
  }
    //beat indicator
  ctx.strokeStyle = "red";
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(30, canvas.height);
  ctx.stroke();
}
  //call functon to draw the tab viz + set up audio
document.addEventListener("DOMContentLoaded", (event) => {
  audioSet.startPitchDetect();
  Synth.Setup();
  setUp();
});

//draw and animate the tabs
  //parent function to draw and animate tabs
function drawTab() {
  //change the play button to pause/play
  play.state = !play.state;
  //check new value
  switch(play.state){
     case true:
      //if play, run animation
      tabs.forEach(tab => tab.wait.resume());
      window.requestAnimationFrame(animateTab);
     break;
     case false:
      //if pause, stop animation
      tabs.forEach(tab => tab.wait.pause());
      window.cancelAnimationFrame(frame);
     break;
  }
}
  //create object and draw tabs
function createTab(note,fret,beats,prev){
  return {
    id:prev.id+1,
    //this has to do with the actual note
    fret: fret,
    note: note,
    beats: beats,
    SynthFix: prev.beats, //this fixes the synth's beat length for congruent notes
    //these are the value cordinates
    x: canvas.width,
    y: (canvas.height/9)*(note+1),
    vx: 1,
    //drawing the note
    color1: "#924747",
    color2: "white",
    draw() {
      //notes with a string of 0 are rests, so don't draw them
      if(this.note != 0){
        ctx.beginPath();
        ctx.arc(this.x+6, this.y, 8, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = color2.value;
        ctx.fill();
        ctx.fillStyle = color1.value;
        ctx.textBaseline = "middle";
        ctx.fillText(this.fret, this.x, this.y);
      }
    },
    //make sure notes are played at correct time
    beatTime: prev.beats*song.Signature[1]+prev.beatTime, //how long until the beat is ready
    ready: prev.start ? [true]:[false,false], //whether the tab is ready to be drawn
    wait: {resume(){},pause(){}}, //the object that will handle the wait
    play() {
      let time = this.beatTime*(1/pace.value);
      if(this.ready[0]){
        this.draw();
        this.x -= this.vx;
        return;
      }
      if(!this.ready[1]){
        this.wait = sleep(() => {
          this.ready[0] = true;
        }, time);
        this.ready[1] = true;
        return;
      }
    }
  }
}
  //animate the tab
function animateTab() {
    //clear frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setUp();
    //loop through all tabs
      //init the list of junk tabs
  let junkTabs = [];
  for(let i=0; i<tabs.length; i++){
      //draw tab when ready
    tabs[i].play();
      //check if tab is at beat indicator
    
    if(tabs[i].x < 30){
        //if so, check if beat was hit, delete tab and play synth
      if(isCorrectSound(tabs[i].note, tabs[i].fret, tabs[i].id)){
        success();
      }else{
        fail();
      }
      junkTabs.push(i);
      let noteLength = (tabs[i].beats == 0) ? tabs[i].SynthFix : tabs[i].beats;
      Synth.setNoteLength(noteLength*song.Signature[1]/1000);
      Synth.playNote(tabToFrecq[tabs[i].note][tabs[i].fret]);
    }
  }
  
    //remove junk tabs
      //we need to shift the id each time a tab is removed
  var shift = 0;
  junkTabs.forEach(i => {
    tabs.splice(i-shift,1);
    shift++;
    });
    //if no more tabs, stop animation
  if(tabs.length != 0){
    frame = window.requestAnimationFrame(animateTab);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setUp();
  }
  return;
}

//function to translate score in to tab objects
function scanScore(){
  let prev = {
    beats: 0,
    beatTime: 0,
    start: true,
    id: 0
  };
  song.Score.forEach(function(note) {
    tabs.push(createTab(note[0], note[1], note[2], prev));
    prev = tabs[tabs.length-1];
  });
}

//function for pauseable timeout
function sleep(callBack, delay){
  let id = setTimeout(callBack, delay);
  return {
    id:id,
    remaining:delay,
    start: Date.now(),
    pause(){
      clearTimeout(id);
      this.remaining -= Date.now() - this.start;
    },
    resume(){
      this.id = setTimeout(callBack, this.remaining);
      this.start = Date.now();
    }
  }
}

/*AUDIO HANDLER*/
//function to check if the note is correct
function isCorrectSound(str, fret, id){
  let pitch = tabToFrecq[str][fret];
  //console.log("goal " + id + ": " + pitch);
  //console.log("you: " + audioSet.pitch);
    if(pitch == undefined  && audioSet.pitch == -1){
      return true;
    }
    if(errorMargin(audioSet.pitch, pitch, 0.3)){
      return true;
    }
  return false;
}

//function for margin of error
function errorMargin(value, center, range){
  return (value <= center+center*range) && (value >= center-center*range);
}

//function to indicate successful hit
function success(){
  clearTimeout(indicator.currentTimout);
  indicator.style.backgroundColor = "lightgreen";
  indicator.style.animation = "none";
  indicator.currentTimout = setTimeout(() => {
    indicator.style.animation = "indicFadeBack 0.5s forwards";
  }, 100);
}

//function to indicate unsuccessful hit
function fail(){
  clearTimeout(indicator.currentTimout);
  indicator.style.backgroundColor = "darkred";
  indicator.style.animation = "none";
  indicator.currentTimout = setTimeout(() => {
    indicator.style.animation = "indicFadeBack 0.5s forwards";
  }, 100);
}
