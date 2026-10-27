import { runProductionEntrypoint } from "./infrastructure/production-startup.js";

await runProductionEntrypoint({
  failureMessage: "Backend startup failed",
  loadStage: "load-application",
  run: () => import("./app.js"),
});
