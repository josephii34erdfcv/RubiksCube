vec2 texToClip(in vec2 coord) {
	return (coord * 2.0 - vec2(1, 1)) * vec2(1, -1);
}