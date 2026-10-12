import ResourceScreen, { type ResourceConfig } from "../components/RessourceScreen";

const config: ResourceConfig = {
  title: "Hadiths",
  subtitle: "Parcours les recueils, lis les enseignements et ouvre chaque texte pour consulter ses détails et références disponibles.",
  icon: "library-outline",
  endpoint: "/hadith/collections",
  searchEndpoint: "/hadith/search",
  searchParam: "q",
  kind: "hadith",
};

export default function HadithScreen() {
  return <ResourceScreen config={config} />;
}
