import type { Preview } from "@storybook/react-vite";

import { sb } from "storybook/test";

sb.mock(import("../src/pages/dashboard/DashboardV2/useSyncDayLogsForDateRange.ts"));

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
