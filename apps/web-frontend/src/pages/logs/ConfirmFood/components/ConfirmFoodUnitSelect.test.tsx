// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CONFIRM_FOOD_UNIT_SELECT_POPUP_MAX_WIDTH_CLASS,
  ConfirmFoodUnitSelect,
} from "./ConfirmFoodUnitSelect.tsx";

afterEach(cleanup);

describe("ConfirmFoodUnitSelect", () => {
  it("caps the open list to the confirm-food card width", () => {
    render(
      <ConfirmFoodUnitSelect
        id="serving-unit"
        onValueChange={vi.fn()}
        options={[
          { unit: "serving", baseQuantity: 1 },
          { unit: "container (about 14 oz extra firm tofu, drained)", baseQuantity: 1 },
        ]}
        value="serving"
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));

    const listbox = screen.getByRole("listbox");
    const cappedAncestor = [listbox, listbox.parentElement, listbox.parentElement?.parentElement].find(
      (node) =>
        typeof node?.className === "string" &&
        node.className.includes(CONFIRM_FOOD_UNIT_SELECT_POPUP_MAX_WIDTH_CLASS),
    );

    expect(cappedAncestor).toBeTruthy();
  });
});
