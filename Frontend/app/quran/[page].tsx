import { useLocalSearchParams, useRouter } from "expo-router";
import QuranPage from "../../components/QuranPage";

export default function QuranPageRoute() {
  const params = useLocalSearchParams<{ page?: string | string[] }>();
  const router = useRouter();
  const raw = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.min(604, Math.max(1, Number(raw) || 1));

  return (
    <QuranPage
      // 🔑 Force un remontage complet si la page change depuis l'extérieur.
      key={`quran-${page}`}
      initialPage={page}
      onClose={() => (router.canGoBack() ? router.back() : router.replace("/"))}
    />
  );
}