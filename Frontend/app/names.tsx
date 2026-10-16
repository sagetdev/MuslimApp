import ResourceScreen, { type ResourceConfig } from "../components/RessourceScreen";

const config: ResourceConfig = {
  title: "Les 99 noms d’Allah",
  subtitle: "Découvre les beaux noms, leur écriture arabe et leur signification, à ton rythme.",
  icon: "flower-outline",
  endpoint: "/asma-ul-husna",
  searchEndpoint: "/asma-ul-husna/search",
  searchParam: "q",
  kind: "names",
};

export default function NamesScreen() {
  return <ResourceScreen config={config} />;
}
