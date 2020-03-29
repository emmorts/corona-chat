import { Point } from "common/Structures";
import { getHeuristicDistance } from "client/utils/MathUtils";

export class Cluster {
  private _radius: number;
  private _center: Point;

  constructor(
    public points: ClusterPoint[],
    private clusterSizeIncrement: number
  ) {
    if (points) {
      this.points = [...points];
      this._radius = this.calculateRadius();
      this._center = this.calculateCenter();
    }
  }

  get radius() {
    return this._radius;
  }

  get center() {
    return this._center;
  }

  merge(cluster: Cluster) {
    this.points.push(...cluster.points);
    this._radius = this.calculateRadius();
    this._center = this.calculateCenter();
  }

  withinRange(cluster: Cluster) {
    const distance = getHeuristicDistance(this._center, cluster._center);

    return this._radius > distance;
  }
  
  private calculateRadius() {
    return Math.max(...this.points.map(pt => pt.radius)) + (this.points.length - 1) * this.clusterSizeIncrement;
  }

  private calculateCenter(): Point {
    const x = this.points.map(point => point.x);
    const y = this.points.map(point => point.y);

    const centerX = Math.round((Math.min (...x) + Math.max (...x)) / 2);
    const centerY = Math.round((Math.min (...y) + Math.max (...y)) / 2);

    return { x: centerX, y: centerY };
  }
}

export interface ClusterPoint extends Point {
  id?: string;
  radius: number;
}

export function findClusters(points: ClusterPoint[], clusterSizeIncrement: number = 0): Cluster[] {
  const clusters = points.map(point => new Cluster([ point ], clusterSizeIncrement));
  const clusterCount = clusters.length;

  for (let i = 0; i < clusterCount - 1; i++) {
    const currentCluster = clusters[i];

    if (currentCluster) {
      for (let j = i + 1; j < clusterCount; j++) {
        const nextCluster = clusters[j];

        if (nextCluster && currentCluster.withinRange(nextCluster)) {
          currentCluster.merge(nextCluster);

          clusters[j] = null;

          j = i;
        }
      }
    }
  }

  return clusters.filter(c => c);
}