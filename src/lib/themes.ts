/**
 * Única lista de distros del sitio: de aquí salen los logos que se piden a
 * fastfetch (components/logos), los slugs de `data-theme` (styles/themes.css)
 * y el contenido que varía por distro.
 */
export const distros = [
	{ slug: "windows", os: "Windows 11", pkg: "winget" },
	{ slug: "macos", os: "macOS Sonoma", pkg: "brew" },
	{ slug: "arch", os: "Arch Linux (rolling)", pkg: "pacman" },
	{ slug: "debian", os: "Debian 12 (bookworm)", pkg: "apt" },
	{ slug: "ubuntu", os: "Ubuntu 24.04 LTS", pkg: "apt" },
	{ slug: "kali", os: "Kali Linux (rolling)", pkg: "apt" },
	{ slug: "fedora", os: "Fedora 40", pkg: "dnf" },
	{ slug: "opensuse", os: "openSUSE Tumbleweed", pkg: "zypper" },
	{ slug: "alpine", os: "Alpine Linux 3.20", pkg: "apk" },
] as const;

export type Distro = (typeof distros)[number];
export type Theme = Distro["slug"];

export const themes: Theme[] = distros.map((distro) => distro.slug);

export const DEFAULT_THEME: Theme = "arch";

/** clave de localStorage — replicada literalmente en el script anti-FOUC del layout */
export const STORAGE_KEY = "theme";
