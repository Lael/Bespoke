varying vec3 vPosition;

uniform bool uDark;
uniform float uTime;
uniform int uDepth;
uniform int uModel;// 0 - UHP, 1 - Poincare disk, 2 - Klein disk
uniform vec2 uHighlight;

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

vec2 cdiv(vec2 a, vec2 b) {
    return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y) / dot(b, b);
}

vec2 diskToUHP(vec2 w) {
    return cmul(vec2(0, 1), cdiv(vec2(1, 0) + w, vec2(1, 0) - w));
}

vec2 applyModelTransformation(vec2 p) {
    switch (uModel) {
        case 0:
        return p;
        case 1:
        return diskToUHP(p);
        case 2:
        float s = length(p);
        return diskToUHP(p / (1.0 + sqrt(1.0 - s * s)));
    }
    return p;
}

bool fundamentalDomain(vec2 point) {
    return abs(point.x) < 0.5 && length(point) > 1.0;
}

void main()
{
    vec2 p = applyModelTransformation(vPosition.xy);
    vec2 h = applyModelTransformation(uHighlight);

    vec3 color = vec3(0.5);
    if (p.y <= 0.0) {
        gl_FragColor = vec4(color, 1);
        return;
    }

    for (int i = 0; i < uDepth; i++) {
        if (fundamentalDomain(p)) {
            if (fundamentalDomain(h)) color = vec3(1, 0, 0);
            else color = vec3(i % 2);
            break;
        }
        if (p.x > 0.5) {
            p.x -= 1.0;
            h.x -= 1.0;
        } else if (p.x < -0.5) {
            p.x += 1.0;
            h.x += 1.0;
        } else {
            p = p / dot(p, p);
            h = h / dot(h, h);
        }
    }

    if (uDark) {
        gl_FragColor = vec4(vec3(1) - color, 1);
    } else {
        gl_FragColor = vec4(color, 1);
    }
}