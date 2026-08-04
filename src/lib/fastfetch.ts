export async function fetchLogo(distro: string): Promise<[string, string]> {
    const BASE_URL = "https://raw.githubusercontent.com/fastfetch-cli/fastfetch/refs/heads/dev/src/logo/ascii/";
    const response = await fetch(`${BASE_URL}/${distro.at(0)}/${distro}.txt`);
    const smallResponse = await fetch(`${BASE_URL}/${distro.at(0)}/${distro}_small.txt`);
    const [full, small] = await Promise.all([
        response.text(),
        smallResponse.text(),
    ]);
    return [full, small];
}
