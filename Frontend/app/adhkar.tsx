import ResourceScreen, { type ResourceConfig } from "../components/RessourceScreen";

const config: ResourceConfig = {
  title: "Invocations & adhkar",
  subtitle: "Explore les rappels par thème, lis leur texte arabe et prends le temps d’en comprendre le sens.",
  icon: "heart-outline",
  endpoint: "/duas/categories",
  searchEndpoint: "/duas/search",
  searchParam: "q",
  kind: "duas",
};

export default function AdhkarScreen() {
  return <ResourceScreen config={config} />;
}
