import { useLocalSearchParams, useRouter } from "expo-router";
import QuranPage from "../../components/QuranPage";

export default function QuranPageRoute() {
  const params = useLocalSearchParams<{ page?: string | string[] }>();
  const router = useRouter();
  const raw = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.min(604, Math.max(1, Number(raw) || 1));

  return (
    <QuranPage
      page={page}
      onPageChange={(next) => router.setParams({ page: String(next) })}
      onClose={() => (router.canGoBack() ? router.back() : router.replace("/"))}
    />
  );
}