import { getBackendListenHost, prepareDemoRuntime } from "@infrastructure/demo-runtime.js";

process.env.CALIBRATE_DEMO = "1";

await prepareDemoRuntime();

const { Container } = await import("@infrastructure/container.js");
const { createHttpApp } = await import("./create-http-app.js");

const PORT = Number(process.env.PORT || 3001);
const listenHost = getBackendListenHost() ?? "127.0.0.1";
const app = createHttpApp(new Container({}));

app.listen(PORT, listenHost, () => {
  console.log(`Demo server running on http://${listenHost}:${PORT}`);
});
