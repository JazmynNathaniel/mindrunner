/**
 * MEMORY BANKS verification (read-only): runs listArchive against the database
 * in .env and asserts structural invariants — index ordering, filters,
 * pagination, and the no-timestamps guarantee. Run with:
 *   npx tsx scripts/verify-archive.ts
 */
import { prisma } from "../src/server/db";
import { countArchive, listArchive } from "../src/server/thoughts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

const base = { q: undefined, category: undefined, tag: undefined } as const;

async function main() {
  const all = await listArchive({ ...base, sort: "newest", offset: 0, limit: 50 });
  const count = await countArchive();
  console.log(`archive holds ${all.total} records (showing up to 50)`);

  check("countArchive matches listArchive total", count === all.total);
  check("unfiltered: matched === total", all.matched === all.total);
  check(
    "every record carries a valid thoughtAt (when she had it)",
    all.entries.every((e) => Number.isFinite(Date.parse(e.thoughtAt)))
  );
  check(
    "scheduling times never leak",
    all.entries.every((e) => !("publishedAt" in e) && !("expiresAt" in e) && !("scheduledFor" in e))
  );
  check(
    "indexes are within 1..total and unique",
    all.entries.every((e) => e.index >= 1 && e.index <= all.total) &&
      new Set(all.entries.map((e) => e.index)).size === all.entries.length
  );
  check(
    "newest first: indexes strictly decreasing",
    all.entries.every((e, i) => i === 0 || e.index < all.entries[i - 1].index)
  );
  check(
    "newest first: thoughtAt non-increasing (order follows when she had it)",
    all.entries.every((e, i) => i === 0 || Date.parse(e.thoughtAt) <= Date.parse(all.entries[i - 1].thoughtAt))
  );

  const oldest = await listArchive({ ...base, sort: "oldest", offset: 0, limit: 50 });
  check(
    "oldest first: indexes strictly increasing",
    oldest.entries.every((e, i) => i === 0 || e.index > oldest.entries[i - 1].index)
  );
  check(
    "sort direction does not change ordinals",
    oldest.entries.length === 0 || oldest.entries[0].index === 1
  );

  if (all.total >= 2) {
    const p1 = await listArchive({ ...base, sort: "newest", offset: 0, limit: 1 });
    const p2 = await listArchive({ ...base, sort: "newest", offset: 1, limit: 1 });
    check(
      "pagination: consecutive pages are disjoint and contiguous",
      p1.entries[0].id !== p2.entries[0].id && p1.entries[0].index === p2.entries[0].index + 1
    );
  } else {
    console.log("skip  pagination check (needs >= 2 records)");
  }

  const sample = all.entries[0];
  if (sample) {
    const byCat = await listArchive({ ...base, category: sample.category as never, sort: "newest", offset: 0, limit: 50 });
    check(
      "category filter: only that category, sample included",
      byCat.entries.every((e) => e.category === sample.category) &&
        byCat.entries.some((e) => e.id === sample.id)
    );

    const word = sample.text.split(/\s+/).find((w) => w.length >= 3);
    if (word) {
      const byQ = await listArchive({ ...base, q: word.toUpperCase(), sort: "newest", offset: 0, limit: 50 });
      check(
        "text search is case-insensitive and hits the sample",
        byQ.entries.some((e) => e.id === sample.id)
      );
    }

    const tagged = all.entries.find((e) => e.tags.length > 0);
    if (tagged) {
      const byTag = await listArchive({ ...base, tag: tagged.tags[0], sort: "newest", offset: 0, limit: 50 });
      check(
        "tag filter: every hit carries the tag, sample included",
        byTag.entries.every((e) => e.tags.includes(tagged.tags[0])) &&
          byTag.entries.some((e) => e.id === tagged.id)
      );
    } else {
      console.log("skip  tag filter check (no tagged records)");
    }
  } else {
    console.log("skip  filter checks (archive empty)");
  }

  const none = await listArchive({ ...base, q: "zzz-no-thought-says-this-zzz", sort: "newest", offset: 0, limit: 50 });
  check("non-matching search returns 0 matched but keeps total", none.matched === 0 && none.total === all.total);

  console.log(failures === 0 ? "\nall archive invariants hold." : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().finally(() => prisma.$disconnect());
