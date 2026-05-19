import { RegionConfigSchema, RegionIdSchema, type RegionConfig, type RegionId } from "./schema.js";
import { us } from "./regions/us.js";
import { eu } from "./regions/eu.js";
import { uk } from "./regions/uk.js";

const REGIONS: Record<RegionId, RegionConfig> = { us, eu, uk };

export function loadRegion(): RegionConfig {
  const raw = (process.env.REGION ?? "us").toLowerCase();
  const parsed = RegionIdSchema.safeParse(raw);
  if (!parsed.success) {
    const allowed = Object.keys(REGIONS).join(", ");
    throw new Error(
      `Unknown REGION='${raw}'. Allowed values: ${allowed}. ` +
        `Add a new region by creating packages/core/src/config/regions/<id>.ts ` +
        `and registering it in loader.ts.`
    );
  }
  const config = REGIONS[parsed.data];
  // Validate at load time so misconfigured regions surface immediately rather
  // than at first use deep inside a test.
  return RegionConfigSchema.parse(config);
}

export function knownRegions(): RegionId[] {
  return Object.keys(REGIONS) as RegionId[];
}
