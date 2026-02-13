varying vec3 vPosition;// what we pass to fragment

void main() {
    vPosition = position;// position is the built-in attribute (local/object space)
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}