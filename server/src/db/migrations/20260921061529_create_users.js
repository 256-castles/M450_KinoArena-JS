export async function up(knex) {
  await knex.schema.createTable("users", (t) => {
    t.increments("id");
    t.string("email_address").notNullable();
    t.string("password_digest").notNullable();
    t.string("name").notNullable();
    t.boolean("admin").notNullable().defaultTo(false);
    t.datetime("password_reset_sent_at", { precision: 3 });
    t.datetime("created_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    t.datetime("updated_at", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));

    t.unique(["email_address"], { indexName: "index_users_on_email_address" });
  });
}

export async function down(knex) {
  await knex.schema.dropTable("users");
}
