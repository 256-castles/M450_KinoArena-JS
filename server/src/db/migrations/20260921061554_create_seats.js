export async function up(knex) {
  await knex.schema.createTable("seats", (t) => {
    t.increments("id");
    t.integer("auditorium_id").unsigned().notNullable()
      .references("id").inTable("auditoria").onDelete("CASCADE");
    t.string("row").notNullable();
    t.integer("number").notNullable();
    t.datetime("created_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    t.datetime("updated_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));

    t.index(["auditorium_id"], "index_seats_on_auditorium_id");
    // Verhindert zweimal Platz A1 im selben Saal
    t.unique(["auditorium_id", "row", "number"], { indexName: "index_seats_on_auditorium_row_and_number" });
  });
}

export async function down(knex) {
  await knex.schema.dropTable("seats");
}
