export class GraphNode<NodeData> {
    readonly edgeIds: Set<number> = new Set();

    constructor(readonly id: number, readonly data: NodeData) {
    }

    addEdge(edge: GraphEdge<any>) {
        this.edgeIds.add(edge.id);
    }
}

export class GraphEdge<EdgeData> {
    constructor(readonly id: number, readonly startId: number, readonly endId: number, readonly data: EdgeData) {
        if (startId === endId) throw Error('cannot create self-edge');
    }

    otherEnd(index: number): number {
        if (index === this.startId) return this.endId;
        if (index === this.endId) return this.startId;
        throw Error('edge not incident to node with given id');
    }
}

export class Graph<NodeData, EdgeData> {
    private nextNodeId = 1;
    private nextEdgeId = 1;

    private readonly nodeMap: Map<number, GraphNode<NodeData>> = new Map();
    private readonly edgeMap: Map<number, GraphEdge<EdgeData>> = new Map();

    addNode(data: NodeData): number {
        const newIndex = this.nextNodeId;
        this.nextNodeId++;
        this.nodeMap.set(newIndex, new GraphNode<NodeData>(newIndex, data));
        return newIndex;
    }

    addEdge(startId: number, endId: number, data: EdgeData): number {
        const newIndex = this.nextEdgeId;
        this.nextEdgeId++;
        const edge = new GraphEdge<EdgeData>(newIndex, startId, endId, data);
        this.nodeMap.get(startId)?.addEdge(edge);
        this.nodeMap.get(endId)?.addEdge(edge);
        this.edgeMap.set(newIndex, edge);
        return newIndex;
    }

    removeNode(id: number) {
        const node = this.nodeMap.get(id);
        if (!node) return;
        for (let edgeIndex of node.edgeIds) {
            this.removeEdge(edgeIndex);
        }
        this.nodeMap.delete(id);
    }

    removeEdge(id: number) {
        this.edgeMap.delete(id);
    }

    clear() {
        this.nodeMap.clear();
        this.edgeMap.clear();
    }

    startNode(edge: GraphEdge<EdgeData> | number): GraphNode<any> {
        let nodeId;
        if (edge instanceof GraphEdge) {
            nodeId = edge.startId;
        } else {
            nodeId = this.getEdge(edge).startId;
        }
        const node = this.nodeMap.get(nodeId);
        if (!node) throw Error('missing node');
        return node;
    }

    endNode(edge: GraphEdge<EdgeData> | number): GraphNode<NodeData> {
        let nodeId;
        if (edge instanceof GraphEdge) {
            nodeId = edge.endId;
        } else {
            nodeId = this.getEdge(edge).endId;
        }
        const node = this.nodeMap.get(nodeId);
        if (!node) throw Error('missing node');
        return node;
    }

    getEdge(id: number): GraphEdge<EdgeData> {
        const edge = this.edgeMap.get(id);
        if (!edge) throw Error(`missing edge: ${id}`);
        return edge;
    }

    getNodeData(id: number): NodeData | undefined {
        return this.nodeMap.get(id)?.data;
    }

    get nodeIds() {
        return this.nodeMap.keys();
    }

    get nodes() {
        return this.nodeMap.values();
    }

    get edgeIds() {
        return this.edgeMap.keys();
    }

    get edges() {
        return this.edgeMap.values();
    }
}