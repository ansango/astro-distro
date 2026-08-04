const BASE_URL =
	"https://raw.githubusercontent.com/fastfetch-cli/fastfetch/refs/heads/dev/src/logo/ascii/";

export async function fetchLogo(distro: string): Promise<string> {
	const logo = await fetch(`${BASE_URL}/${distro.at(0)}/${distro}.txt`);
	return await logo.text();
}
