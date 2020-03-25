import { Point } from "../../common/Structures";

export function pointIntersectsCircle(point: Point, circleCenter: Point, circleRadius: number) {
  return Math.sqrt((point.x - circleCenter.x) ** 2 + (point.y - circleCenter.y) ** 2) < circleRadius;
}

export function getManhattanDistance(pointA: Point, pointB: Point) {
  return Math.abs(pointA.x - pointB.x) + Math.abs(pointA.y - pointB.y)
}

export function getHeuristicDistance(pointA: Point, pointB: Point) {
  const deltaX = Math.abs(pointA.x - pointB.x);
  const deltaY = Math.abs(pointA.y - pointB.y);

  return Math.min(deltaX, deltaY) * Math.SQRT2 + Math.abs(deltaX - deltaY);
}