import knex from "knex";
import { knexConfig } from "./knexConfig.js";

export function createDb(environment = process.env.NODE_ENV || "development") {
  return knex(knexConfig(environment));
}
