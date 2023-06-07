'use strict';

var useReflexion = true;
var showStats = false;
var sceneStarted = false;

// Handle different screen ratios
const mapVal = (value, min1, max1, min2, max2) => min2 + (value - min1) * (max2 - min2) / (max1 - min1);
var fovX = () => mapVal(window.innerWidth / window.innerHeight, 16/9, 9/16, 1.7, Math.PI / 3);

if (navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i)) {
  useReflexion = false;
  // Account for the searchbar
  fovX = () => mapVal(window.innerWidth / window.innerHeight, 16/9, 9/16, 1.5, Math.PI / 3);
}
var fovY = () => 2 * Math.atan(Math.tan(fovX() * 0.5) * window.innerHeight / window.innerWidth);

const Stats = require('stats.js');
var stats = new Stats();
stats.showPanel(0);
if(showStats) {
	document.body.appendChild( stats.dom );
}

let regl, map, drawMap, placement, drawPainting, fps;

regl = require('regl')({
  extensions: [
    //'angle_instanced_arrays',
    'OES_element_index_uint',
    'OES_standard_derivatives'
  ],
  optionalExtensions: [
    //'oes_texture_float',
    'EXT_texture_filter_anisotropic'
  ],
  attributes: { alpha : false }
});

map = require('./map')();
const mesh = require('./mesh');
drawMap = mesh(regl, map, useReflexion);
placement = require('./placement')(regl, map);
drawPainting = require('./painting')(regl);
fps = require('./fps')(map, fovY);

const context = regl({
  cull: {
    enable: true,
    face: 'back'
  },
  uniforms: {
    view: fps.view,
    proj: fps.proj,
    yScale: 1.0
  }
});
// Create an audio context
var audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Load audio file
function loadAudio(url, callback) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    audioContext.decodeAudioData(request.response, callback);
  };

  request.send();
}

// Play audio
function playAudio(buffer) {
  var source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(audioContext.destination);
  source.start(0);
}

// Usage
loadAudio('/sounds/tiersen.mp3', function(buffer) {
  playAudio(buffer);
});

const reflexion = regl({
  cull: {
    enable: true,
    face: 'front'
  },
  uniforms: {
    yScale: -1.0
  }
});

// Create the modal start
var modal = document.createElement('div');
modal.setAttribute('id', 'modal');
modal.style.position = 'fixed';
modal.style.top = '0';
modal.style.left = '0';
modal.style.width = '100%';
modal.style.height = '100%';
modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
modal.style.display = 'none'; // Hide the modal initially
modal.style.display = 'flex';
modal.style.alignItems = 'center';
modal.style.justifyContent = 'center';

var welcomeMessage = document.createElement('div');
welcomeMessage.style.color = '#fff';
welcomeMessage.style.fontSize = '24px';

welcomeMessage.style.textAlign = 'center';
welcomeMessage.innerHTML = '<h1>Welcome to Gbely art gallery</h1><p> the ambassador of dirty intentions Gbely , welcomes you and serves you a variety of poor-quality meals from typography, digital painting and collage. please,be safe and if you don&apos;t like Shoubra don&apos;t enter   </p> ';

var startButton = document.createElement('button');
startButton.style.padding = '10px 20px';
startButton.style.fontSize = '18px';
startButton.style.backgroundColor = 'transparent';
startButton.style.color = '#fff';
startButton.style.border = 'none';
startButton.style.borderRadius = '5px';
startButton.style.cursor = 'pointer';
startButton.style.display = 'block';
startButton.innerHTML = 'Click twice to start&rarr;';
startButton.addEventListener('click', startScene);

modal.appendChild(welcomeMessage);
modal.appendChild(startButton);
document.body.appendChild(modal);

function startScene() {
  modal.style.display = 'none';
  sceneStarted = true;
}

function showStartModal() {
  modal.style.display = 'flex';
}

// Event listener for the Esc key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    showStartModal();
  }
});

regl.frame(({
	time
}) => {
	if (!sceneStarted) {
		return; // Don't render the scene until it's started
	}

  stats.begin();
  fps.tick({
    time
  });
  placement.update(fps.pos, fps.fmouse[1], fovX());
  regl.clear({
    color: [0, 0, 0, 1],
    depth: 1
  });
  context(() => {
		if(useReflexion) {
      reflexion(() => {
        drawMap();
        drawPainting(placement.batch());
      });
    }
    drawMap();
    drawPainting(placement.batch());
  });
  stats.end();
});
