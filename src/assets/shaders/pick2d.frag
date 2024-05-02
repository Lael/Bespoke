#version 300 es

precision highp float;

uniform vec4 uId;

out vec4 fragColor;

void main() {
    fragColor = uId;
}