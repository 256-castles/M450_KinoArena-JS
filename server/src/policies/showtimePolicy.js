import { AdminPolicy } from "./adminPolicy.js";

export class ShowtimePolicy extends AdminPolicy {
  index() {
    return true;
  }

  show() {
    return true;
  }

  permittedAttributes() {
    return ["movie_id", "auditorium_id", "start_time", "price", "lock_version"];
  }

  static scope(_user, query) {
    return query;
  }
}
