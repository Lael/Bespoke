interface KdTreeNode<Data> {
    axis: number | null;
    value: number | null;
    left: KdTreeNode<Data> | null;
    right: KdTreeNode<Data> | null;
    point: number[] | null;
    data: Data | null;
}

interface DataPoint<Data> {
    data: Data;
    point: number[];
}

export class KdTree<Data> {
    private root: KdTreeNode<Data> | null;

    constructor(readonly points: DataPoint<Data>[], readonly d: number = 2) {
        if (points.length === 0 || d <= 0) {
            throw Error('degenerate input');
        }

        // Validate that every point has exactly d coordinates
        for (let p of points) {
            if (p.point.length !== d) {
                throw Error('input data is malformed');
            }
        }

        this.root = this.build(points);
    }

    insert(point: DataPoint<Data>) {
        if (point.point.length !== this.d) {
            throw Error('input data is malformed');
        }
        this.points.push(point);
        this.root = this.build(this.points);
    }

    private build(points: DataPoint<Data>[]): KdTreeNode<Data> | null {
        const indices = [];
        for (let i = 0; i < points.length; i++) {
            indices.push(i);
        }

        const sorts = [];
        for (let i = 0; i < this.d; i++) {
            sorts.push([...indices].sort((a, b) => points[a].point[i] - points[b].point[i]));
        }
        const mask: boolean[] = new Array(points.length).fill(false);
        return this.createNode(sorts);
    }

    private createNode(sorts: number[][]): KdTreeNode<Data> | null {
        // If there is only one point, then create a leaf node with it
        const n = sorts[0].length;
        if (n === 1) return {
            axis: null,
            value: null,
            left: null,
            right: null,
            ...this.points[sorts[0][0]],
        };

        const ths = this;
        const extract = function (axis: number, index: number) {
            return ths.points[sorts[axis][index]].point[axis];
        };

        // Identify the axis to split along (choose the one with maximum spread)
        let maxSpread = Number.NEGATIVE_INFINITY;
        let axis = -1;
        for (let i = 0; i < this.d; i++) {
            const spread = extract(i, n - 1) - extract(i, 0);
            if (spread > maxSpread) {
                maxSpread = spread;
                axis = i;
            }
        }

        // Find the median value on the sorting axis
        const splitIndex = (n - (n % 2)) / 2;
        const value = extract(axis, splitIndex);
        const leftIndices = sorts[axis].slice(0, splitIndex);

        const leftSorts = sorts.map(sort => sort.filter(s => leftIndices.includes(s)));
        const rightSorts = sorts.map(sort => sort.filter(s => !leftIndices.includes(s)));

        const left = this.createNode(leftSorts);
        const right = this.createNode(rightSorts);

        return {
            axis,
            value,
            left,
            right,
            point: null,
            data: null,
        };
    }

    radiusQuery(searchPoint: number[], radius: number): DataPoint<Data>[] {
        if (searchPoint.length !== this.d) throw Error('search point has wrong dimension');
        if (radius < 0) throw Error('search radius is negative');
        const candidates = this.radiusQueryHelper(searchPoint, radius, this.root);
        return candidates.sort((a, b) => distanceSquared(a.point, searchPoint) - distanceSquared(b.point, searchPoint));
    }

    private radiusQueryHelper(searchPoint: number[], radius: number, node: KdTreeNode<Data> | null): DataPoint<Data>[] {
        if (node === null) return [];
        if (node.point !== null && distanceSquared(node.point, searchPoint) <= radius * radius) {
            return [{point: node.point, data: node.data!}];
        }
        let result: DataPoint<Data>[] = [];
        let searchCoord = searchPoint[node.axis!];
        if (searchCoord <= node.value! + radius) {
            result = result.concat(this.radiusQueryHelper(searchPoint, radius, node.left));
        }
        if (searchCoord >= node.value! - radius) {
            result = result.concat(this.radiusQueryHelper(searchPoint, radius, node.right));
        }
        return result;
    }
}

function distanceSquared(l1: number[], l2: number[]): number {
    if (l1.length !== l2.length) throw Error('points have different dimensions');
    let s = 0;
    for (let i = 0; i < l1.length; i++) {
        s += (l1[i] - l2[i]) * (l1[i] - l2[i]);
    }
    return s;
}
