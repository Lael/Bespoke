import {KdTree} from "./kd-tree";

const TEST_POINT_0 = {point: [0, 0], data: 0};
const TEST_POINT_1 = {point: [1, 0], data: 1};
const TEST_POINT_2 = {point: [3, 0], data: 2};
const TEST_POINT_3 = {point: [2, 2], data: 3};

const TEST_TREE = new KdTree<number>([
    TEST_POINT_0,
    TEST_POINT_1,
    TEST_POINT_2,
    TEST_POINT_3,
]);

describe('KdTree', () => {
    // describe('Construction', () => {
    //     it('should construct a tree with one node', () => {
    //         const tree = new KdTree<string>([{point: [0, 0], data: 'Hello, world!'}]);
    //     });
    // });

    describe('Radius Query', () => {
        it('should find nodes close to a given location', () => {
            const result = TEST_TREE.radiusQuery([0, 0], 2);
            expect(result).toEqual([TEST_POINT_0, TEST_POINT_1]);
        });
    });
});