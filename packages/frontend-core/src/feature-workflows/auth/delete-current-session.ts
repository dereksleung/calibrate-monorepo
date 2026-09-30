import type { ApiTransport } from "../../transport.js";

import { deleteCurrentSession as request } from "../../api/auth/delete-current-session.js";

export async function deleteCurrentSession(transport: ApiTransport): Promise<void> {
  await request(transport);
}
