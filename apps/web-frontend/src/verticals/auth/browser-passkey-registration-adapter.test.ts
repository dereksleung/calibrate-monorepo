import {
  buildPasskeyRegistrationChallenge,
  buildVerifyPasskeyRegistrationCommand,
} from "@calibrate/frontend-core/verticals/auth/models/__mocks__/passkey-registration";
import { startRegistration } from "@simplewebauthn/browser";
import { describe, expect, it, vi } from "vitest";

import { createBrowserPasskeyRegistrationAdapter } from "./browser-passkey-registration-adapter";

vi.mock("@simplewebauthn/browser", () => ({ startRegistration: vi.fn() }));
describe("browser passkey registration handoff", () => {
  it("passes portable options to the browser and preserves attestation and extension outputs", async () => {
    const options = buildPasskeyRegistrationChallenge().options;
    const credential = buildVerifyPasskeyRegistrationCommand().credential;
    const browserCredential = { ...credential, clientExtensionResults: { credProps: { rk: true } } };
    vi.mocked(startRegistration).mockResolvedValue(browserCredential);
    const result = await createBrowserPasskeyRegistrationAdapter().createPasskey(options);
    expect(startRegistration).toHaveBeenCalledWith({ optionsJSON: options });
    expect(result).toEqual(browserCredential);
  });
});
