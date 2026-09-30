import { DeleteCurrentSessionResponseSchema } from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";

export async function deleteCurrentSession(transport: ApiTransport): Promise<null> {
  return DeleteCurrentSessionResponseSchema.parse(
    await transport.request({
      path: "/auth/session",
      method: "DELETE",
      responseBodySchema: DeleteCurrentSessionResponseSchema,
    }),
  );
}
