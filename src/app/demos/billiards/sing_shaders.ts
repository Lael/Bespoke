export const SING_VERT_SHADER = `
uniform vec2 uScale;
uniform vec2 uResolution;
uniform vec2 uTranslation;
uniform mat4 uMatrix;
uniform float uZoom;

varying vec2 vPosition;

void main() {
    gl_Position = vec4(position.xy * uScale.y, -1, 1);
    vPosition = vec2(position.x * uScale.x * uZoom, position.y * uScale.y * uZoom) + uTranslation;
}
`

export const SING_FRAG_SHADER = `
const int MAX_VERTICES = 12;

uniform vec2 uScale;
uniform vec2 uResolution;
uniform vec2 uTranslation;
uniform int uIterations;
uniform int uN;
uniform vec2[MAX_VERTICES] uVertices;

varying vec2 vPosition;

const float PI = 3.141592653589793238;
const float LINE_THICKNESS = 0.001;
const float DELTA = 0.001;

// Vector operations
vec2 project(in vec2 v, in vec2 onto) {
    return onto * dot(v, onto) / (onto.x * onto.x + onto.y * onto.y);
}

vec2 perp(in vec2 v, in vec2 onto) {
    return v - project(v, onto);
}

// Geometry
struct Circle {
    vec2 center;
    float radius;
};

struct Ray {
    vec2 source;
    vec2 direction;
};

struct Line {
    float a;
    float b;
    float c;
};

Line lineFromRay(in Ray ray) {
    vec2 m = vec2(ray.direction.y, -ray.direction.x);
    return Line(m.x, m.y, -(m.x * ray.source.x + m.y * ray.source.y));
}

Line lineFromTwoPoints(in vec2 p1, in vec2 p2) {
    return lineFromRay(Ray(p1, p2 - p1));
}

vec2 intersectLines(in Line l1, in Line l2) {
    float d = l1.a * l2.b - l1.b * l2.a;
    return vec2(
        -l2.b * l1.c + l1.b * l2.c,
        l2.a * l1.c - l1.a * l2.c) / d;
}

vec2 intersectRays(in Ray r1, in Ray r2) {
    return intersectLines(lineFromRay(r1), lineFromRay(r2));
}

bool pointOnRay(in vec2 pt, in Ray ray) {
    vec2 dp = pt - ray.source;
    bool closeToLine = length(perp(dp, ray.direction)) < LINE_THICKNESS;
    bool rightSide = dot(dp, ray.direction) > 0.;
    return closeToLine && rightSide;
}

bool pointOnLine(in vec2 pt, in Line line) {
    return abs(line.a * pt.x + line.b * pt.y + line.c) / length(vec2(line.a,line.b)) < LINE_THICKNESS;
}

bool pointOnCircle(in vec2 pt, in Circle circle) {
    return abs(length(pt - circle.center) - circle.radius) < LINE_THICKNESS;
}

bool pointInCircle(in vec2 pt, in Circle circle) {
    return length(pt - circle.center) - circle.radius < 0.;
}

Ray ccwTangent(in Circle circle, in vec2 pt) {
    vec2 translatedPos = pt - circle.center;
    float d2 = dot(translatedPos, translatedPos); // distance squared
    float r2 = circle.radius * circle.radius; // distance squared
    vec2 resultTranslated = r2 / d2 * translatedPos - circle.radius / d2 * sqrt(d2 - r2)
                                            * vec2(-translatedPos.y, translatedPos.x);
    return Ray(resultTranslated + circle.center, pt - resultTranslated - circle.center);
}

// -1 is left, 0 is on, 1 is right
float lcr(in vec2 pt, in Ray ray) {
    vec2 dp = pt - ray.source;
    return -ray.direction.x * dp.y + ray.direction.y * dp.x;
}

bool pointInsideTable(in vec2 pt) {
    for (int i = 0; i < uN; i++) {
        vec2 v1 = uVertices[i];
        vec2 v2 = uVertices[(i + 1) % uN];
        if (lcr(pt, Ray(v1, v2 - v1)) > 0.) {
            return false;
        }
    }
    return true;
}

bool inForwardRegion(in int n, in vec2 pt) {
    if (n < 0 || n >= uN) {
        return false;
    }
    vec2 vn = uVertices[n];
    vec2 vl = uVertices[(uN + n - 1) % uN];
    vec2 vr = uVertices[(n + 1) % uN];
    return lcr(pt, Ray(vn, vl - vn)) > 0. && lcr(pt, Ray(vn, vr - vn)) > 0.;
}

bool inReverseRegion(in int n, in vec2 pt) {
    if (n < 0 || n >= uN) {
        return false;
    }
    vec2 vn = uVertices[n];
    vec2 vl = uVertices[(uN + n - 1) % uN];
    vec2 vr = uVertices[(n + 1) % uN];
    return lcr(pt, Ray(vn, vr - vn)) < 0. && lcr(pt, Ray(vn, vl - vn)) < 0.;
}

int findForwardRegion(in vec2 pos) {
    for (int i = 0; i < uN; i++) {
        if (inForwardRegion(i, pos)) {
            return i;
        }
    }
    return -1;
}

int findReverseRegion(in vec2 pos) {
    for (int i = 0; i < uN; i++) {
        if (inReverseRegion(i, pos)) {
            return i;
        }
    }
    return -1;
}

vec2 fourthBilliardMap(in vec2 pt) {
    int rreg = findReverseRegion(pt);
    vec2 vf = uVertices[findForwardRegion(pt)];
    vec2 vr = uVertices[rreg];
    
    float l = length(vr - pt);
    vec2 tpf = pt + normalize(pt - vf) * l;
    
    vec2 dr = pt - vr;
    Ray fray = Ray(vr, vec2(-dr.y, dr.x));
    vec2 df = tpf - pt;
    Ray rray = Ray(tpf, vec2(-df.y, df.x));
    vec2 center = intersectRays(fray, rray);
    float radius = length(center - vr);
    Circle cir = Circle(center, radius);
    
    Ray ray;
    for (int i = 0; i < uN; i++) {
        if (i + 1 == rreg) {
            continue;
        }
        vec2 v1 = uVertices[i];
        vec2 v2 = uVertices[(i + 1) % uN];
        vec2 v3 = uVertices[(i + 2) % uN];
        ray = ccwTangent(cir, v2);
        if (lcr(v1, ray) < 0. && lcr(v3, ray) < 0.) {
            break;
        }
    }
    Line tl = lineFromRay(ray);
    return intersectLines(tl, lineFromTwoPoints(vr, pt));
}

bool isFutureSingularity(in vec2 pt, in Ray[MAX_VERTICES] rays) {
    vec2 current = pt;
    bool isSingularity = false;
    for (int i = 0; i < uIterations; i++) {
        for (int j = 0; j < uN; j++) {
            isSingularity = isSingularity || pointOnRay(current, rays[j]);
        }
        current = fourthBilliardMap(current);
    }
    return isSingularity;
}

vec2 pixelToWorld(in vec2 px) {
    return uScale * 2.0 * (px/vec2(uResolution.x)
        - vec2(0.5, 0.5 * uResolution.y / uResolution.x)) + uTranslation;
}

float jacobianDerivative(in vec2 pt) {
    vec2 image = fourthBilliardMap(pt);
    vec2 dx = fourthBilliardMap(pt + vec2(DELTA, 0)) - fourthBilliardMap(pt + vec2(-DELTA, 0));
    vec2 dy = fourthBilliardMap(pt + vec2(0, DELTA)) - fourthBilliardMap(pt + vec2(0, -DELTA));
    return (dx.x * dy.y - dy.x * dx.y) / (4. * DELTA * DELTA);
}

//float clamp(in float val, in float lo, in float hi) {
  //  return min(max(val, lo), hi);
//}

void main()
{   
    if (pointInsideTable(vPosition)) {
       discard;
    }
    
    Ray[MAX_VERTICES] rays;
    for (int i = 0; i < uN; i++) {
        vec2 v2 = uVertices[(i+1) % uN];
        vec2 v1 = uVertices[i];
        rays[i] = Ray(v2, v1 - v2);
    }

    bool singularity = isFutureSingularity(vPosition, rays);
    if (singularity) {
        gl_FragColor = vec4(0.8, 0.3, 0.1, 1);
    } else {
        discard;
    }

    // float jd = jacobianDerivative(vPosition);
    // float lv = log(jd);
    // float s = 0.5;
    // gl_FragColor = vec4(
    //     lv < 0. ? pow(clamp(-lv, 0., 1.), s) : 0.,
    //     lv > 0. ? pow(clamp(lv, 0., 1.), s) / 2. : 0.,
    //     lv > 0. ? pow(clamp(lv, 0., 1.), s) : 0.,
    //     1
    // );
}
`