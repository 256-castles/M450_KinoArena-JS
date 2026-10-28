import { actorName, targetLabel } from "../domain/labels.js";
import { isBlank } from "../domain/validation.js";

export const LIST_LIMIT = 200;

// Verweis auf das betroffene Objekt, z. B. target("Showtime", showtime)
export function target(type, record) {
  return record ? { type, id: record.id } : null;
}

// Fehler beim Loggen duerfen den Fachablauf nie abbrechen.
export async function recordActivity(db, { action, userId = null, target = null, description = null, ipAddress = null, now }) {
  try {
    if (isBlank(action)) throw new Error("Aktion muss ausgefüllt werden");

    const timestamp = now ?? new Date();
    const [id] = await db("activity_logs").insert({
      action,
      user_id: userId,
      target_type: target?.type ?? null,
      target_id: target?.id ?? null,
      description,
      ip_address: ipAddress,
      created_at: timestamp,
      updated_at: timestamp
    });
    return id;
  } catch (error) {
    console.warn(`ActivityLog konnte nicht geschrieben werden: ${error.message}`);
    return null;
  }
}

export async function listActivityLogs(db, { actionFilter, userId, limit = LIST_LIMIT } = {}) {
  const query = db("activity_logs")
    .leftJoin("users", "users.id", "activity_logs.user_id")
    .select("activity_logs.*", "users.email_address as user_email_address")
    .orderBy("activity_logs.created_at", "desc")
    .orderBy("activity_logs.id", "desc")
    .limit(limit);

  if (!isBlank(actionFilter)) query.where("activity_logs.action", actionFilter);
  if (!isBlank(userId)) query.where("activity_logs.user_id", userId);

  const rows = await query;
  return rows.map((log) => ({ ...log, actor_name: actorName(log), target_label: targetLabel(log) }));
}

export async function distinctActions(db) {
  const rows = await db("activity_logs").distinct("action").orderBy("action");
  return rows.map((row) => row.action);
}
