uniform sampler2D positionData;
uniform sampler2D velocityData;

attribute vec2 particleUV;
varying vec4 color;

vec2 simToClip(vec2 coord);

void main() {
	vec2 p = simToClip(texture2D(positionData, particleUV).xy);
	vec2 v = texture2D(velocityData, particleUV).xy;
	
	gl_PointSize = 3.0;
	gl_Position = vec4(p, 0.0, 1.0);
	float speed = length(v);
	float x = clamp(speed * 4.0, 0., 1.);
	color.rgb = (
			mix(vec3(40.4, 0.0, 35.0) / 300.0, vec3(0.2, 47.8, 100) / 100.0, x)
			+ (vec3(63.1, 92.5, 100) / 100.) * x*x*x * .1
	);
	color.a = 1.0;
}

vec2 simToClip(vec2 coord) {
	return (coord * 2.0 - vec2(1, 1)) * vec2(1, -1);
}