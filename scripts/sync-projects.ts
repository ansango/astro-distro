#!/usr/bin/env bun
/**
 * Sync the projects in config.json with the latest data from GitHub.
 * This script fetches the latest information for each project listed in the config.json file,
 * including the name, description, repository URL, star count, size, and last updated date.
 * Use:
 *   bun run scripts/sync-projects.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildProjectFromUrl,
	fetchRepo,
	type Project,
	parseRepoUrl,
} from "./lib/project.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "../src/config.json");

interface Config {
	sections: {
		projects: {
			projects: Project[];
		};
	};
}

async function main() {
	const raw = readFileSync(CONFIG_PATH, "utf-8");
	const config = JSON.parse(raw) as Config;
	const projects = config.sections.projects.projects;

	let ok = 0;
	for (const [i, project] of projects.entries()) {
		console.log(`[${i + 1}/${projects.length}] ${project.url}`);
		const parts = parseRepoUrl(project.url);
		if (!parts) {
			console.error("  ✗ URL not recognized as a GitHub repo");
			continue;
		}
		const repo = await fetchRepo(parts.owner, parts.repo);
		if (!repo) continue;

		Object.assign(project, buildProjectFromUrl(repo, project.url));
		ok++;
		await new Promise((r) => setTimeout(r, 200));
	}

	writeFileSync(CONFIG_PATH, JSON.stringify(config, null, "\t") + "\n");
	console.log(`\n✓ ${ok}/${projects.length} actualizados`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
