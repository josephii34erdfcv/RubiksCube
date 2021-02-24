// Author: I-An (Joseph) Huang
// Class: ECE462 Computer Graphics
// References :https://github.com/haxiomic/GPU-Fluid-Experiments
// https://webglfundamentals.org/webgl/lessons/webgl-image-processing.html
// https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html
// https://webgl2fundamentals.org/webgl/lessons/webgl-render-to-texture.html

const dataWidth = 1 << 7;

var canvas;
var gl;
var start = null;

// programs
var stepPositionProgram;
var colorParticleProgram;

// targets
var positionTarget;
var velocityTarget;

// data
const quadData = [
    0.0, 0.0,
    1.0, 0.0,
    0.0, 1.0,
    1.0, 1.0];
var positionData;

// buffers
var quadBuffer;
var positionBuffer;

// locations
var dt_loc;

//function for loading webpage

window.onload = function init() {

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) { alert("WebGL isn't available"); }

    //  Configure WebGL

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearDepth(1);

    // Initialize Programs

    stepPositionProgram = initShaders(gl, "base-vertex", "step-position-fragment");
    colorParticleProgram = initShaders(gl, "color-particle-vertex",
        "color-particle-fragment");
    
    // Initialize Targets

    initTargets();

    // Initialize Other Stuff

    quadBuffer = initArrayBuffer(stepPositionProgram, flatten(quadData), 
        gl.FLOAT, "a_quad", 2, gl.STATIC_DRAW);
    positionBuffer = initArrayBuffer(colorParticleProgram, positionData, 
        gl.FLOAT, "particleUV", 2, gl.STATIC_DRAW);

    dt_loc = gl.getUniformLocation(stepPositionProgram, "dt");
    
    // update

    window.requestAnimationFrame(update);
};

// data format:
// 1 data point = 8 bytes
// 1 coordinate value = 4 bytes
// 1 array val (color) = 2 bytes
// total: 2 bytes/val * 4 vals/data * data
function initTargets() {

    velocityData = new Uint16Array(2 * 4 * dataWidth * dataWidth);
    velocityTarget = new Target(gl, "velocityData", dataWidth, dataWidth, 
        gl.RGBA16UI, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT, velocityData);
    
    positionData = new Uint16Array(2 * 4 * dataWidth * dataWidth);

    // pack 32-bit float into 2 16-bit unsigned int
    let bitShift = Math.pow(2, 16);
    let index = 0;
    for (let i = 0; i < dataWidth; i++) {
        for (let j = 0; j < dataWidth; j++) {
            let coordX = i/dataWidth;
            positionData[index] = coordX * bitShift;
            positionData[index+1] = ((coordX * bitShift) - positionData[index]) * bitShift;
            index += 2;

            let coordY = j/dataWidth;
            positionData[index] = coordY * bitShift;
            positionData[index+1] = ((coordY * bitShift) - positionData[index]) * bitShift;
            index += 2;
        }
    }

    positionTarget = new Target(gl, "positionData", dataWidth, dataWidth, 
        gl.RGBA16UI, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT, positionData);
}

function initArrayBuffer(program, data, type, attribute, num, draw) {
    var a_Attribute = gl.getAttribLocation(program, attribute);
    var buffer      = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, draw);
    gl.vertexAttribPointer(a_Attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(a_Attribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
}

function update(timestamp) {
    if (!start) start = timestamp;
    var dt = timestamp - start;

    stepPosition(dt);

    colorParticle();
    //window.requestAnimationFrame(update);
}

function stepPosition(dt) {
    gl.useProgram(stepPositionProgram);

    gl.uniform1f(dt_loc, dt);

    positionTarget.updateTexture(gl, stepPositionProgram, 0);
    velocityTarget.updateTexture(gl, stepPositionProgram, 1);

    renderShaderTo(positionTarget);

    positionTarget.swap();
}

function colorParticle() {
    gl.useProgram(colorParticleProgram);
    
    positionTarget.updateTexture(gl, colorParticleProgram, 0);
    velocityTarget.updateTexture(gl, colorParticleProgram, 1);

    renderToScreen();
}

function renderShaderTo(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.writeFramebuffer)

    gl.viewport(0, 0, dataWidth, dataWidth);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    var data = new Uint8Array(dataWidth * dataWidth * 4);
    gl.readPixels(0, 0, dataWidth, dataWidth, gl.RGBA, gl.UNSIGNED_BYTE, data);
    console.log(data);
}

function renderToScreen() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, dataWidth * dataWidth);
}