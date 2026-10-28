export async function up(knex) {
  // Die Eindeutigkeit des Saalnamens wird bewusst nur im Modell validiert.
  await knex.schema.createTable("auditoria", (t) => {
    t.increments("id");
    t.string("name").notNullable();
    t.integer("total_seats").notNullable();
    t.datetime("created_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    t.datetime("updated_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
  });
}

export async function down(knex) {
  await knex.schema.dropTable("auditoria");
}
