// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EatenLimitBarShape } from "./WeeklyBarChart.tsx";

afterEach(() => {
  cleanup();
});

const renderBarShape = ({ eaten, limit }: { eaten: number; limit: number }) =>
  render(
    <svg>
      <EatenLimitBarShape
        background={{ y: 0, height: 100 }}
        height={50}
        payload={{ label: "T", eaten, limit }}
        width={10}
        x={20}
        y={50}
        yAxisMax={2200}
      />
    </svg>,
  );

describe("EatenLimitBarShape", () => {
  it("does not show a limit marker when eaten is below the limit", () => {
    const { container } = renderBarShape({ eaten: 1600, limit: 1650 });

    expect(container.querySelector("line")).toBeNull();
  });

  it("does not show a limit marker when eaten equals the limit", () => {
    const { container } = renderBarShape({ eaten: 1650, limit: 1650 });

    expect(container.querySelector("line")).toBeNull();
  });

  it("shows a limit marker when eaten is above the limit", () => {
    const { container } = renderBarShape({ eaten: 2160, limit: 1800 });

    expect(container.querySelector("line")).not.toBeNull();
  });
});
