import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Confetti from "react-confetti"; // Import Confetti
import {
  Container,
  Card,
  Image,
  Text,
  Badge,
  Group,
  Stack,
  Center,
  Title,
  Button,
} from "@mantine/core";
import { findMatch } from "../api/client";
import { Dog } from "../types";

const MATCHED_DOG_KEY = "matched_dog";

export function Match() {
  const location = useLocation();
  const navigate = useNavigate();
  const [matchedDog, setMatchedDog] = useState<Dog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const favorites = location.state?.favorites || [];

  useEffect(() => {
    const getMatch = async () => {
      // Try to get stored match first
      const storedMatch = localStorage.getItem(MATCHED_DOG_KEY);
      if (storedMatch) {
        setMatchedDog(JSON.parse(storedMatch));
        setIsLoading(false);
        return;
      }

      // If no stored match and no favorites, show error
      if (favorites.length === 0) {
        setError("No favorite dogs selected");
        setIsLoading(false);
        return;
      }

      try {
        const dog = await findMatch(favorites);
        setMatchedDog(dog);
        localStorage.setItem(MATCHED_DOG_KEY, JSON.stringify(dog));
        window.dispatchEvent(new Event("matchUpdate"));
      } catch (err) {
        console.error("Match error:", err);
        setError("Failed to find a match");
      } finally {
        setIsLoading(false);
      }
    };

    getMatch();
  }, []);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Title order={2}>Finding your perfect match...</Title>
      </Center>
    );
  }

  if (error || !matchedDog) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Title order={2} c="red">
            {error || "No match found"}
          </Title>
          <Button onClick={() => navigate("/")}>Return to Search</Button>
        </Stack>
      </Center>
    );
  }

  return (
    <>
      {/* Confetti Animation */}
      <Confetti recycle={false} numberOfPieces={300} />

      <Container size="sm">
        <Stack gap="xl" justify="center">
          <Title order={2} ta="center">
            Congratulations! You've been matched with {matchedDog.name}
          </Title>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Card.Section pt="xl">
              <Image
                src={matchedDog.img}
                height={300}
                alt={matchedDog.name}
                fit="contain"
                fallbackSrc="https://placehold.co/600x300?text=No+Image"
              />
            </Card.Section>

            <Stack gap="md" mt="md">
              <Text ta="center" fw={500} size="xl">
                {matchedDog.name}
              </Text>
              <Group justify="space-around">
                <Badge color="cyan" size="lg">
                  {matchedDog.age} years old
                </Badge>
                <Badge size="lg" color="blue">
                  {matchedDog.breed}
                </Badge>
              </Group>

              <Text ta="center" size="sm" c="dimmed">
                Location: {matchedDog.zip_code}
              </Text>
            </Stack>
          </Card>

          <Button onClick={() => navigate("/")} fullWidth>
            Continue Searching
          </Button>
        </Stack>
      </Container>
    </>
  );
}

export default Match;
