#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { open, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

function callConvex(deployment, name, args) {
  return JSON.parse(
    execFileSync(
      "pnpm",
      [
        "exec",
        "convex",
        "run",
        `coachActivityMigrations:${name}`,
        JSON.stringify(args),
        "--deployment",
        deployment,
        "--codegen",
        "disable",
      ],
      {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        stdio: ["ignore", "pipe", "inherit"],
      },
    ),
  );
}

function validateManifest(manifest) {
  if (
    manifest.version !== 1 ||
    !manifest.migrationId ||
    !manifest.organizationSlug ||
    !manifest.operator?.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(manifest.beforeDate) ||
    typeof manifest.deployment !== "string" ||
    !manifest.deployment ||
    ["dev", "prod", "preview"].includes(manifest.deployment) ||
    !Array.isArray(manifest.candidates)
  )
    throw new Error(
      "Invalid manifest. Use a named Convex deployment and generate a preview first.",
    );
  const ids = new Set();
  for (const target of manifest.candidates) {
    const original = JSON.parse(target.snapshot);
    if (
      !target.activityId ||
      ids.has(target.activityId) ||
      original._id !== target.activityId
    )
      throw new Error(
        "The manifest contains a duplicate or invalid activity snapshot.",
      );
    ids.add(target.activityId);
  }
}

export async function main(args, call = callConvex) {
  const { values: options } = parseArgs({
    args,
    options: {
      deployment: { type: "string" },
      organization: { type: "string" },
      before: { type: "string" },
      operator: { type: "string" },
      output: { type: "string" },
      manifest: { type: "string" },
      execute: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
  });
  if (options.help) {
    console.log(`Preview and back up candidates (no writes):
  node scripts/close-stale-coach-activities.mjs --deployment NAME --organization SLUG --before YYYY-MM-DD --operator EMAIL --output /tmp/closures.json
Validate the reviewed list (no writes):
  node scripts/close-stale-coach-activities.mjs --manifest /tmp/closures.json
Close only the reviewed list:
  node scripts/close-stale-coach-activities.mjs --manifest /tmp/closures.json --execute
Cutoff is exclusive, in America/New_York. Keep the manifest outside the repository.`);
    return;
  }
  if (options.execute && !options.manifest)
    throw new Error("Execution requires a reviewed manifest.");
  if (options.manifest) {
    if (
      [
        options.deployment,
        options.organization,
        options.before,
        options.operator,
        options.output,
      ].some((value) => value !== undefined)
    )
      throw new Error(
        "Use the deployment and scope stored in the manifest; do not override them.",
      );
    const manifest = JSON.parse(await readFile(options.manifest, "utf8"));
    validateManifest(manifest);
    const { deployment, organizationSlug, beforeDate, migrationId, operator } =
      manifest;
    const output = `${options.manifest}.${options.execute ? "execute" : "dry-run"}.jsonl`;
    const log = await open(output, "a", 0o600);
    try {
      for (let offset = 0; offset < manifest.candidates.length; offset += 10) {
        const targets = manifest.candidates
          .slice(offset, offset + 10)
          .map(({ activityId, snapshot }) => ({ activityId, snapshot }));
        await log.writeFile(
          JSON.stringify({
            attemptedAt: new Date().toISOString(),
            migrationId,
            deployment,
            dryRun: !options.execute,
            activityIds: targets.map((item) => item.activityId),
          }) + "\n",
        );
        const results = await call(deployment, "closeAdministratively", {
          organizationSlug,
          beforeDate,
          migrationId,
          operator,
          targets,
          dryRun: !options.execute,
        });
        await log.writeFile(
          JSON.stringify({ finishedAt: new Date().toISOString(), results }) +
            "\n",
        );
        console.table(results);
      }
    } finally {
      await log.close();
    }
    console.log(`Results: ${output}`);
    return;
  }
  const manifest = {
    version: 1,
    migrationId: randomUUID(),
    createdAt: new Date().toISOString(),
    deployment: options.deployment,
    organizationSlug: options.organization,
    beforeDate: options.before,
    operator: options.operator,
    candidates: [],
  };
  validateManifest(manifest);
  if (!options.output)
    throw new Error(
      "An output file is required to preserve the original records.",
    );
  let cursor = null;
  for (;;) {
    const page = await call(
      manifest.deployment,
      "previewAdministrativeClosures",
      {
        organizationSlug: manifest.organizationSlug,
        beforeDate: manifest.beforeDate,
        cursor,
      },
    );
    manifest.candidates.push(...page.candidates);
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
  validateManifest(manifest);
  await writeFile(options.output, JSON.stringify(manifest, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  console.table(
    manifest.candidates.map((activity) => ({
      activityId: activity.activityId,
      coachName: activity.coachName,
      title: activity.title,
      placeName: activity.placeName,
      checkInAt: new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/New_York",
      }).format(activity.checkInAt),
    })),
  );
  console.log(
    `${manifest.candidates.length} candidates. No records changed. Review: ${options.output}`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
