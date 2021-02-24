// Author: I-An (Joseph) Huang
// Class: ECE462 Computer Graphics
// References: https://www.tutorialspoint.com/webgl/webgl_interactive_cube.htm
// https://github.com/FarhadG/webgl-picking/blob/master/indexEncoding.js

const F = 0;
const Ba = 1;
const L = 2;
const R = 3;
const T = 4;
const Bo = 5;
const Mx = 6;
const My = 7;
const Mz = 8;

const X = 0;
const Y = 1;
const Z = 2;

const xSides = [L, Mx, R];
const ySides = [Bo, My, T];
const zSides = [Ba, Mz, F];

const sideToAxis = [Z, Z, X,
    X, Y, Y,
    X, Y, Z];

const IHAT = [1, 0, 0];
const JHAT = [0, 1, 0];
const KHAT = [0, 0, 1];
const allAxes = [IHAT, JHAT, KHAT];

const RED = [1, 0, 0];
const GREEN = [0, 1, 0];
const YELLOW = [1, 1, 0];
const CYAN = [0, 1, 1];
const BLUE = [0, 0, 1];
const WHITE = [1, 1, 1];
const BLACK = [0, 0, 0];

const sideLength = 0.3;
const edgeWidth = 0.015;

const STATE_NONE = 0;
const STATE_MOVE = 1;
const STATE_CLICK = 2;
const STATE_UNCLICK = 3;
const STATE_DRAG = 4;
const STATE_CHOOSE = 5;
const STATE_SIDE = 6;
const STATE_RETURN = 7;
const STATE_AUTO = 8;
const STATE_LOAD = 9;
var game_state = STATE_NONE;

var gl;
var canvas;
var program;
var init_points = [];
var points = [];
var colors = [];
var pick_squares = [];
var cubes = [];
var vPoints;

const AMORTIZATION = 0.95;
var old_x, old_y;
var dX = 0, dY = 0;
var vMatrix;
var picking;
var mo_matrix = rotateX(0);

var clickedPosition = [];
var clickedSide;

//used for both return and auto states
var rotAxis;
var nAxis;
var rotSide;
var rotTheta = 0;
var rotSpeed = 2;
var rotDir = 1;
var numTurns = 0;

var autoTurns = 0;

var reader = new FileReader();

// Defining the Square class
class Square {
    constructor(id, s) {
        this.pick_id = id; //unique id for every square
        this.side = s; // T, Bo, F, Ba, L, R
    }

    updatePosition(axis, clockwise) {
        this.side = nextPosition(this.side, axis, clockwise);
    };
}

// Defining the Cube class
class Cube {
    constructor(pos, ind, sqrs) {
        this.position = pos; // array of T, Bo, F, Ba, L, R (Mx, My, Mz)
        this.indices = ind; // indices to the global array 'points'
        this.squares = sqrs; // array of squares
    }

    //returns true if cube is facing given side
    isFacing(side) {
        return this.position.includes(side);
    };

    //update global array 'points' to point of rotation
    rotate(axis, theta) {
        var rot;
        if (axis === X)
            rot = rotateX(theta);
        else if (axis === Y)
            rot = rotateY(theta);
        else
            rot = rotateZ(theta);

        for (let i in this.indices) {
            var ind = this.indices[i];
            points[ind] = vec3(mult(rot, vec4(points[ind])));
        }
    };

    //update this.position and sides of squares
    //clockwise as seen from positive axis
    updatePosition(axis, clockwise) {
        this.position = this.position.map(function (pos) {
            return nextPosition(pos, axis, clockwise);
        });

        this.squares.forEach(function (square) {
            square.updatePosition(axis, clockwise);
        });
    };
}

//Dealing with inputs

var mouseDown = function (e) {
    if (e.button != 0) return false;

    if (game_state == STATE_UNCLICK) {
        if (pickSide(e.clientX, canvas.height - e.clientY))
            game_state = STATE_CHOOSE;
        else
            game_state = STATE_NONE;
    }
    else if (game_state == STATE_RETURN 
        || game_state == STATE_AUTO) {

    } else {
        game_state = STATE_CLICK;
        old_x = e.pageX, old_y = e.pageY;
    }

    e.preventDefault();
};

//update clickedSide and clickedPosition
function pickSide(xNOT, yNOT) {
    var pixels = new Uint8Array(4);
    
    gl.uniform1i(picking, true);
    draw();
    gl.readPixels(xNOT, yNOT, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.uniform1i(picking, false);
    draw();

    for (let i in cubes) {
        var cube = cubes[i];
        for (let j in cube.squares) {
            var square = cube.squares[j]
            if (pixels[3] == square.pick_id) {
                clickedSide = square.side;
                clickedPosition = cube.position;
                return true;
            }
        }
    }

    return false;
}

var mouseUp = function (e) {
    if (game_state == STATE_DRAG)
        game_state = STATE_MOVE;
    else if (game_state == STATE_SIDE) { //update numTurns and rotDir
        numTurns = Math.floor((rotTheta + 45) / 90);
        rotDir = rotTheta % 90 < 45 ? -1 : 1;
        game_state = STATE_RETURN;
    } else if (game_state == STATE_CLICK)
        game_state = STATE_UNCLICK;
    else if (game_state == STATE_CHOOSE)
        game_state = STATE_NONE;

    e.preventDefault();
};

var mouseMove = function (e) {
    if (length([e.pageX - old_x, e.pageY - old_y]) == 0) return false;
    if (game_state == STATE_DRAG || game_state == STATE_SIDE) {
        dX = (e.pageX - old_x) * 360 / canvas.width;
        dY = (e.pageY - old_y) * 360 / canvas.height;
        old_x = e.pageX, old_y = e.pageY;
    } else if (game_state == STATE_CHOOSE) { //update nAxis, rotAxis, rotSide
        var vect = [old_y - e.pageY, old_x - e.pageX, 0];
        var axisToSide = [-1, -1, -1];
        clickedPosition.forEach(function (side) {
            axisToSide[sideToAxis[side]] = side;
        });

        var nAxes = [X, Y, Z];
        nAxes = nAxes.filter(function (axis) {
            return sideToAxis[clickedSide] != axis;
        });

        var axes = [allAxes[nAxes[0]], allAxes[nAxes[1]]];
        axes = axes.map(function (v) {
            v = vec3(mult(mo_matrix, vec4(v)));
            return vec3(normalize([v[0], v[1], 0, 0], true));
        });

        var choose = Math.abs(dot(vect, axes[0])) < 
            Math.abs(dot(vect, axes[1])) ? 1 : 0;
        
        nAxis = nAxes[choose];
        rotAxis = axes[choose];
        rotSide = axisToSide[nAxis];
        rotTheta = 0;

        game_state = STATE_SIDE;
    } else if (game_state == STATE_CLICK)
        game_state = STATE_DRAG;
    else if (game_state == STATE_UNCLICK)
        game_state = STATE_NONE;

    e.preventDefault();
};

var updateTurns = function(e) {
    autoTurns = e.target.value;
    e.preventDefault();
}

var permute = function(e) {
    if (autoTurns < 1) return;

    rotTheta = 0;
    rotSide = Math.floor(Math.random() * 9);
    rotDir = Math.floor(Math.random() * 2) * 2 - 1;
    nAxis = sideToAxis[rotSide];
    autoTurns--;
    game_state = STATE_AUTO;

    e.preventDefault();
}

var setSpeed = function(e) {
    rotSpeed = e.target.value / 25;

    e.preventDefault();
}

var saveFile = function(e) {
    var cubeState = "";

    for (let i in cubes) {
        let cube = cubes[i];
        for (let j in cube.position) {
            cubeState += String(cube.position[j]);
        }
        for (let j in cube.squares) {
            cubeState += String(cube.squares[j].side);
        }
    }
    cubeState += "\n";

    for (let i in points) {
        for (let j in points[i]) {
            cubeState += (String(points[i][j]) + " ");
        }
    }
    cubeState += "\n";

    for (let i in mo_matrix) {
        for (let j in mo_matrix[i]) {
            cubeState += (String(mo_matrix[i][j]) + " ");
        }
    }

    var fileName = document.getElementById("fileName").value;
    download(cubeState, fileName + ".txt", "text/plain");

    e.preventDefault();
}

var loadFile = function(e) {
    var x = document.getElementById("file");
    if (x.files.length == 0) return;
    var file = x.files[0];
    reader.readAsText(file);
    game_state = STATE_LOAD;
}

//function for loading webpage

window.onload = function init() {
    console.log(points.length);

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) { alert("WebGL isn't available"); }

    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mouseup", mouseUp);
    canvas.addEventListener("mouseout", mouseUp);
    canvas.addEventListener("mousemove", mouseMove);

    document.getElementById("turns").addEventListener("change", updateTurns);
    document.getElementById("permute").addEventListener("click", permute);
    document.getElementById("slider").addEventListener("change", setSpeed);
    document.getElementById("saveFile").addEventListener("click", saveFile);
    document.getElementById("loadFile").addEventListener("click", loadFile);


    //initialize Cubes
    var geometry;
    {
        let sl = sideLength, ew = edgeWidth;
        geometry = [[[0, ew, ew], [ew, 0, ew], [ew, ew, 0]],
                    [[0, ew, sl-ew], [ew, 0, sl-ew], [ew, ew, sl]],
                    [[0, sl-ew, ew], [ew, sl, ew], [ew, sl-ew, 0]],
                    [[0, sl-ew, sl-ew], [ew, sl, sl-ew], [ew, sl-ew, sl]],
                    [[sl, ew, ew], [sl-ew, 0, ew], [sl-ew, ew, 0]],
                    [[sl, ew, sl-ew], [sl-ew, 0, sl-ew], [sl-ew, ew, sl]],
                    [[sl, sl-ew, ew], [sl-ew, sl, ew], [sl-ew, sl-ew, 0]],
                    [[sl, sl-ew, sl-ew], [sl-ew, sl, sl-ew], [sl-ew, sl-ew, sl]]];
    }

    const coord = [-sideLength * 1.5, -sideLength * 0.5, sideLength * 0.5];
    for (let i in coord) {
        for (let j in coord) {
            for (let k in coord) {
                var cube = initCube([coord[i], coord[j], coord[k]],
                    [xSides[i], ySides[j], zSides[k]], geometry);
                cubes.push(cube);
            }
        }
    }

    for (let i in points) {
        init_points.push([]);
        for (let j in points[i]) {
            init_points[i].push(points[i][j]);
        }
    }
    //  Configure WebGL

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    gl.clearDepth(1);

    //  Load shaders and initialize attribute buffers

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // enable hidden-surface removal

    gl.enable(gl.DEPTH_TEST);

    // Initialize Array Buffers

    vPoints = initArrayBuffer(flatten(points), gl.FLOAT, "vPosition", 3, gl.DYNAMIC_DRAW);
    initArrayBuffer(flatten(colors), gl.FLOAT, "vColor", 3, gl.STATIC_DRAW);
    initArrayBuffer(new Uint8Array(pick_squares), gl.UNSIGNED_BYTE, "vPick", 1, gl.STATIC_DRAW);

    //rotation matrix

    vMatrix = gl.getUniformLocation(program, "vMatrix");
    gl.uniformMatrix4fv(vMatrix, false, flatten(mo_matrix));
    
    //set picking

    picking = gl.getUniformLocation(program, "picking");
    gl.uniform1i(picking, false);

    render();
};

function nextPosition (pos, axis, clockwise) {
    var nextPosX = [Bo, T, L, R, F, Ba, Mx, Mz, My];
    var nextPosY = [R, L, F, Ba, T, Bo, Mz, My, Mx];
    var nextPosZ = [F, Ba, Bo, T, L, R, My, Mx, Mz];
    var nextPos = [nextPosX, nextPosY, nextPosZ];

    if (clockwise)
        return nextPos[axis][pos];
    else
        return nextPos[axis].indexOf(pos);
}

//initializing functions, part of loading

function initSquare(a, b, c, d, pos, side, color) {
    points.push(a, b, c, d);

    if (pos.includes(side)) {
        colors.push(color, color, color, color);
        pick_squares.push(initSquare.counter, initSquare.counter,
            initSquare.counter, initSquare.counter);
        initSquare.counter++;
        return new Square(initSquare.counter - 1, side);
    } else {
        colors.push(BLACK, BLACK, BLACK, BLACK);
        pick_squares.push(255, 255, 255, 255);
        return new Square(255, side);
    }
}

initSquare.counter = 0;

//     2------6
//    /|     /|
//   3-0---7--4 
//   |/    | /
//   1-----5
// 96 points per cube
function initCube(vCube, position, geometry) {
    var vertices = new Array(8);
    for (let i in geometry)
    {
        vertices[i] = new Array(3);
        for (let j in geometry[i])
            vertices[i][j] = add(vCube, geometry[i][j]);
    }

    var indices = [];
    var first = points.length;
    for (let i = 0; i < 96; i++)
        indices.push(first + i);

    var s1 = initSquare(vertices[1][Z], vertices[5][Z], vertices[3][Z], vertices[7][Z], 
        position, F, WHITE); //Front
    var s2 = initSquare(vertices[0][Z], vertices[4][Z], vertices[2][Z], vertices[6][Z], 
        position, Ba, RED); //Back
    var s3 = initSquare(vertices[1][X], vertices[0][X], vertices[3][X], vertices[2][X], 
        position, L, YELLOW); //Left
    var s4 = initSquare(vertices[5][X], vertices[4][X], vertices[7][X], vertices[6][X], 
        position, R, GREEN); //right
    var s5 = initSquare(vertices[3][Y], vertices[7][Y], vertices[2][Y], vertices[6][Y], 
        position, T, CYAN); //top
    var s6 = initSquare(vertices[1][Y], vertices[5][Y], vertices[0][Y], vertices[4][Y], 
        position, Bo, BLUE); //bottom
    var sqrs = [s1, s2, s3, s4, s5, s6];
    sqrs = sqrs.filter(function(square, ind) {
        return position.includes(ind);
    })

    // drawing edges of cube
    points.push(vertices[0][X], vertices[0][Y], vertices[1][X], vertices[1][Y],
        vertices[2][X], vertices[2][Y], vertices[3][X], vertices[3][Y],
        vertices[4][X], vertices[4][Y], vertices[5][X], vertices[5][Y],
        vertices[6][X], vertices[6][Y], vertices[7][X], vertices[7][Y],
        vertices[0][X], vertices[0][Z], vertices[2][X], vertices[2][Z],
        vertices[1][X], vertices[1][Z], vertices[3][X], vertices[3][Z],
        vertices[4][X], vertices[4][Z], vertices[6][X], vertices[6][Z],
        vertices[5][X], vertices[5][Z], vertices[7][X], vertices[7][Z],
        vertices[0][Y], vertices[0][Z], vertices[4][Y], vertices[4][Z],
        vertices[1][Y], vertices[1][Z], vertices[5][Y], vertices[5][Z],
        vertices[2][Y], vertices[2][Z], vertices[6][Y], vertices[6][Z],
        vertices[3][Y], vertices[3][Z], vertices[7][Y], vertices[7][Z]);

    for (let i in vertices) {
        for (let j in vertices[i]) {
            points.push(vertices[i][j]);
        }
    }

    for (let i = 0; i < 72; i++) {
        colors.push(BLACK);
        pick_squares.push(255);
    }

    return new Cube(position, indices, sqrs);
}

function initArrayBuffer(data, type, attribute, num, draw) {
    var a_Attribute = gl.getAttribLocation(program, attribute);
    var buffer      = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, draw);
    gl.vertexAttribPointer(a_Attribute, num, type, true, 0, 0);
    gl.enableVertexAttribArray(a_Attribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
}

function render() {

    //update data
    var vect = [-dY, -dX, 0];
    var norm = length(vect);

    switch (game_state) {
        case STATE_NONE:
            break;

        case STATE_MOVE:
            dX *= AMORTIZATION, dY *= AMORTIZATION;
            if (norm != 0)
                mo_matrix = mult(rotate(norm, vect), mo_matrix);
            gl.uniformMatrix4fv(vMatrix, false, flatten(mo_matrix));
            break;

        case STATE_CLICK:
            break;

        case STATE_UNCLICK:
            break;

        case STATE_DRAG:
            if (norm != 0)
                mo_matrix = mult(rotate(norm, vect), mo_matrix);
            gl.uniformMatrix4fv(vMatrix, false, flatten(mo_matrix));
            dY = 0, dX = 0;
            break;

        case STATE_CHOOSE:
            break;

        case STATE_SIDE:
            var norm2 = dot(vect, rotAxis);
            for (let i in cubes) {
                if (cubes[i].isFacing(rotSide)) {
                    cubes[i].rotate(nAxis, norm2);
                }
            }
            rotTheta += norm2;

            if (rotTheta > 360)
                rotTheta -= 360;
            else if (rotTheta < 0)
                rotTheta += 360;

            dY = 0, dX = 0;
            break;

        case STATE_RETURN:
            rotTheta += rotDir * rotSpeed;
            if ((numTurns * 90 - rotTheta) * rotDir < 0) {
                var lastRot = numTurns * 90 - rotTheta + rotDir * rotSpeed;
                numTurns = numTurns % 4;
                for (let i in cubes) {
                    if (cubes[i].isFacing(rotSide)) {
                        cubes[i].rotate(nAxis, lastRot);
                        for (let j = 0; j < numTurns; j++)
                            cubes[i].updatePosition(nAxis, true);
                    }
                }

                var solved = true;
                for (let i in points) {
                    for (let j in points[i]) {
                        if (points[i][j] - init_points[i][j] > 0.00001) {
                            solved = false;
                            break;
                        }
                    }
                    if (!solved)
                        break;
                }

                if (solved) {
                    var para = document.createElement("P");
                    para.innerText = "Solved!";
                    document.getElementById("text").appendChild(para);
                }

                game_state = STATE_NONE;
                break;
            }

            for (let i in cubes) {
                if (cubes[i].isFacing(rotSide)) {
                    cubes[i].rotate(nAxis, rotDir * rotSpeed);
                }
            }
            break;

        case STATE_AUTO:
            rotTheta += rotSpeed;
            if (rotTheta >= 90) {
                var lastRot = (90 - rotTheta + rotSpeed) * rotDir;
                var clockwise = (rotDir == 1);
                for (let i in cubes) {
                    if (cubes[i].isFacing(rotSide)) {
                        cubes[i].rotate(nAxis, lastRot);
                        cubes[i].updatePosition(nAxis, clockwise);
                    }
                }

                if (autoTurns <= 0) {
                    document.getElementById("turns").value = 0;
                    game_state = STATE_NONE;
                } else {
                    rotTheta = 0;
                    rotSide = Math.floor(Math.random() * 9);
                    rotDir = Math.floor(Math.random() * 2) * 2 - 1;
                    nAxis = sideToAxis[rotSide];
                    autoTurns--;
                }
                break;
            }

            for (let i in cubes) {
                if (cubes[i].isFacing(rotSide)) {
                    cubes[i].rotate(nAxis, rotDir * rotSpeed);
                }
            }
            break;
        case STATE_LOAD:
            if (reader.readyState == 2) {
                var txt = reader.result.split("\n");
                var cs = txt[0].split("").map(Number);
                var pts = txt[1].split(" ").map(Number);
                var mmtx = txt[2].split(" ").map(Number);
                var count = 0;
                for (let i in cubes) {
                    let cube = cubes[i];
                    for (let j in cube.position) {
                        cube.position[j] = cs[count];
                        count++;
                    }
                    for (let j in cube.squares) {
                        cube.squares[j].side = cs[count];
                        count++;
                    }
                }
                count = 0;
                for (let i in points) {
                    for (let j in points[i]) {
                        points[i][j] = pts[count];
                        count++;
                    }
                }
                count = 0;
                for (let i in mo_matrix) {
                    for (let j in mo_matrix[i]) {
                        mo_matrix[i][j] = mmtx[count];
                        count++;
                    }
                }
                gl.uniformMatrix4fv(vMatrix, false, flatten(mo_matrix));
                game_state = STATE_NONE;
            }
            break;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vPoints);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.DYNAMIC_DRAW);

    draw();

    window.requestAnimationFrame(render);
}

// draw frame
function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (let i = 0; i < 27; i++) {
        drawCube(i * 96);
    }
}

function drawCube(ind) {
    //draw rectangles
    for (let i = 0; i < 18; i++) {
        gl.drawArrays(gl.TRIANGLE_STRIP, ind + i * 4 , 4);
    }
    ind += 72;

    //draw triangles
    gl.drawArrays(gl.TRIANGLES, ind, 24);
}