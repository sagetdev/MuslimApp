import ResourceScreen, { type ResourceConfig } from "../src/components/explore/ResourceScreen";

const config: ResourceConfig = {
  title: "Les 99 noms d’Allah",
  subtitle: "Explore les beaux noms et leurs significations.",
  icon: "flower-outline",
  endpoint: "/asma-ul-husna",
  searchEndpoint: "/asma-ul-husna/search",
  searchParam: "q",
};

export default function NamesScreen() {
  return <ResourceScreen config={config} />;
}
