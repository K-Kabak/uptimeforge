import { config } from "dotenv";
import { productionErrors } from "../src/lib/production-env";
config({ path: ".env.production.local", quiet: true });
const errors = productionErrors(process.env);
if (errors.length) {
  console.error("Production configuration blocked:\n" + errors.join("\n"));
  process.exit(1);
}
console.info(
  "Production configuration validated; provider connectivity and smoke tests still required.",
);
