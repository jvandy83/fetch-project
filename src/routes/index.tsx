import { Routes, Route } from "react-router-dom";
import { Login } from "../pages/Login";
import { Search } from "../pages/Search";
import { Match } from "../pages/Match";
import { AppShell } from "../components/layout/AppShell";
import { AuthGuard } from "../components/layout/AuthGard";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AuthGuard />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Search />} />
          <Route path="/match" element={<Match />} />
        </Route>
      </Route>
    </Routes>
  );
}
