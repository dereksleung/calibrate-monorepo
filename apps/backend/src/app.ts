import { Container } from "@infrastructure/container.js";
import { getBackendListenHost } from "@infrastructure/demo-runtime.js";

import { createHttpApp } from "./create-http-app.js";

const PORT = process.env.PORT || 3001;
const app = createHttpApp(new Container({}));
const listenHost = getBackendListenHost();

if (listenHost) {
  app.listen(Number(PORT), listenHost, () => {
    console.log(`Server running on http://${listenHost}:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
