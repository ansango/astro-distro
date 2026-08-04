import { fetchLogo } from "../../lib/fastfetch";
import Logo from "./logo.astro";

const distros = [
  //debian
  { name: "debian", theme: {} },
  //kali
  { name: "kali", theme: {} },
  //arch
  { name: "arch", theme: {} },
  //ubuntu
  { name: "ubuntu", theme: {} },
  //fedora
  { name: "fedora", theme: {} },
  //opensuse
  { name: "opensuse", theme: {} },
  //alpine
  { name: "alpine", theme: {} },
];


const resolvedDistros = async () =>
  await Promise.all(
    distros.map(async (distro) => {
      const logos = await fetchLogo(distro.name);
      return {
        name: distro.name,
        logos: { small: logos[1], large: logos[0] },
        theme: distro.theme,
      };
    }),
  );

export default await resolvedDistros();
