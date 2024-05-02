#version 300 es

precision highp float;

layout (location=0) in vec3 lPosition;
layout (location=1) in vec4 lColor;

out vec4 vColor;

uniform mat4 uCamera;
uniform mat4 uModel;

void main() {
    vec4 v = uCamera * uModel * vec4(lPosition, 1.0);
    gl_Position = v / v.w;
    vColor = lColor;
}
