import { ApplicationPolicy } from "./applicationPolicy.js";

// context.adminCount: Anzahl Administratoren (fuer den Schutz des letzten Admins)
export class UserPolicy extends ApplicationPolicy {
  index() {
    return this.isAdmin();
  }

  show() {
    return this.isOwnerOrAdmin();
  }

  update() {
    return this.isOwnerOrAdmin();
  }

  // Im Original durfte sich der letzte Administrator selbst loeschen, weil
  // "eigenes Konto" vor der Pruefung auf den letzten Admin erlaubt wurde.
  destroy() {
    if (!this.user) return false;
    if (this.isLastAdmin()) return false;
    return this.isOwner() || this.isAdmin();
  }

  changeRole() {
    return this.isAdmin() && !this.isOwner();
  }

  // Rechte-Eskalation verhindern: nur Administratoren duerfen "admin" uebermitteln.
  permittedAttributes() {
    const base = ["name", "email_address", "password", "password_confirmation"];
    return this.isAdmin() ? [...base, "admin"] : base;
  }

  isOwner() {
    return Boolean(this.user) && this.record?.id === this.user.id;
  }

  isOwnerOrAdmin() {
    return Boolean(this.user) && (this.isOwner() || this.isAdmin());
  }

  isLastAdmin() {
    return Boolean(this.record?.admin) && (this.context.adminCount ?? 0) <= 1;
  }

  static scope(user, query) {
    if (!user) return query.whereRaw("1 = 0");
    return user.admin ? query : query.where("users.id", user.id);
  }
}
