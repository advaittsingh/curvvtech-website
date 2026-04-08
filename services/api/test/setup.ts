import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(dir, "..", ".env.aws") });
loadEnv({ path: path.join(dir, "..", ".env") });
