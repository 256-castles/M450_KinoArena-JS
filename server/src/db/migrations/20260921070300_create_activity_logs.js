export async function up(knex) {
  await knex.schema.createTable("activity_logs", (t) => {
    t.increments("id");
    t.integer("user_id").unsigned()
      .references("id").inTable("users").onDelete("SET NULL");
    t.string("action").notNullable();
    t.string("target_type");
    t.integer("target_id");
    // text statt string: Buchungen vieler Plaetze erzeugen lange Beschreibungen
    t.text("description");
    t.string("ip_address", 45);
    t.datetime("created_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    t.datetime("updated_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));

    t.index(["created_at"], "index_activity_logs_on_created_at");
    t.index(["target_type", "target_id"], "index_activity_logs_on_target_type_and_target_id");
    t.index(["user_id"], "index_activity_logs_on_user_id");
  });
}

export async function down(knex) {
  await knex.schema.dropTable("activity_logs");
}
