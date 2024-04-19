//https://medium.com/geekculture/building-a-modular-synth-with-web-audio-api-and-javascript-d38ccdeca9ea
// CONTEXT AND MASTER VOLUME
var AudioContext = window.AudioContext ||
    window.webkitAudioContext;
window.Synth = {
 context: null,
 masterVolume: null,
 attackLevel: 0.8,
 sustainLevel: 0.5,
 noteLength: 1,
 filterStrength: 1,
 tempVolume: 0.1
}

window.Synth.setNoteLength = function(length){
  this.noteLength = length;
}

window.Synth.setAttack = function(level){
  this.AttackLevel = this.sustainLevel+level;
}

window.Synth.setSustain = function(level){
  this.sustainLevel = level;
}

window.Synth.setFilterStrength = function(strength){
  this.filterStrength = strength;
}

window.Synth.setVolume = function(volume){
  try{
    this.masterVolume.gain.value = volume;
  }catch(err){
    this.tempVolume = volume;
    console.log(err + ": couldn't set volume");
  }
};

window.Synth.Setup = function(){
  this.context = new AudioContext();
  this.masterVolume = this.context.createGain();
  this.masterVolume.connect(this.context.destination);
  this.masterVolume.gain.value = this.tempVolume;
}

window.Synth.playNote = function(note) {
  if(note == undefined){
    return;
  }
  this.createOscillator(note,"square",this.filterStrength);
  this.createOscillator(note+(2.9/4),"sawtooth",0.66,this.filterStrength*2);
  this.createOscillator(note*2,"sawtooth",0.6, this.filterStrength);
}

window.Synth.createOscillator = function(note, type, gainLvl=1, filterLvl=25){
  const filter = this.context.createBiquadFilter();
  const osc = this.context.createOscillator();
  const attackTime =this.context.currentTime + (this.noteLength * 0.1);
  osc.type = type;
  filter.type = "lowpass";
  filter.frequency.value = filterLvl;
  const noteGain = this.context.createGain();
    noteGain.gain.setValueAtTime(0, 0);
    noteGain.gain.linearRampToValueAtTime(gainLvl*this.attackLevel, attackTime);
    noteGain.gain.linearRampToValueAtTime(gainLvl*this.sustainLevel, this.context.currentTime+attackTime + this.noteLength * 0.7)
    noteGain.gain.setValueAtTime(gainLvl*this.sustainLevel, this.context.currentTime +attackTime+ this.noteLength - this.noteLength * 0.3);
    noteGain.gain.linearRampToValueAtTime(0, this.context.currentTime + this.noteLength);

    osc.frequency.setValueAtTime(note, 0);
    osc.start(0);
    osc.stop(this.context.currentTime + this.noteLength);
    osc.connect(filter);
    filter.connect(noteGain);

    noteGain.connect(this.masterVolume);
}
