#pragma include("helper.glsl")

attribute vec2 a_quad;
varying vec2 v_texCoord;

void main() {
	gl_Position = vec4(texToClip(a_quad), 0, 0);
	v_texCoord = a_quad;
}