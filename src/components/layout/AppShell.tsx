import { useState, useEffect } from "react";
import {
  AppShell as MantineAppShell,
  Group,
  Button,
  Center,
  Loader,
} from "@mantine/core";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const MATCHED_DOG_KEY = "matched_dog";

export function AppShell() {
  const navigate = useNavigate();
  const { logout: logoutContext, isLoading } = useAuth();
  const [hasMatch, setHasMatch] = useState(false);

  useEffect(() => {
    const checkMatch = () => {
      const match = localStorage.getItem(MATCHED_DOG_KEY);
      setHasMatch(!!match);
    };

    // Check initially
    checkMatch();

    // Listen for our custom event
    window.addEventListener("matchUpdate", checkMatch);
    return () => window.removeEventListener("matchUpdate", checkMatch);
  }, [hasMatch]);

  const handleLogout = async () => {
    try {
      logoutContext();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <MantineAppShell header={{ height: 64 }} padding="md" bg="gray.3">
      <MantineAppShell.Header
        p="xs"
        style={{ position: "sticky", top: 0, zIndex: 1000 }}
      >
        <Group justify="space-between" align="center">
          <Group>
            <Button variant="subtle" onClick={() => navigate("/")}>
              Search Dogs
            </Button>
            {hasMatch && (
              <Button variant="subtle" onClick={() => navigate("/match")}>
                View Match
              </Button>
            )}
          </Group>
          <Button onClick={handleLogout}>Logout</Button>
        </Group>
      </MantineAppShell.Header>

      {/* Adjusted Main Content */}
      <MantineAppShell.Main
        style={{ paddingTop: 64, minHeight: "calc(100vh - 64px)" }}
      >
        <Outlet />
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}

export default AppShell;
