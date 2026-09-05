import type { IEmailSender } from "@application/ports/email-sender.js";
import type { IFoodCatalogImporter } from "@application/ports/food-catalog-importer.js";
import type { IFoodCatalogWriter } from "@application/ports/food-catalog-writer.js";

import { BrevoEmailSender } from "./email/brevo-email-sender.js";
import { NoopEmailSender } from "./email/noop-email-sender.js";
import { LocalOnlyFoodCatalogImporter } from "./food-catalog/local-only-food-catalog-importer.js";
import { FoodDataCentralCatalogImporter } from "./food-data-central/food-data-central-catalog-importer.js";
import { isDemoRuntime, isE2eRuntime } from "./runtime-environment.js";

export function createFoodCatalogImporter(options: {
  apiKey: string | undefined;
  writer: IFoodCatalogWriter;
}): IFoodCatalogImporter {
  if (isDemoRuntime()) {
    return new LocalOnlyFoodCatalogImporter();
  }

  if (options.apiKey) {
    return new FoodDataCentralCatalogImporter({ apiKey: options.apiKey, writer: options.writer });
  }

  return {
    searchAndImport: async () => {
      throw new Error("Food catalog provider is unavailable");
    },
  };
}

export function resolveEmailSender(options: { credential: string | undefined }): IEmailSender | null {
  if (isDemoRuntime() || isE2eRuntime()) {
    return new NoopEmailSender();
  }

  return options.credential ? new BrevoEmailSender(options.credential) : null;
}
