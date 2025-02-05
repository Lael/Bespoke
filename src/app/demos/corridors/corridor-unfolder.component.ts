import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    BufferGeometry,
    Color,
    Line as ThreeLine,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    Points,
    PointsMaterial,
    Shape,
    ShapeGeometry,
    Vector2
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {Collision, PhaseTile, Polygon, Ray, SubCorridor} from "./corridors.component";
import {closeEnough, normalizeAngle} from "../../../math/math-helpers";
import {LineSegment} from "../../../math/geometry/line-segment";
import {Complex} from "../../../math/complex";
import {Line} from "../../../math/geometry/line";
import {CommonModule} from "@angular/common";

const CLEAR_COLOR = new Color(0x123456);
const EPSILON = 0.000_000_1;

@Component({
    selector: 'corridor-unfolder',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule]
})
export class CorridorUnfolderComponent extends ThreeDemoComponent implements OnChanges {
    @Input() polygon: Polygon | undefined = undefined;
    @Input() length: number | undefined;
    @Input() state!: Vector2;

    dirty = false;

    orbitControls: OrbitControls;

    @Output()
    phaseBoxesChange = new EventEmitter<PhaseTile>();

    constructor() {
        super();
        this.useOrthographic = true;
        this.orbitControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.renderer.setClearColor(CLEAR_COLOR);
    }

    override frame(dt: number) {
        if (!this.dirty || this.state === undefined || this.polygon === undefined || this.length === undefined) return;
        this.dirty = false;
        this.scene.clear();
        const unfoldingVertices: Vector2[] = [];
        let polygon = this.polygon;
        const startIndex = this.polygon.sideIndex(this.state.x);
        const endIndex = this.polygon.sideIndex(this.state.y);
        if (startIndex === endIndex) return;
        const start = this.polygon.parametrization(this.state.x);
        const end = this.polygon.parametrization(this.state.y);
        const dir = end.clone().sub(start).normalize();
        const src = start.clone().addScaledVector(dir, EPSILON);
        let ray: Ray = {src, dir};
        let collision: Collision | undefined = undefined;
        const leftPoints: Vector2[] = [this.polygon.vertices[startIndex]];
        const rightPoints: Vector2[] = [this.polygon.vertices[(startIndex + 1) % this.polygon.n]];
        const sideIndices = [startIndex];
        for (let i = 0; i < this.length; i++) {
            for (let j = 0; j < polygon.n; j++) {
                const v1 = polygon.vertices[j];
                const v2 = polygon.vertices[(j + 1) % this.polygon.n];
                unfoldingVertices.push(v1, v2);
            }
            try {
                collision = polygon.cast(ray);
                sideIndices.push(collision.sideIndex);
                polygon = polygon.reflect(collision.sideIndex);
                ray.src = collision.point.clone().addScaledVector(dir, EPSILON);
                leftPoints.push(collision.left);
                rightPoints.push(collision.right);
            } catch (e) {
                break;
            }
        }
        console.log(sideIndices.join(', '));

        // compute corridor with tracked vertices
        // draw unfoldings, ray, and corridor
        const unfoldingGeometry = new BufferGeometry().setFromPoints(unfoldingVertices);
        const unfoldingMaterial = new LineBasicMaterial({color: 0xffffff});
        const unfolding = new LineSegments(unfoldingGeometry, unfoldingMaterial);
        this.scene.add(unfolding);

        const rayGeometry = new BufferGeometry().setFromPoints([start, collision?.point || end]);
        const rayMaterial = new LineBasicMaterial({color: 0xffff00});
        const rayLine = new LineSegments(rayGeometry, rayMaterial);
        this.scene.add(rayLine);

        const leftDotMaterial = new PointsMaterial({size: 5, color: 0xff0000});
        const rightDotMaterial = new PointsMaterial({size: 5, color: 0x00ff00});
        const leftDotGeometry = new BufferGeometry().setFromPoints(leftPoints);
        const rightDotGeometry = new BufferGeometry().setFromPoints(rightPoints);
        this.scene.add(new Points(leftDotGeometry, leftDotMaterial));
        this.scene.add(new Points(rightDotGeometry, rightDotMaterial));

        const leftConvex = convexList({src, dir}, leftPoints, true);
        const rightConvex = convexList({src, dir}, rightPoints, false);
        this.scene.add(new ThreeLine(
            new BufferGeometry().setFromPoints(leftConvex),
            new LineBasicMaterial({color: 0xff0000})));
        this.scene.add(new ThreeLine(
            new BufferGeometry().setFromPoints(rightConvex),
            new LineBasicMaterial({color: 0x00ff00})));

        const corridor = this.findSubCorridors({src, dir}, leftPoints, rightPoints);
        const corridorShape = new Mesh(
            new ShapeGeometry(new Shape().setFromPoints(corridor.vertices)),
            new MeshBasicMaterial({color: 0x008888})
        );
        corridorShape.translateZ(-1);
        this.scene.add(corridorShape);


        this.phaseBoxesChange.emit({subCorridors: corridor.subCorridors, word: sideIndices});
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!!changes['vertices']?.currentValue) {
            this.polygon = new Polygon(changes['vertices'].currentValue);
        }
        this.dirty = true;
    }

    findSubCorridors(ray: Ray, leftVertices: Vector2[], rightVertices: Vector2[]): Corridor {
        const startSegment = new LineSegment(Complex.fromVector2(leftVertices[0]), Complex.fromVector2(rightVertices[0]));
        const endSegment = new LineSegment(
            Complex.fromVector2(rightVertices[rightVertices.length - 1]),
            Complex.fromVector2(leftVertices[leftVertices.length - 1]));
        const portConvex = convexList(ray, leftVertices, true);
        const starboardConvex = convexList(ray, rightVertices, false);

        // Front and back "slashes" are the most extremely angled rays that make it down the corridor
        let backStart = 0;
        let backEnd = portConvex.length - 1;
        let flag = true;
        while (flag) {
            flag = false;
            while (backStart < starboardConvex.length - 1 &&
            orientation(starboardConvex[backStart], portConvex[backEnd], starboardConvex[backStart + 1]) > 0) {
                backStart++;
                flag = true;
            }
            while (backEnd > 1 &&
            orientation(portConvex[backEnd], starboardConvex[backStart], portConvex[backEnd - 1]) > 0) {
                backEnd--;
                flag = true;
            }
        }

        let frontStart = 0;
        let frontEnd = starboardConvex.length - 1;
        flag = true;
        while (flag) {
            flag = false;
            while (frontStart < portConvex.length - 1 &&
            orientation(portConvex[frontStart], starboardConvex[frontEnd], portConvex[frontStart + 1]) < 0) {
                frontStart++;
                flag = true;
            }
            while (frontEnd > 1 &&
            orientation(starboardConvex[frontEnd], portConvex[frontStart], starboardConvex[frontEnd - 1]) < 0) {
                frontEnd--;
                flag = true;
            }
        }

        // *———————* <-- end edge
        //  \     / <-- "front"
        //   *   *
        //   |\ /|
        //   | X |
        //   |/ \|
        //   *   *
        //  /     \ <-- "back"
        // *———————*  <-- start edge

        // Using the two slashes, we will identify the vertices of the corridor. This seems to be mostly working
        const frontLine = Line.throughTwoPoints(portConvex[frontStart], starboardConvex[frontEnd]);
        const backLine = Line.throughTwoPoints(starboardConvex[backStart], portConvex[backEnd]);
        const vertices: Vector2[] = [];
        const sb = startSegment.intersectLine(backLine)?.toVector2() || starboardConvex[backStart];
        const ef = endSegment.intersectLine(frontLine)?.toVector2() || starboardConvex[frontEnd];
        const eb = endSegment.intersectLine(backLine)?.toVector2() || portConvex[backEnd];
        const sf = startSegment.intersectLine(frontLine)?.toVector2() || portConvex[frontEnd];
        vertices.push(sb);
        for (let i = Math.max(backStart, 1); i <= Math.min(frontEnd, starboardConvex.length - 1); i++) {
            vertices.push(starboardConvex[i]);
        }
        vertices.push(ef);
        vertices.push(eb);
        for (let i = Math.min(backEnd, portConvex.length - 1); i >= Math.max(frontStart, 1); i--) {
            vertices.push(portConvex[i]);
        }
        vertices.push(sf);

        // Now, we want to divide the start side into several pieces. Every point on one piece "sees" the same
        // portion of the farthest reflected edge. We want to return a list of pieces together with the vertices in
        // the unfolding which block their view on the left and right sides.
        const cuts: CutPoint[] = [];
        cuts.push({
            // this intersection fails if (a) it's the endpoint or (b) the front line and the start segment are
            // collinear. In either case, we should choose the left-most point on the start segment.
            startPoint: startSegment.intersectLine(frontLine)?.toVector2() || portConvex[0],
            boundPoint: frontStart > 0 ? portConvex[frontStart] : portConvex[1],
            left: true,
        });
        for (let i = Math.max(frontStart, 1); i < backEnd; i++) {
            if (closeEnough(portConvex[i].distanceTo(portConvex[i + 1]), 0)) continue;
            const line = Line.throughTwoPoints(portConvex[i], portConvex[i + 1]);
            const intersection = startSegment.intersectLine(line);
            if (intersection === undefined) continue;
            cuts.push({
                startPoint: intersection.toVector2(),
                boundPoint: portConvex[i + 1],
                left: true,
            });
        }

        for (let i = frontEnd - 1; i > Math.max(backStart, 1); i--) {
            if (closeEnough(starboardConvex[i].distanceTo(starboardConvex[i - 1]), 0)) continue;
            const line = Line.throughTwoPoints(starboardConvex[i], starboardConvex[i - 1]);
            const intersection = startSegment.intersectLine(line);
            if (intersection === undefined) continue;
            cuts.push({
                startPoint: intersection.toVector2(),
                boundPoint: starboardConvex[i],
                left: false,
            });
        }
        cuts.push({
            startPoint: startSegment.intersectLine(backLine)?.toVector2() || starboardConvex[0],
            boundPoint: backStart > 0 ? starboardConvex[backStart] : starboardConvex[1],
            left: false,
        });

        cuts.sort((a, b) => a.startPoint.distanceTo(portConvex[0]) - b.startPoint.distanceTo(portConvex[0]));

        const subCorridors: SubCorridor[] = [];
        let leftBound = cuts[0].boundPoint;
        let rightBound = cuts[1].boundPoint;
        for (let i = 0; i < cuts.length; i++) {
            if (!cuts[i].left) {
                rightBound = cuts[i].boundPoint;
                break;
            }
        }

        for (let i = 0; i < cuts.length - 1; i++) {
            if (cuts[i].left) leftBound = cuts[i].boundPoint;
            if (!cuts[i + 1].left) rightBound = cuts[i + 1].boundPoint;
            subCorridors.push({
                startPoint: cuts[i].startPoint,
                startTime: this.polygon!.timeOf(cuts[i].startPoint),
                endPoint: cuts[i + 1].startPoint,
                endTime: this.polygon!.timeOf(cuts[i + 1].startPoint),
                leftBound,
                rightBound,
            });
        }

        return {subCorridors, vertices};
    }
}

function convexList(ray: Ray, vertices: Vector2[], left: boolean): Vector2[] {
    const deduplicated: Vector2[] = [];
    for (let v of vertices) {
        let dupe = false;
        for (let d of deduplicated) {
            if (v.distanceTo(d) < 0.000_000_001) {
                dupe = true;
                break;
            }
        }
        if (!dupe) deduplicated.push(v);
    }

    // const v = [...vertices].sort((a, b) =>
    //     a.clone().sub(ray.src).dot(ray.dir) - b.clone().sub(ray.src).dot(ray.dir));
    if (deduplicated.length <= 2) return deduplicated;
    const convex = [deduplicated[0]];
    let i = 0;
    const rayAngle = ray.dir.angle();
    const sortAngle = (angle: number) => {
        return normalizeAngle(angle, rayAngle - Math.PI) * (left ? -1 : 1);
    };
    while (i < deduplicated.length - 1) {
        let bestIndex = deduplicated.length - 1;
        let bestAngle = sortAngle(deduplicated[bestIndex].clone().sub(deduplicated[i]).angle());
        let j = i + 1;
        for (; j < deduplicated.length - 1; j++) {
            if (deduplicated[i].distanceTo(deduplicated[j]) < 0.000_000_001) continue;
            const angle = sortAngle(deduplicated[j].clone().sub(deduplicated[i]).angle());
            if (angle > bestAngle) {
                bestAngle = angle;
                bestIndex = j;
            }
        }
        convex.push(deduplicated[bestIndex]);
        i = bestIndex;
    }
    return convex;
}

interface Corridor {
    subCorridors: SubCorridor[];
    vertices: Vector2[];
}

interface CutPoint {
    startPoint: Vector2;
    boundPoint: Vector2;
    left: boolean;
}

function orientation(p1: Vector2, p2: Vector2, test: Vector2): number {
    // return 1 if test is left of p1p2, 0 if it lies on p1p2, and -1 if it is to the right
    return Math.sign(p2.clone().sub(p1).cross(test.clone().sub(p1)));
}
