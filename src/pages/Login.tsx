import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  TextInput,
  Button,
  Paper,
  Title,
  Container,
  Stack,
  Center,
} from "@mantine/core";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Redirect if already logged in
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(name, email);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <Center h="100vh" bg="gray.1">
      <Container size="xs" px="xs">
        <Paper shadow="md" radius="md" p="xl">
          <form onSubmit={handleSubmit}>
            <Stack gap="lg">
              <Title order={2} ta="center">
                Welcome to Dog Finder
              </Title>

              <TextInput
                label="Name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <TextInput
                label="Email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button type="submit" fullWidth>
                Login
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Center>
  );
}
