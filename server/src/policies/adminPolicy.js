import { ApplicationPolicy } from "./applicationPolicy.js";

export class AdminPolicy extends ApplicationPolicy {
  index() {
    return this.isAdmin();
  }

  show() {
    return this.isAdmin();
  }

  create() {
    return this.isAdmin();
  }

  update() {
    return this.isAdmin();
  }

  destroy() {
    return this.isAdmin();
  }

  static scope(user, query) {
    return user?.admin ? query : query.whereRaw("1 = 0");
  }
}
