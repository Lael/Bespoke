varying vec3 vPosition;

#define MAX_VERTICES 12
#define FAR_AWAY 100.0

uniform int uVertexCount;
uniform vec2 uVertices[MAX_VERTICES];
uniform float uLambda;
uniform int uIterations;

vec2 closestPoint(vec2 p, vec2 v1, vec2 v2) {
    vec2 d = v2 - v1;
    float denom = dot(d, d);
    if (denom <= 0.0) return v1;

    float t = dot(p - v1, d) / denom;
    t = clamp(t, 0.0, 1.0);
    return v1 + t * d;
}

vec2 furthestPoint(vec2 p) {
    float bestD = 0.0;
    vec2 bestP = p;
    for (int i = 0; i < uVertexCount; i++) {
        float d = length(p - uVertices[i]);
        if (d > bestD) {
            bestD = d;
            bestP = uVertices[i];
        }
    }
    return bestP;
}

vec2 iterate(vec2 p) {
    float bestD = 1e6;
    vec2 bestCP = p;
    for (int i = 0; i < uVertexCount; i++) {
        vec2 v1 = uVertices[i];
        vec2 v2 = uVertices[(i + 1) % uVertexCount];
        vec2 cp = closestPoint(p, v1, v2);
        float d = length(cp - p);
        if (d < bestD) {
            bestD = d;
            bestCP = cp;
        }
    }
    return bestCP + uLambda * (p - bestCP);
    //    vec2 bestP = furthestPoint(p);
    //    return bestP + uLambda * (p - bestP);
}

vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d){
    return a + b*cos(6.28318*(c*t+d));
}

vec3 color(float t) {
    return cosPalette(t, vec3(0.2, 0.7, 0.4), vec3(0.6, 0.9, 0.2), vec3(0.6, 0.8, 0.7), vec3(0.5, 0.1, 0.0));
}

void main() {
    vec2 p = vPosition.xy;

    int i = 0;
    for (; i < uIterations; i++) {
        if (length(p) > FAR_AWAY) {
            break;
        }
        vec2 next = iterate(p);
        p = next;
    }
    //    float factor = clamp(length(p), 0.0, 1.0);
    //    if (length(p) > 1) factor = 1.0;
    //    else factor = 0.0;
    float factor = 1. - float(i) / float(uIterations);

    gl_FragColor = vec4(vec3(factor), 1.0);
}