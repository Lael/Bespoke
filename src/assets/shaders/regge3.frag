uniform vec2 uResolution;
uniform int uCellIndex;
uniform float uPhi;
uniform float uTheta;
uniform vec3 uCameraPosition;

const float NODE_BALL_RADIUS = 0.1;
const vec3 NODE_COLOR = vec3(0.8);
const float DECORATION_BALL_RADIUS = 0.5;
const float EDGE_ROD_RADIUS = 0.03;
const vec3 EDGE_COLOR = vec3(0.2);
const float SCALE = 2.0;
const vec3 FOG_COLOR = vec3(0.7);
const float FOG_INTENSITY = 0.05;

const vec3 LIGHT_DIR = normalize(vec3(-1, -2, -3));

struct Ray {
    vec3 source;
    vec3 direction;
};

struct RayIntersection {
    bool intersects;
    float time;
    vec3 point;
    vec3 normal;
    vec3 color;
    int portalIndex;
};

const RayIntersection NO_INT = RayIntersection(false, -1.0, vec3(0), vec3(0), vec3(0), -1);

struct Ball {
    vec3 center;
    float radius;
    vec3 color;
};

struct Cylinder {
    vec3 start;
    vec3 end;
    float radius;
    vec3 color;
};

struct Plane {
    vec4 plane;
    vec3 color;
    int index;
};

const Ball DECORATIONS[8] = Ball[](
Ball(vec3(0, 0, 0), DECORATION_BALL_RADIUS, vec3(0, 0, 0)),
Ball(vec3(0, 0, 0), DECORATION_BALL_RADIUS, vec3(0, 0, 1)),
Ball(vec3(0, 0, 0), DECORATION_BALL_RADIUS, vec3(0, 1, 0)),
Ball(vec3(0, 0, 0), DECORATION_BALL_RADIUS, vec3(1, 0, 0)),
Ball(vec3(0, 0, 0), DECORATION_BALL_RADIUS, vec3(0, 1, 1)),
Ball(vec3(0, 0, 0), DECORATION_BALL_RADIUS, vec3(1, 0, 1)),
Ball(vec3(0, 0, 0), DECORATION_BALL_RADIUS, vec3(1, 1, 0)),
Ball(vec3(0, 0, 0), DECORATION_BALL_RADIUS, vec3(1, 1, 1))
);

const Ball CUBE_NODES[8] = Ball[](
Ball(vec3(+1, +1, +1), NODE_BALL_RADIUS, NODE_COLOR),
Ball(vec3(+1, +1, -1), NODE_BALL_RADIUS, NODE_COLOR),
Ball(vec3(+1, -1, +1), NODE_BALL_RADIUS, NODE_COLOR),
Ball(vec3(+1, -1, -1), NODE_BALL_RADIUS, NODE_COLOR),
Ball(vec3(-1, +1, +1), NODE_BALL_RADIUS, NODE_COLOR),
Ball(vec3(-1, +1, -1), NODE_BALL_RADIUS, NODE_COLOR),
Ball(vec3(-1, -1, +1), NODE_BALL_RADIUS, NODE_COLOR),
Ball(vec3(-1, -1, -1), NODE_BALL_RADIUS, NODE_COLOR)
);

const Cylinder CUBE_EDGES[12] = Cylinder[](
Cylinder(vec3(+1, +1, +1), vec3(+1, +1, -1), EDGE_ROD_RADIUS, EDGE_COLOR),
Cylinder(vec3(+1, +1, -1), vec3(+1, -1, -1), EDGE_ROD_RADIUS, EDGE_COLOR),
Cylinder(vec3(+1, -1, -1), vec3(+1, -1, +1), EDGE_ROD_RADIUS, EDGE_COLOR),
Cylinder(vec3(+1, -1, +1), vec3(+1, +1, +1), EDGE_ROD_RADIUS, EDGE_COLOR),
Cylinder(vec3(+1, +1, +1), vec3(-1, +1, +1), EDGE_ROD_RADIUS, EDGE_COLOR),
Cylinder(vec3(+1, +1, -1), vec3(-1, +1, -1), EDGE_ROD_RADIUS, EDGE_COLOR),
Cylinder(vec3(+1, -1, -1), vec3(-1, -1, -1), EDGE_ROD_RADIUS, EDGE_COLOR),
Cylinder(vec3(+1, -1, +1), vec3(-1, -1, +1), EDGE_ROD_RADIUS, EDGE_COLOR),
Cylinder(vec3(-1, +1, +1), vec3(-1, +1, -1), EDGE_ROD_RADIUS, EDGE_COLOR),
Cylinder(vec3(-1, +1, -1), vec3(-1, -1, -1), EDGE_ROD_RADIUS, EDGE_COLOR),
Cylinder(vec3(-1, -1, -1), vec3(-1, -1, +1), EDGE_ROD_RADIUS, EDGE_COLOR),
Cylinder(vec3(-1, -1, +1), vec3(-1, +1, +1), EDGE_ROD_RADIUS, EDGE_COLOR)
);

const Plane CUBE_FACES[6] = Plane[](
Plane(vec4(-1, 0, 0, -1), vec3(1), 0),
Plane(vec4(+1, 0, 0, -1), vec3(1), 1),
Plane(vec4(0, -1, 0, -1), vec3(1), 2),
Plane(vec4(0, +1, 0, -1), vec3(1), 3),
Plane(vec4(0, 0, -1, -1), vec3(1), 4),
Plane(vec4(0, 0, +1, -1), vec3(1), 5)
);

const mat3 ID = mat3(
+1, 0, 0,
0, +1, 0,
0, 0, +1
);

const mat3 XP = mat3(
+1, 0, 0,
0, 0, -1,
0, +1, 0
);

const mat3 XM = mat3(
+1, 0, 0,
0, 0, +1,
0, -1, 0
);

const mat3 XS = mat3(
-1, 0, 0,
0, +1, 0,
0, 0, +1
);

const mat3 YP = mat3(
0, 0, -1,
0, +1, 0,
+1, 0, 0
);

const mat3 YM = mat3(
0, 0, +1,
0, +1, 0,
-1, 0, 0
);

const mat3 YS = mat3(
+1, 0, 0,
0, -1, 0,
0, 0, +1
);

const mat3 ZP = mat3(
0, -1, 0,
+1, 0, 0,
0, 0, +1
);

const mat3 ZM = mat3(
0, +1, 0,
-1, 0, 0,
0, 0, +1
);

const mat3 ZS = mat3(
+1, 0, 0,
0, +1, 0,
0, 0, -1
);

const mat3 IM = mat3(
-1, 0, 0,
0, -1, 0,
0, 0, -1
);

const mat3 X2 = mat3(
+1, 0, 0,
0, -1, 0,
0, 0, -1
);

const mat3 Y2 = mat3(
-1, 0, 0,
0, +1, 0,
0, 0, -1
);

const mat3 Z2 = mat3(
-1, 0, 0,
0, -1, 0,
0, 0, +1
);

struct Adj {
    int other;
    mat3 rotation;
};

struct Cell {
    int index;
    Adj[6] adjs;
};

uniform Cell uCells[8];

const Cell SPHERE_CELLS[8] = Cell[](
Cell(0, Adj[6](Adj(1, ID), Adj(2, ID), Adj(3, ID), Adj(4, ID), Adj(5, ID), Adj(6, ID))),
Cell(1, Adj[6](Adj(7, ID), Adj(0, ID), Adj(3, ZM), Adj(4, ZP), Adj(5, YM), Adj(6, YP))),
Cell(2, Adj[6](Adj(0, ID), Adj(7, ID), Adj(3, ZP), Adj(4, ZM), Adj(5, YP), Adj(6, YM))),
Cell(3, Adj[6](Adj(1, ZP), Adj(2, ZM), Adj(7, Z2), Adj(0, ID), Adj(5, XM), Adj(6, XP))),
Cell(4, Adj[6](Adj(1, ZM), Adj(2, ZP), Adj(0, ID), Adj(7, Z2), Adj(5, XP), Adj(6, XM))),
Cell(5, Adj[6](Adj(1, YP), Adj(2, YM), Adj(3, XP), Adj(4, XM), Adj(7, Y2), Adj(0, ID))),
Cell(6, Adj[6](Adj(1, YM), Adj(2, YP), Adj(3, XM), Adj(4, XP), Adj(0, ID), Adj(7, Y2))),
Cell(7, Adj[6](Adj(2, ID), Adj(1, ID), Adj(3, Z2), Adj(4, Z2), Adj(5, Y2), Adj(6, Y2)))
);


vec2 screenToWorld(in vec2 coords, in float box) {
    vec2 uv = coords/uResolution.xy - vec2(0.5);
    float ar = uResolution.x / uResolution.y;
    float scale = max(box / ar, box);
    uv = uv * scale * vec2(ar, 1);
    return vec2(uv.x, -uv.y);
}

vec3 throw(in Ray ray, in float t) {
    return ray.source + t * ray.direction;
}

vec3 proj(in vec3 v, in vec3 target) {
    return dot(v, target) * target / dot(target, target);
}

vec3 perp(in vec3 v, in vec3 target) {
    return v- proj(v, target);
}

vec3 illuminate(in RayIntersection ri) {
    //    vec3 c = ri.color;
    vec3 c = max(0.4, dot(ri.normal, LIGHT_DIR)) * ri.color;
    float a = exp(-ri.time * ri.time * FOG_INTENSITY);
    return c * a + FOG_COLOR * (1.0 - a);
}

RayIntersection intersect(in Ray ray, in Ball ball) {
    float a = dot(ray.direction, ray.direction);
    vec3 s0_r0 = ray.source - ball.center;
    float b = 2.0 * dot(ray.direction, s0_r0);
    float c = dot(s0_r0, s0_r0) - (ball.radius * ball.radius);
    float disc = b * b - 4.0 * a * c;
    if (disc >= 0.0) {
        float t = (-b - sqrt(disc)) / (2.0 * a);
        if (t >= 0.0) {
            vec3 pos = throw(ray, t);
            vec3 normal = normalize(pos - ball.center);
            return RayIntersection(true, t, pos, normal, ball.color, -1);
        }
    }
    return NO_INT;
}

RayIntersection intersect(in Ray ray, in Cylinder cyl) {
    vec3 v = normalize(cyl.end - cyl.start);
    vec3 d = ray.direction;
    float dv = dot(d, v);
    vec3 x = ray.source - cyl.start;
    float dx = dot(d, x);
    float xv = dot(x, v);

    float a = dot(d, d) - dv * dv;
    float b = 2.0 * (dx - dv * xv);
    float c = dot(x, x) - xv * xv - cyl.radius * cyl.radius;

    float disc = b * b - 4.0 * a * c;
    if (disc >= 0.0) {
        float t = (-b - sqrt(disc)) / (2.0 * a);
        if (t >= 0.0) {
            vec3 pos = throw(ray, t);
            vec3 ps = pos - cyl.start;
            vec3 pe = pos - cyl.end;
            if (dot(ps, v) >= 0.0 && dot(pe, v) <= 0.0) {
                vec3 normal = normalize(perp(ps, v));
                return RayIntersection(true, t, pos, normal, cyl.color, -1);
            }
        }
    }
    return NO_INT;
}

RayIntersection intersect(in Ray ray, in Plane plane) {
    vec3 p = plane.plane.xyz;
    vec3 normal = normalize(p);
    float dist = dot(normal, ray.source) - plane.plane.w / length(p);

    float cor = dot(normal, ray.direction);
    if (cor >= 0.0) {
        return NO_INT;
    }
    float t = -(dist / cor);
    if (t < 0.0) {
        return NO_INT;
    }
    vec3 pos = throw(ray, t);
    return RayIntersection(true, t, pos, normal, plane.color, plane.index);
}

RayIntersection intersectCube(in Ray ray, in int cellIndex) {
    RayIntersection bestRI = intersect(ray, DECORATIONS[cellIndex]);
    float bestT = bestRI.time;
    for (int i = 0; i < 8; i++) {
        RayIntersection ri = intersect(ray, CUBE_NODES[i]);
        if (ri.intersects && (bestT < 0.0 || ri.time < bestT)) {
            bestRI = ri;
            bestT = ri.time;
        }
    }
    for (int i = 0; i < 12; i++) {
        RayIntersection ri = intersect(ray, CUBE_EDGES[i]);
        if (ri.intersects && (bestT < 0.0 || ri.time < bestT)) {
            bestRI = ri;
            bestT = ri.time;
        }
    }
    for (int i = 0; i < 6; i++) {
        RayIntersection ri = intersect(ray, CUBE_FACES[i]);
        if (ri.intersects && (bestT < 0.0 || ri.time < bestT)) {
            bestRI = ri;
            bestT = ri.time;
        }
    }
    if (cellIndex == uCellIndex) {
        Ball camera = Ball(uCameraPosition, 0.1, vec3(0));
        RayIntersection ri = intersect(ray, camera);
        if (ri.intersects && (bestT < 0.0 || ri.time < bestT)) {
            bestRI = ri;
            bestT = ri.time;
        }
    }

    if (bestT > 0.0) {
        return bestRI;
    }
    return NO_INT;
}

vec3 castRay0(in Ray ray, in Cell cell) {
    RayIntersection ri = intersectCube(ray, cell.index);
    if (ri.intersects) {
        if (ri.portalIndex < 0) {
            return illuminate(ri);
        }
    }
    return FOG_COLOR;
}

vec3 castRay1(in Ray ray, in Cell cell) {
    RayIntersection ri = intersectCube(ray, cell.index);
    if (ri.intersects) {
        if (ri.portalIndex < 0) {
            return illuminate(ri);
        }
        // need a new ray
        // and a new cellIndex
        Adj adj = cell.adjs[ri.portalIndex];
        vec3 src = adj.rotation * (ray.source + 2.0 * ri.normal);
        vec3 dir = adj.rotation * ray.direction;
        return castRay0(Ray(src, dir), SPHERE_CELLS[adj.other]);
    }
    return FOG_COLOR;
}

vec3 castRay2(in Ray ray, in Cell cell) {
    RayIntersection ri = intersectCube(ray, cell.index);
    if (ri.intersects) {
        if (ri.portalIndex < 0) {
            return illuminate(ri);
        }
        // need a new ray
        // and a new cellIndex
        Adj adj = cell.adjs[ri.portalIndex];
        vec3 src = adj.rotation * (ray.source + 2.0 * ri.normal);
        vec3 dir = adj.rotation * ray.direction;
        return castRay1(Ray(src, dir), SPHERE_CELLS[adj.other]);
    }
    return FOG_COLOR;
}

vec3 castRay3(in Ray ray, in Cell cell) {
    RayIntersection ri = intersectCube(ray, cell.index);
    if (ri.intersects) {
        if (ri.portalIndex < 0) {
            return illuminate(ri);
        }
        // need a new ray
        // and a new cellIndex
        Adj adj = cell.adjs[ri.portalIndex];
        vec3 src = adj.rotation * (ray.source + 2.0 * ri.normal);
        vec3 dir = adj.rotation * ray.direction;
        return castRay2(Ray(src, dir), SPHERE_CELLS[adj.other]);
    }
    return FOG_COLOR;
}

vec3 castRay4(in Ray ray, in Cell cell) {
    RayIntersection ri = intersectCube(ray, cell.index);
    if (ri.intersects) {
        if (ri.portalIndex < 0) {
            return illuminate(ri);
        }
        // need a new ray
        // and a new cellIndex
        Adj adj = cell.adjs[ri.portalIndex];
        vec3 src = adj.rotation * (ray.source + 2.0 * ri.normal);
        vec3 dir = adj.rotation * ray.direction;
        return castRay3(Ray(src, dir), SPHERE_CELLS[adj.other]);
    }
    return FOG_COLOR;
}

vec3 castRay5(in Ray ray, in Cell cell) {
    RayIntersection ri = intersectCube(ray, cell.index);
    if (ri.intersects) {
        if (ri.portalIndex < 0) {
            return illuminate(ri);
        }
        // need a new ray
        // and a new cellIndex
        Adj adj = cell.adjs[ri.portalIndex];
        vec3 src = adj.rotation * (ray.source + 2.0 * ri.normal);
        vec3 dir = adj.rotation * ray.direction;
        return castRay4(Ray(src, dir), SPHERE_CELLS[adj.other]);
    }
    return FOG_COLOR;
}

vec3 castRay6(in Ray ray, in Cell cell) {
    RayIntersection ri = intersectCube(ray, cell.index);
    if (ri.intersects) {
        if (ri.portalIndex < 0) {
            return illuminate(ri);
        }
        // need a new ray
        // and a new cellIndex
        Adj adj = cell.adjs[ri.portalIndex];
        vec3 src = adj.rotation * (ray.source + 2.0 * ri.normal);
        vec3 dir = adj.rotation * ray.direction;
        return castRay5(Ray(src, dir), SPHERE_CELLS[adj.other]);
    }
    return FOG_COLOR;
}

vec3 castRay7(in Ray ray, in Cell cell) {
    RayIntersection ri = intersectCube(ray, cell.index);
    if (ri.intersects) {
        if (ri.portalIndex < 0) {
            return illuminate(ri);
        }
        // need a new ray
        // and a new cellIndex
        Adj adj = cell.adjs[ri.portalIndex];
        vec3 src = adj.rotation * (ray.source + 2.0 * ri.normal);
        vec3 dir = adj.rotation * ray.direction;
        return castRay6(Ray(src, dir), SPHERE_CELLS[adj.other]);
    }
    return FOG_COLOR;
}

vec3 castRay8(in Ray ray, in Cell cell) {
    RayIntersection ri = intersectCube(ray, cell.index);
    if (ri.intersects) {
        if (ri.portalIndex < 0) {
            return illuminate(ri);
        }
        // need a new ray
        // and a new cellIndex
        Adj adj = cell.adjs[ri.portalIndex];
        vec3 src = adj.rotation * (ray.source + 2.0 * ri.normal);
        vec3 dir = adj.rotation * ray.direction;
        return castRay7(Ray(src, dir), SPHERE_CELLS[adj.other]);
    }
    return FOG_COLOR;
}

vec3 castRay9(in Ray ray, in Cell cell) {
    RayIntersection ri = intersectCube(ray, cell.index);
    if (ri.intersects) {
        if (ri.portalIndex < 0) {
            return illuminate(ri);
        }
        // need a new ray
        // and a new cellIndex
        Adj adj = cell.adjs[ri.portalIndex];
        vec3 src = adj.rotation * (ray.source + 2.0 * ri.normal);
        vec3 dir = adj.rotation * ray.direction;
        return castRay8(Ray(src, dir), SPHERE_CELLS[adj.other]);
    }
    return FOG_COLOR;
}

void main()
{
    vec2 uv = screenToWorld(gl_FragCoord.xy, SCALE);
    mat3 rPhi = mat3(
    cos(uPhi), 0, -sin(uPhi),
    0, 1, 0,
    +sin(uPhi), 0, cos(uPhi)
    );
    mat3 rTheta = mat3(
    cos(uTheta), -sin(uTheta), 0,
    +sin(uTheta), cos(uTheta), 0,
    0, 0, 1
    );

    vec3 dir = rTheta * rPhi * normalize(vec3(1.0, uv));

    Ray ray = Ray(uCameraPosition, dir);

    gl_FragColor = vec4(castRay7(ray, SPHERE_CELLS[uCellIndex]), 1.0);
}