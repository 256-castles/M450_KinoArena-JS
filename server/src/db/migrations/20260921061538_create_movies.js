export async function up(knex) {
  await knex.schema.createTable("movies", (t) => {
    t.increments("id");
    t.string("title").notNullable();
    t.text("description").notNullable();
    t.integer("duration_minutes").notNullable();
    t.string("poster_url");
    // NFA-2: Optimistic Locking
    t.integer("lock_version").notNullable().defaultTo(0);
    t.datetime("created_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    t.datetime("updated_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
  });
}

export async function down(knex) {
  await knex.schema.dropTable("movies");
}
