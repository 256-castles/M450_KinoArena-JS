// Die aktuelle Zeit wird injiziert statt direkt new Date() aufzurufen.
// So lassen sich Ablaufzeiten (Reservierung, Reset-Link, Sperrfrist) in Tests steuern.
export const systemClock = {
  now: () => new Date()
};
