import type { Preview } from "@storybook/react-vite";

import { sb } from "storybook/test";

sb.mock(import("../../../packages/frontend-core/src/feature-workflows/day-logs/sync-day-logs.ts"));

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
