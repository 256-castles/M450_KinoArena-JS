import { AdminPolicy } from "./adminPolicy.js";

export class MoviePolicy extends AdminPolicy {
  index() {
    return true;
  }

  show() {
    return true;
  }

  // poster_url fehlte im Original, wodurch die Poster-URL aus dem Formular
  // stillschweigend verworfen wurde.
  permittedAttributes() {
    return ["title", "description", "duration_minutes", "poster_url", "lock_version"];
  }

  static scope(_user, query) {
    return query;
  }
}
