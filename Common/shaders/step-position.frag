precision mediump float;
uniform sampler2D positionData;
uniform sampler2D velocityData;

uniform float dt;

varying vec2 v_texCoord;

void main() {
	vec2 p = texture2D(positionData, v_texCoord).xy;
	vec2 v = texture2D(velocityData, v_texCoord).xy;
	p += v * dt;

	gl_FragColor = vec4(p, 0, 1);
}