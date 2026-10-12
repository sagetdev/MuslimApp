import ResourceScreen, { type ResourceConfig } from "../components/RessourceScreen";

const config: ResourceConfig = {
  title: "Hadiths",
  subtitle: "Découvre les enseignements et paroles prophétiques.",
  icon: "library-outline",
  endpoint: "/hadith/random",
  searchEndpoint: "/hadith/search",
  searchParam: "q",
};

export default function HadithScreen() {
  return <ResourceScreen config={config} />;
}
