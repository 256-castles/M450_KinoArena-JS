import { NotAuthorizedError } from "../errors.js";

// Basis aller Policies (wie Pundit): standardmaessig wird alles verweigert,
// Unterklassen erlauben gezielt.
export class ApplicationPolicy {
  constructor(user, record = null, context = {}) {
    this.user = user;
    this.record = record;
    this.context = context;
  }

  index() {
    return false;
  }

  show() {
    return false;
  }

  create() {
    return false;
  }

  new() {
    return this.create();
  }

  update() {
    return false;
  }

  edit() {
    return this.update();
  }

  destroy() {
    return false;
  }

  isAdmin() {
    return Boolean(this.user?.admin);
  }

  // Policy-Scope: schraenkt eine Knex-Abfrage ein (Standard: nichts sichtbar)
  static scope(_user, query) {
    return query.whereRaw("1 = 0");
  }
}

// Wie Pundit#authorize: wirft NotAuthorizedError, wenn die Aktion nicht erlaubt ist.
export function authorize(policy, action) {
  if (typeof policy[action] !== "function" || !policy[action]()) {
    throw new NotAuthorizedError(policy.constructor.name, action);
  }
  return policy.record;
}
