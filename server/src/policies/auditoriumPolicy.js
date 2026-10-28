import { AdminPolicy } from "./adminPolicy.js";

export class AuditoriumPolicy extends AdminPolicy {
  // Nach dem Anlegen darf nur noch der Name geaendert werden.
  permittedAttributes() {
    return this.record?.id ? ["name"] : ["name", "row_count", "seats_per_row"];
  }
}
