export async function up(knex) {
  await knex.schema.createTable("bookings", (t) => {
    t.increments("id");
    t.integer("user_id").unsigned().notNullable()
      .references("id").inTable("users").onDelete("CASCADE");
    t.integer("showtime_id").unsigned().notNullable()
      .references("id").inTable("showtimes").onDelete("CASCADE");
    t.integer("seat_id").unsigned().notNullable()
      .references("id").inTable("seats").onDelete("RESTRICT");
    t.string("qr_code_token", 36).notNullable();
    t.decimal("total_price", 8, 2).notNullable();
    t.string("payment_method");
    t.datetime("created_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    t.datetime("updated_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));

    t.unique(["qr_code_token"], { indexName: "index_bookings_on_qr_code_token" });
    t.index(["seat_id"], "index_bookings_on_seat_id");
    t.index(["showtime_id"], "index_bookings_on_showtime_id");
    t.index(["user_id"], "index_bookings_on_user_id");
    // NFA-1 Stufe 1: ein Sitzplatz kann pro Vorstellung nur einmal gebucht werden
    t.unique(["showtime_id", "seat_id"], { indexName: "index_bookings_on_showtime_and_seat" });
  });
}

export async function down(knex) {
  await knex.schema.dropTable("bookings");
}
