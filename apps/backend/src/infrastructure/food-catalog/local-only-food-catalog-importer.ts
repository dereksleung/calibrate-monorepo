import type { IFoodCatalogImporter } from "@application/ports/food-catalog-importer.js";
import type { FoodCatalogRecord } from "@application/ports/food-catalog-writer.js";

/** Serves only the local Demo catalog and recent foods; never calls a provider. */
export class LocalOnlyFoodCatalogImporter implements IFoodCatalogImporter {
  async searchAndImport(_query: string, _limit: number): Promise<FoodCatalogRecord[]> {
    return [];
  }
}
