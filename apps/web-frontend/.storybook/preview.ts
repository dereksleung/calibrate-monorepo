import type { Preview } from "@storybook/react-vite";

import { sb } from "storybook/test";

sb.mock(import("../src/verticals/day-log-cache/use-sync-day-logs-for-date-range"));

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
