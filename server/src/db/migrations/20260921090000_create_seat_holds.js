export async function up(knex) {
  await knex.schema.createTable("seat_holds", (t) => {
    t.increments("id");
    t.integer("user_id").unsigned().notNullable()
      .references("id").inTable("users").onDelete("CASCADE");
    t.integer("showtime_id").unsigned().notNullable()
      .references("id").inTable("showtimes").onDelete("CASCADE");
    t.integer("seat_id").unsigned().notNullable()
      .references("id").inTable("seats").onDelete("CASCADE");
    t.datetime("expires_at", { precision: 3 }).notNullable();
    t.datetime("created_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    t.datetime("updated_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));

    t.index(["expires_at"], "index_seat_holds_on_expires_at");
    t.index(["seat_id"], "index_seat_holds_on_seat_id");
    t.index(["showtime_id"], "index_seat_holds_on_showtime_id");
    t.index(["user_id"], "index_seat_holds_on_user_id");
    // NFA-1 Stufe 3: ein Platz kann pro Vorstellung nur einmal reserviert sein
    t.unique(["showtime_id", "seat_id"], { indexName: "index_seat_holds_on_showtime_and_seat" });
  });
}

export async function down(knex) {
  await knex.schema.dropTable("seat_holds");
}
