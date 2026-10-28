export async function up(knex) {
  await knex.schema.createTable("showtimes", (t) => {
    t.increments("id");
    t.integer("movie_id").unsigned().notNullable()
      .references("id").inTable("movies").onDelete("RESTRICT");
    t.integer("auditorium_id").unsigned().notNullable()
      .references("id").inTable("auditoria").onDelete("RESTRICT");
    t.datetime("start_time", { precision: 3 }).notNullable();
    t.decimal("price", 8, 2).notNullable();
    // NFA-2: Optimistic Locking
    t.integer("lock_version").notNullable().defaultTo(0);
    t.datetime("created_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    t.datetime("updated_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));

    t.index(["auditorium_id"], "index_showtimes_on_auditorium_id");
    t.index(["movie_id"], "index_showtimes_on_movie_id");
    t.index(["start_time"], "index_showtimes_on_start_time");
  });
}

export async function down(knex) {
  await knex.schema.dropTable("showtimes");
}
