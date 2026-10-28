// NFA-3: belegt, dass die Spielplanuebersicht unter gleichzeitiger Last schnell genug bleibt.
// Portierung von lib/tasks/benchmark.rake. Bei laufendem Server:
//   npm run benchmark:showtimes
//   REQUESTS=100 CONCURRENCY=50 LIMIT=1.5 URL=http://localhost:3000/api/showtimes npm run benchmark:showtimes

const url = process.env.URL ?? "http://localhost:3000/api/showtimes";
const requests = Number(process.env.REQUESTS ?? 50);
const concurrency = Number(process.env.CONCURRENCY ?? requests);
const limit = Number(process.env.LIMIT ?? 1.5);

const seconds = (value) => value.toFixed(3);

async function timedRequest() {
  const started = performance.now();
  const response = await fetch(url);
  await response.arrayBuffer();
  return { duration: (performance.now() - started) / 1000, status: response.status };
}

// Arbeitet eine gemeinsame Warteschlange mit `concurrency` parallelen Arbeitern ab.
async function runLoad(total) {
  let remaining = total;
  const results = [];
  const worker = async () => {
    while (remaining > 0) {
      remaining -= 1;
      results.push(await timedRequest());
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  return results;
}

console.log("NFA-3 Lasttest");
console.log(`  Ziel:            ${url}`);
console.log(`  Anfragen:        ${requests} (${concurrency} gleichzeitig)`);
console.log(`  Grenzwert:       ${limit} s pro Anfrage`);
console.log();

try {
  await fetch(url);
} catch (error) {
  console.error(`  Server nicht erreichbar (${error.cause?.code ?? error.message}). Starte ihn mit: npm run dev`);
  process.exit(1);
}

// Aufwaermen: der erste Zugriff fuellt Verbindungspool und Caches.
await runLoad(concurrency);

const startedAt = performance.now();
const results = await runLoad(requests);
const wallClock = (performance.now() - startedAt) / 1000;

const sorted = results.map((result) => result.duration).sort((a, b) => a - b);
const percentile = (p) => sorted[Math.max(Math.ceil(sorted.length * p) - 1, 0)];
const statuses = Object.entries(
  results.reduce((tally, { status }) => ({ ...tally, [status]: (tally[status] ?? 0) + 1 }), {})
);

console.log(`  Gesamtdauer:     ${seconds(wallClock)} s`);
console.log(`  Durchsatz:       ${(requests / wallClock).toFixed(1)} Anfragen/s`);
console.log();
console.log(`  Schnellste:      ${seconds(sorted[0])} s`);
console.log(`  Median (p50):    ${seconds(percentile(0.5))} s`);
console.log(`  p95:             ${seconds(percentile(0.95))} s`);
console.log(`  Langsamste:      ${seconds(sorted.at(-1))} s`);
console.log(`  HTTP-Status:     ${statuses.map(([code, count]) => `${code} x${count}`).join(", ")}`);
console.log();

if (statuses.some(([code]) => code !== "200")) {
  console.error("  FEHLGESCHLAGEN: nicht alle Anfragen lieferten HTTP 200.");
  process.exit(1);
} else if (sorted.at(-1) <= limit) {
  console.log(`  BESTANDEN: auch die langsamste Anfrage blieb unter ${limit} s.`);
} else {
  console.error(`  FEHLGESCHLAGEN: langsamste Anfrage ${seconds(sorted.at(-1))} s > ${limit} s.`);
  process.exit(1);
}
