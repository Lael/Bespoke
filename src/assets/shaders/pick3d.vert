#version 300 es

precision highp float;

layout (location=0) in vec3 lPosition;

uniform mat4 uCamera;
uniform mat4 uModel;

void main() {
    vec4 v = uCamera * uModel * vec4(lPosition, 1.0);
    gl_Position = v / v.w;
}