import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { main } from "./close-stale-coach-activities.mjs";

test("preview keeps exact original snapshots across pages; execution uses only the reviewed manifest", async () => {
  const folder = await mkdtemp(join(tmpdir(), "cpca-closure-"));
  const file = join(folder, "preview.json");
  const candidate = (id) => ({
    activityId: id,
    snapshot: JSON.stringify({ _id: id, status: "in_progress" }),
    checkInAt: 1,
    title: id,
  });
  const calls = [];
  const call = async (deployment, name, args) => {
    calls.push({ deployment, name, args });
    return name === "previewAdministrativeClosures"
      ? {
          candidates: [candidate(args.cursor ? "second" : "first")],
          isDone: !!args.cursor,
          continueCursor: "next",
        }
      : args.targets.map(({ activityId }) => ({
          activityId,
          result: args.dryRun ? "wouldClose" : "closed",
        }));
  };
  try {
    await main(
      [
        "--deployment",
        "named-development",
        "--organization",
        "school",
        "--before",
        "2026-11-15",
        "--operator",
        "operator@example.com",
        "--output",
        file,
      ],
      call,
    );
    assert.equal(calls.length, 2);
    assert.ok(
      calls.every(({ name }) => name === "previewAdministrativeClosures"),
    );
    const manifest = JSON.parse(await readFile(file, "utf8"));
    assert.deepEqual(manifest.candidates, [
      candidate("first"),
      candidate("second"),
    ]);
    await main(["--manifest", file], call);
    assert.equal(calls.at(-1).args.dryRun, true);
    assert.equal(calls.at(-1).deployment, "named-development");
    manifest.candidates = [manifest.candidates[1]];
    await writeFile(file, JSON.stringify(manifest));
    await main(["--manifest", file, "--execute"], call);
    assert.equal(calls.at(-1).args.dryRun, false);
    assert.deepEqual(calls.at(-1).args.targets, [
      { activityId: "second", snapshot: candidate("second").snapshot },
    ]);
    assert.equal(JSON.parse(await readFile(file, "utf8")).candidates.length, 1);
    const log = (await readFile(file + ".execute.jsonl", "utf8"))
      .trim()
      .split("\n")
      .map(JSON.parse);
    assert.deepEqual(log[0].activityIds, ["second"]);
    assert.deepEqual(log[1].results, [
      { activityId: "second", result: "closed" },
    ]);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("execution rejects missing manifests, ambiguous deployments, overrides and duplicate targets before any call", async () => {
  let calls = 0;
  const call = () => {
    calls++;
  };
  const folder = await mkdtemp(join(tmpdir(), "cpca-closure-"));
  const file = join(folder, "preview.json");
  try {
    await assert.rejects(main(["--execute"], call), /reviewed manifest/);
    await assert.rejects(
      main(["--deployment", "prod"], call),
      /Invalid manifest/,
    );
    await assert.rejects(
      main(["--manifest", file, "--deployment", "other"], call),
      /do not override/,
    );
    const candidate = { activityId: "one", snapshot: '{"_id":"one"}' };
    await writeFile(
      file,
      JSON.stringify({
        version: 1,
        migrationId: "test",
        deployment: "named-production",
        organizationSlug: "school",
        beforeDate: "2026-11-15",
        operator: "operator@example.com",
        candidates: [candidate, candidate],
      }),
    );
    await assert.rejects(
      main(["--manifest", file, "--execute"], call),
      /duplicate/,
    );
    assert.equal(calls, 0);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
