import { ApplicationPolicy } from "./applicationPolicy.js";

// context.now: aktuelle Zeit fuer die Stornierungsfrist
export class BookingPolicy extends ApplicationPolicy {
  index() {
    return Boolean(this.user);
  }

  show() {
    return Boolean(this.user) && (this.record.user_id === this.user.id || this.isAdmin());
  }

  create() {
    return Boolean(this.user);
  }

  // FA-Opt-3: Stornierung nur bei kuenftiger Vorstellung
  destroy() {
    const startTime = new Date(this.record.showtime.start_time);
    return this.show() && startTime.getTime() > this.context.now.getTime();
  }

  static scope(user, query) {
    if (!user) return query.whereRaw("1 = 0");
    return user.admin ? query : query.where("bookings.user_id", user.id);
  }
}
