import { Router } from "express";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const router = Router();
const assetsDir = join(dirname(fileURLToPath(import.meta.url)), "../../templates/email/assets");

const ALLOWED: Record<string, string> = {
  "curvvtech-logo.png": "image/png",
  "curvvtech-logo-white.png": "image/png",
};

router.get("/:filename", (req, res) => {
  const filename = String(req.params.filename);
  const contentType = ALLOWED[filename];
  if (!contentType) {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  const filePath = join(assetsDir, filename);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(readFileSync(filePath));
});

export default router;
