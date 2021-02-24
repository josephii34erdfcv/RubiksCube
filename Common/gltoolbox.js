// Name: I-An Huang
// Class: ECE462 Computer Graphics

function initTexture(gl, internalFormat, width, height, format, type, data) {
    // Create Texture.
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture); 

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Set image data
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, data);

    return texture;
}

function initFramebuffer(gl, texture) {
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    return fbo;
}

class Target {

    // binds texture to current active unit
    constructor(gl, name_text, width, height, internalFormat, format, type, data) {
        this.name = name_text;

        // Create Texture.
        this.readTexture = initTexture(gl, internalFormat, width, height, format, type, data);
        this.writeTexture = initTexture(gl, internalFormat, width, height, format, type, null);

        // Create Frame Buffer
        this.readFramebuffer = initFramebuffer(gl, this.readTexture);
        this.writeFramebuffer = initFramebuffer(gl, this.writeTexture);
    }

    // &this.name = index
    // texture[index] = this.texture
    updateTexture(gl, program, index) {
        var u_imageLoc = gl.getUniformLocation(program, this.name);
        gl.uniform1i(u_imageLoc, index);

        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, this.readTexture);
    }

    swap() {
        let tempTexture = this.readTexture;
        this.readTexture = this.writeTexture;
        this.writeTexture = tempTexture;
        let tempFramebuffer = this.readFramebuffer;
        this.readFramebuffer = this.writeFramebuffer;
        this.writeFramebuffer = tempFramebuffer;
    }
}