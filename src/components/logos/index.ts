import { fetchLogo } from "../../lib/fastfetch";
import { distros } from "../../lib/themes";

const resolvedDistros = async () =>
	await Promise.all(
		distros.map(async (distro) => {
			const [large, small] = await fetchLogo(distro.slug);
			return { ...distro, logos: { small, large } };
		}),
	);

export default await resolvedDistros();
