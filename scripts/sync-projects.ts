#!/usr/bin/env bun
/**
 * Sync the projects in config.json with the latest data from GitHub.
 * This script fetches the latest information for each project listed in the config.json file,
 * including the name, description, repository URL, star count, size, and last updated date.
 * Use:
 *   bun run scripts/sync-projects.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "../src/config.json");

interface Project {
	name: string;
	description: string;
	repo: string;
	stars: string;
	updated: string;
	url: string;
	size: string;
	date: string;
}

interface GHRepo {
	full_name: string;
	name: string;
	description: string | null;
	html_url: string;
	stargazers_count: number;
	size: number;
	updated_at: string;
}

interface Config {
	sections: {
		projects: {
			projects: Project[];
		};
	};
}

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];


function formatStars(n: number): string {
	const comma = (x: number) => x.toLocaleString("en-US");
	if (n >= 1_000_000) {
		const v = (n / 1_000_000).toFixed(1).replace(/\.0$/, "");
		return `★ ${v}m`;
	}
	if (n >= 1_000) {
		const v = (n / 1_000).toFixed(1).replace(/\.0$/, "");
		return `★ ${v}k`;
	}
	if (n === 0) return "★ 1"; // spec: si no hay estrellas, pon 1
	return `★ ${comma(n)}`;
}


function formatSize(kb: number): string {
	const trimmed = (x: number) =>
		x.toLocaleString("en-US", { maximumFractionDigits: 1 });
	if (kb === 0) return "—";
	if (kb >= 1024 * 1024) return `${trimmed(kb / 1024 / 1024)}G`;
	if (kb >= 1024) return `${trimmed(kb / 1024)}M`;
	return `${kb.toLocaleString("en-US")}K`;
}


function formatDate(iso: string): string {
	const d = new Date(iso);
	return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}`;
}


function formatRelative(iso: string): string {
	const d = new Date(iso);
	const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
	if (days < 1) return "updated today";
	if (days === 1) return "updated yesterday";
	if (days < 7) return `updated ${days} days ago`;
	if (days < 30) {
		const w = Math.floor(days / 7);
		return `updated ${w} week${w > 1 ? "s" : ""} ago`;
	}
	if (days < 365) {
		const m = Math.floor(days / 30);
		return `updated ${m} month${m > 1 ? "s" : ""} ago`;
	}
	const y = Math.floor(days / 365);
	return `updated ${y} year${y > 1 ? "s" : ""} ago`;
}

function parseRepoUrl(
	url: string,
): { owner: string; repo: string } | null {
	const m = url.match(
		/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
	);
	return m ? { owner: m[1], repo: m[2] } : null;
}

async function fetchRepo(
	owner: string,
	repo: string,

): Promise<GHRepo | null> {
	const url = `https://api.github.com/repos/${owner}/${repo}`;
	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"User-Agent": "astro-distro-sync",
		"X-GitHub-Api-Version": "2022-11-28",
	};
	

	const res = await fetch(url, { headers });
	if (!res.ok) {
		console.error(
			`  ✗ GitHub ${res.status} ${res.statusText} — ${owner}/${repo}`,
		);
		return null;
	}
	return (await res.json()) as GHRepo;
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

		const description = (repo.description ?? "").trim();
		project.name = repo.name;
		project.description =
			description.length > 90
				? `${description.slice(0, 87).trimEnd()}…`
				: description;
		project.repo = `github.com/${repo.full_name}`;
		project.stars = formatStars(repo.stargazers_count);
		project.updated = formatRelative(repo.updated_at);
		project.size = formatSize(repo.size);
		project.date = formatDate(repo.updated_at);
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
