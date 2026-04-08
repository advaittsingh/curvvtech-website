import type { Request } from "express";
import { Router } from "express";
import { pool } from "../../db.js";
import { jsonError } from "../../lib/jsonError.js";
import { normalizeWhatsAppPhoneNumberId } from "../../modules/whatsapp/phoneNumberId.js";
import { presignProfileUpload, s3Configured } from "../../services/s3Presign.js";

export const meRouter = Router();

/** WhatsApp line is per-tenant; honor X-Tenant-Id when user has multiple memberships. */
async function resolveTargetTenantForWhatsapp(
  req: Request,
  userId: string
): Promise<
  | { ok: true; tenantId: string }
  | { ok: false; status: number; error: string; message: string }
> {
  const rows = await pool.query<{ tenant_id: string }>(
    `SELECT tenant_id::text FROM tenant_users WHERE user_id = $1::uuid ORDER BY created_at ASC`,
    [userId]
  );
  if (rows.rows.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "NO_ORGANIZATION",
      message: "No organization found for user",
    };
  }
  const header = req.header("x-tenant-id")?.trim();
  if (header) {
    const match = rows.rows.find((r) => r.tenant_id === header);
    if (!match) {
      return {
        ok: false,
        status: 403,
        error: "TENANT_FORBIDDEN",
        message: "You do not have access to this organization",
      };
    }
    return { ok: true, tenantId: header };
  }
  if (rows.rows.length === 1) {
    return { ok: true, tenantId: rows.rows[0]!.tenant_id };
  }
  req.log?.warn(
    {
      userId,
      tenantCount: rows.rows.length,
      chosenTenantId: rows.rows[0]!.tenant_id,
    },
    "whatsapp_settings_no_x_tenant_id_multiple_orgs_using_first_membership"
  );
  return { ok: true, tenantId: rows.rows[0]!.tenant_id };
}

meRouter.get("/me", (req, res) => {
  const u = req.internalUser!;
  return res.json({
    id: u.id,
    access_allowed: u.accessAllowed,
    waitlist_position: u.waitlistPosition,
    email: u.email,
  });
});

/**
 * Primary WhatsApp line for the user’s first organization membership (see `whatsapp_accounts`).
 */
meRouter.get("/me/whatsapp", async (req, res) => {
  const userId = req.internalUser!.id;
  const tenantRes = await resolveTargetTenantForWhatsapp(req, userId);
  if (!tenantRes.ok) {
    jsonError(res, tenantRes.status, tenantRes.error, tenantRes.message);
    return;
  }
  const r = await pool.query<{ phone_number_id: string | null }>(
    `SELECT wa.phone_number_id
     FROM whatsapp_accounts wa
     WHERE wa.tenant_id = $1::uuid
     ORDER BY wa.created_at ASC
     LIMIT 1`,
    [tenantRes.tenantId]
  );
  return res.json({
    whatsapp_phone_number_id: r.rows[0]?.phone_number_id ?? null,
  });
});

meRouter.patch("/me/whatsapp", async (req, res) => {
  const userId = req.internalUser!.id;
  const raw = (req.body as { whatsapp_phone_number_id?: unknown })?.whatsapp_phone_number_id;

  let val: string | null;
  if (raw === null || raw === undefined) {
    val = null;
  } else if (typeof raw === "string" && raw.trim() === "") {
    val = null;
  } else if (typeof raw === "string") {
    val = normalizeWhatsAppPhoneNumberId(raw);
    if (val === null) {
      jsonError(
        res,
        400,
        "VALIDATION_ERROR",
        "whatsapp_phone_number_id must be numeric (Meta Phone number ID)"
      );
      return;
    }
  } else if (typeof raw === "number" && Number.isFinite(raw)) {
    val = normalizeWhatsAppPhoneNumberId(raw);
    if (val === null) {
      jsonError(
        res,
        400,
        "VALIDATION_ERROR",
        "whatsapp_phone_number_id must be numeric (Meta Phone number ID)"
      );
      return;
    }
  } else {
    jsonError(
      res,
      400,
      "VALIDATION_ERROR",
      "whatsapp_phone_number_id must be a string, number, or null"
    );
    return;
  }

  const tenantRes = await resolveTargetTenantForWhatsapp(req, userId);
  if (!tenantRes.ok) {
    jsonError(res, tenantRes.status, tenantRes.error, tenantRes.message);
    return;
  }
  const tenantId = tenantRes.tenantId;

  req.log?.info(
    {
      event: "patch_me_whatsapp",
      user_id: userId,
      tenant_id: tenantId,
      incoming_whatsapp_phone_number_id: raw,
      normalized_phone_number_id: val,
    },
    "PATCH /v1/me/whatsapp incoming"
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (val === null) {
      await client.query(`DELETE FROM whatsapp_accounts WHERE tenant_id = $1::uuid`, [tenantId]);
      await client.query(`UPDATE users SET whatsapp_phone_number_id = NULL, updated_at = now() WHERE id = $2::uuid`, [
        userId,
      ]);
    } else {
      const taken = await client.query<{ tenant_id: string }>(
        `SELECT tenant_id::text FROM whatsapp_accounts WHERE phone_number_id = $1 OR trim(phone_number_id) = $1`,
        [val]
      );
      if (taken.rows[0] && taken.rows[0].tenant_id !== tenantId) {
        await client.query("ROLLBACK");
        jsonError(
          res,
          409,
          "CONFLICT",
          "This WhatsApp number is linked to another organization"
        );
        return;
      }
      await client.query(`DELETE FROM whatsapp_accounts WHERE tenant_id = $1::uuid`, [tenantId]);
      await client.query(
        `INSERT INTO whatsapp_accounts (tenant_id, phone_number_id) VALUES ($1::uuid, $2)`,
        [tenantId, val]
      );
      await client.query(`UPDATE users SET whatsapp_phone_number_id = $1, updated_at = now() WHERE id = $2::uuid`, [
        val,
        userId,
      ]);
    }

    const accRow = await client.query<{ phone_number_id: string | null }>(
      `SELECT phone_number_id FROM whatsapp_accounts WHERE tenant_id = $1::uuid LIMIT 1`,
      [tenantId]
    );
    const userRow = await client.query<{ whatsapp_phone_number_id: string | null }>(
      `SELECT whatsapp_phone_number_id FROM users WHERE id = $1::uuid`,
      [userId]
    );
    req.log?.info(
      {
        event: "patch_me_whatsapp_db_result",
        tenant_id: tenantId,
        whatsapp_accounts_phone_number_id: accRow.rows[0]?.phone_number_id ?? null,
        users_whatsapp_phone_number_id: userRow.rows[0]?.whatsapp_phone_number_id ?? null,
      },
      "PATCH /v1/me/whatsapp DB update result"
    );

    await client.query("COMMIT");
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      jsonError(res, 409, "CONFLICT", "This WhatsApp number is already in use");
      return;
    }
    throw e;
  } finally {
    client.release();
  }

  return res.json({ whatsapp_phone_number_id: val });
});

meRouter.get("/me/profile", async (req, res) => {
  const userId = req.internalUser!.id;
  await pool.query(
    `INSERT INTO user_profiles (user_id, email) VALUES ($1, $2)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, req.internalUser!.email || ""]
  );

  const r = await pool.query(
    `SELECT display_name, phone, email, business_address, business_website,
            profile_photo_s3_key, id_document_s3_key, id_verification_status
     FROM user_profiles WHERE user_id = $1`,
    [userId]
  );
  if (r.rows.length === 0) {
    return res.json({
      display_name: "",
      phone: "",
      email: req.internalUser!.email || "",
      business_address: "",
      business_website: "",
      profile_photo_s3_key: null,
      id_document_s3_key: null,
      id_verification_status: "none",
    });
  }
  return res.json(r.rows[0]);
});

meRouter.patch("/me/profile", async (req, res) => {
  const userId = req.internalUser!.id;
  const b = req.body as Record<string, unknown>;

  await pool.query(
    `INSERT INTO user_profiles (user_id, email) VALUES ($1, $2)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, req.internalUser!.email || ""]
  );

  const updates: string[] = [];
  const vals: unknown[] = [];
  let i = 1;

  const str = (k: string) => (typeof b[k] === "string" ? (b[k] as string) : undefined);
  const maybeStr = (k: string) => {
    const v = b[k];
    if (v === null) return null;
    if (typeof v === "string") return v;
    return undefined;
  };

  const map: [string, string | null | undefined][] = [
    ["display_name", str("display_name")],
    ["phone", str("phone")],
    ["email", str("email")],
    ["business_address", str("business_address")],
    ["business_website", str("business_website")],
    ["profile_photo_s3_key", maybeStr("profile_photo_s3_key") as string | null | undefined],
    ["id_document_s3_key", maybeStr("id_document_s3_key") as string | null | undefined],
    ["id_verification_status", str("id_verification_status")],
  ];

  for (const [col, val] of map) {
    if (val !== undefined) {
      updates.push(`${col} = $${i++}`);
      vals.push(val);
    }
  }

  if (updates.length === 0) {
    jsonError(res, 400, "VALIDATION_ERROR", "No fields to update");
    return;
  }

  vals.push(userId);
  await pool.query(
    `UPDATE user_profiles SET ${updates.join(", ")}, updated_at = now() WHERE user_id = $${i}`,
    vals
  );

  const out = await pool.query(
    `SELECT display_name, phone, email, business_address, business_website,
            profile_photo_s3_key, id_document_s3_key, id_verification_status
     FROM user_profiles WHERE user_id = $1`,
    [userId]
  );
  return res.json(out.rows[0]);
});

meRouter.post("/me/profile/upload-url", async (req, res) => {
  const purpose = req.body?.purpose;
  const contentType = req.body?.content_type;
  if (purpose !== "profile_photo" && purpose !== "id_document") {
    jsonError(res, 400, "VALIDATION_ERROR", "purpose must be profile_photo or id_document");
    return;
  }
  if (
    contentType !== "image/jpeg" &&
    contentType !== "image/png" &&
    contentType !== "image/webp"
  ) {
    jsonError(
      res,
      400,
      "VALIDATION_ERROR",
      "content_type must be image/jpeg, image/png, or image/webp"
    );
    return;
  }
  if (!s3Configured()) {
    jsonError(res, 503, "S3_NOT_CONFIGURED", "Object storage is not configured");
    return;
  }
  const signed = await presignProfileUpload({
    userId: req.internalUser!.id,
    purpose,
    contentType,
  });
  if (!signed) {
    jsonError(res, 503, "S3_ERROR", "Could not create upload URL");
    return;
  }
  return res.json(signed);
});

meRouter.get("/me/business", async (req, res) => {
  const userId = req.internalUser!.id;
  const r = await pool.query(
    `SELECT what_you_do, customer_asks, customer_source, description, questionnaire
     FROM business_profiles WHERE user_id = $1`,
    [userId]
  );
  if (r.rows.length === 0) {
    return res.json({
      what_you_do: "",
      customer_asks: "",
      customer_source: "",
      description: "",
      questionnaire: null,
    });
  }
  return res.json(r.rows[0]);
});

meRouter.patch("/me/business", async (req, res) => {
  const userId = req.internalUser!.id;
  const b = req.body as Record<string, unknown>;

  await pool.query(
    `INSERT INTO business_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );

  const updates: string[] = [];
  const vals: unknown[] = [];
  let i = 1;

  if (typeof b.what_you_do === "string") {
    updates.push(`what_you_do = $${i++}`);
    vals.push(b.what_you_do);
  }
  if (typeof b.customer_asks === "string") {
    updates.push(`customer_asks = $${i++}`);
    vals.push(b.customer_asks);
  }
  if (typeof b.customer_source === "string") {
    updates.push(`customer_source = $${i++}`);
    vals.push(b.customer_source);
  }
  if (typeof b.description === "string") {
    updates.push(`description = $${i++}`);
    vals.push(b.description);
  }
  if (b.questionnaire !== undefined) {
    updates.push(`questionnaire = $${i++}::jsonb`);
    vals.push(JSON.stringify(b.questionnaire));
  }

  if (updates.length === 0) {
    jsonError(res, 400, "VALIDATION_ERROR", "No fields to update");
    return;
  }

  vals.push(userId);
  await pool.query(
    `UPDATE business_profiles SET ${updates.join(", ")}, updated_at = now() WHERE user_id = $${i}`,
    vals
  );

  const out = await pool.query(
    `SELECT what_you_do, customer_asks, customer_source, description, questionnaire
     FROM business_profiles WHERE user_id = $1`,
    [userId]
  );
  return res.json(out.rows[0]);
});
