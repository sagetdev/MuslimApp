import ResourceScreen, { type ResourceConfig } from "../src/components/explore/ResourceScreen";

const config: ResourceConfig = {
  title: "Date hégirienne",
  subtitle: "Consulte la date du calendrier hégirien.",
  icon: "calendar-outline",
  endpoint: "/today-hijri",
  includeTimezone: true,
};

export default function HijriScreen() {
  return <ResourceScreen config={config} />;
}
