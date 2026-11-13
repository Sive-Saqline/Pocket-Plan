import { RequireAuth } from "@/components/auth/RequireAuth";
import { HomeScreen } from "@/components/home/HomeScreen";

export default function Home() {
  return (
    <RequireAuth>
      <HomeScreen />
    </RequireAuth>
  );
}
