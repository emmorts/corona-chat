import { expect } from "chai";
import * as ClusterUtils from "client/utils/ClusterUtils";

describe("#strategy", () => {

  it("should find clusters", () => {
    const points: ClusterUtils.ClusterPoint[] = [{
      x: 1,
      y: 1,
      radius: 2
    }, {
      x: 2,
      y: 1,
      radius: 2
    }, {
      x: 4,
      y: 3,
      radius: 2
    }];

    const clusters = ClusterUtils.findClusters(points);

    expect(clusters.length).to.eq(2);
    expect(clusters[0].points.length).to.eq(2);
    expect(clusters[1].points.length).to.eq(1);
  });

  it("should find clusters on expanded cluster", () => {
    const points: ClusterUtils.ClusterPoint[] = [{
      x: 1,
      y: 1,
      radius: 2
    }, {
      x: 2,
      y: 1,
      radius: 2
    }, {
      x: 4,
      y: 3,
      radius: 2
    }];

    const clusters = ClusterUtils.findClusters(points, 1);

    expect(clusters.length).to.eq(1);
    expect(clusters[0].points.length).to.eq(3);
  });

});