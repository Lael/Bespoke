#version 300 es

precision highp float;

layout (location=0) in vec2 lPosition;

uniform mat4 uCamera;
uniform mat4 uModel;
uniform float uOrdering;

void main() {
    vec4 position = uCamera * uModel * vec4(lPosition, 0, 1.0);
    gl_Position = vec4(position.x, position.y, uOrdering, 1.0);
}