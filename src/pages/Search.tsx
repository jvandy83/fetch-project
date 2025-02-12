import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue, useWindowScroll } from "@mantine/hooks";
import {
  Container,
  MultiSelect,
  Group,
  Button,
  SegmentedControl,
  Grid,
  Card,
  Image,
  Text,
  Badge,
  ActionIcon,
  Stack,
  Pagination,
  Center,
  Box,
  NumberInput,
  TextInput,
  SimpleGrid,
  Loader,
  Skeleton,
  Select,
} from "@mantine/core";
import {
  IconHeart,
  IconHeartFilled,
  IconX,
  IconFilterOff,
} from "@tabler/icons-react";
import { searchDogs, getBreeds } from "../api/client";
import { LocationSearch } from "../components/LocationSearch";

const DOGS_PER_PAGE = 12;
const MATCHED_DOG_KEY = "matched_dog";

function DogCardSkeleton() {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section pt="xl">
        <Skeleton height={160} />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Skeleton height={28} width="70%" />
        <Skeleton height={28} circle />
      </Group>

      <Stack gap="xs">
        <Group justify="space-between" gap="xs">
          <Skeleton height={20} width={100} />
          <Skeleton height={20} width={100} />
        </Group>
        <Skeleton height={16} width="60%" mx="auto" />
      </Stack>
    </Card>
  );
}

export function Search() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedBreeds, setSelectedBreeds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<"breed" | "name" | "age">("breed");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState<number | undefined>();
  const [ageMax, setAgeMax] = useState<number | undefined>(20);
  const [zipCode, setZipCode] = useState<string>("");
  const [page, setPage] = useState(1);
  const [scroll] = useWindowScroll();
  const containerRef = useRef<HTMLDivElement>(null);
  const [geoBounds, setGeoBounds] = useState<{
    top: number;
    left: number;
    bottom: number;
    right: number;
  } | null>(null);
  const [cityFilter, setCityFilter] = useState<string | undefined>();
  const [statesFilter, setStatesFilter] = useState<string[] | undefined>();

  const { data: breeds = [] } = useQuery({
    queryKey: ["breeds"],
    queryFn: getBreeds,
  });

  const [debouncedAgeMin] = useDebouncedValue(ageMin, 500);
  const [debouncedAgeMax] = useDebouncedValue(ageMax, 500);
  const [debouncedZipCode] = useDebouncedValue(zipCode, 500);

  const { data: searchResult = { dogs: [], total: 0 }, isLoading } = useQuery({
    queryKey: [
      "dogs",
      selectedBreeds,
      sortField,
      sortOrder,
      page,
      debouncedAgeMin,
      debouncedAgeMax,
      debouncedZipCode,
      geoBounds,
      cityFilter,
      statesFilter,
    ],
    queryFn: () =>
      searchDogs({
        breeds: selectedBreeds.length > 0 ? selectedBreeds : undefined,
        sort: `${sortField}:${sortOrder}`,
        size: DOGS_PER_PAGE,
        from: String((page - 1) * DOGS_PER_PAGE),
        ageMin: debouncedAgeMin,
        ageMax: debouncedAgeMax,
        zipCodes: debouncedZipCode ? [debouncedZipCode] : undefined,
        geoBoundingBox: geoBounds
          ? {
              bottom_left: {
                lat: geoBounds.bottom,
                lon: geoBounds.left,
              },
              top_right: {
                lat: geoBounds.top,
                lon: geoBounds.right,
              },
            }
          : undefined,
        city: cityFilter,
        states: statesFilter,
      }),
    refetchOnWindowFocus: false,
    staleTime: 0,
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  console.log("searchResult", searchResult);

  const totalPages = Math.ceil(searchResult.total / DOGS_PER_PAGE);

  const toggleFavorite = (dogId: string) => {
    setFavorites((current) =>
      current.includes(dogId)
        ? current.filter((id) => id !== dogId)
        : [...current, dogId]
    );
  };

  const handleMatch = () => {
    if (favorites.length > 0) {
      localStorage.removeItem(MATCHED_DOG_KEY);
      window.dispatchEvent(new Event("matchUpdate"));
      navigate("/match", { state: { favorites } });
    }
  };

  const isNearBottom = useCallback(() => {
    if (!containerRef.current) return false;
    const containerBottom = containerRef.current.getBoundingClientRect().bottom;
    const viewportHeight = window.innerHeight;
    return containerBottom - viewportHeight < 100;
  }, [scroll]);

  const handleLocationChange = ({
    city,
    states,
  }: {
    city?: string;
    states?: string[];
  }) => {
    setCityFilter(city);
    setStatesFilter(states);
    setPage(1);
  };

  const resetAllFilters = () => {
    setSelectedBreeds([]);
    setAgeMin(undefined);
    setAgeMax(20);
    setZipCode("");
    setGeoBounds(null);
    setCityFilter(undefined);
    setStatesFilter(undefined);
    setPage(1);
  };

  useEffect(() => {
    console.log("State changed:", {
      geoBounds,
      searchResult,
      isLoading,
      page,
    });
  }, [geoBounds, searchResult, isLoading, page]);

  return (
    <Container pb="xl" size="xl" ref={containerRef}>
      <Stack
        gap="md"
        style={{ height: `${searchResult.dogs.length <= 6 ? "100vh" : ""}` }}
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Stack gap="xs">
            <MultiSelect
              data={breeds}
              value={selectedBreeds}
              onChange={setSelectedBreeds}
              label="Filter by breed"
              placeholder="Select breeds"
              searchable
              clearable
            />
            <Group grow>
              <Box pos="relative">
                <NumberInput
                  label="Min Age"
                  placeholder="0"
                  min={0}
                  max={ageMax || undefined}
                  value={ageMin}
                  onChange={(val) =>
                    setAgeMin(typeof val === "number" ? val : undefined)
                  }
                  leftSection={
                    ageMin !== undefined && (
                      <ActionIcon
                        size="xs"
                        variant="transparent"
                        color="gray"
                        onClick={() => setAgeMin(undefined)}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    )
                  }
                />
              </Box>
              <Box pos="relative">
                <NumberInput
                  label="Max Age"
                  placeholder="20"
                  min={ageMin || 0}
                  max={20}
                  value={ageMax}
                  onChange={(val) =>
                    setAgeMax(typeof val === "number" ? val : undefined)
                  }
                  leftSection={
                    ageMax !== undefined &&
                    ageMax !== 20 && (
                      <ActionIcon
                        size="xs"
                        variant="transparent"
                        color="gray"
                        onClick={() => setAgeMax(20)}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    )
                  }
                />
              </Box>
            </Group>
            <TextInput
              label="ZIP Code"
              placeholder="Enter ZIP code"
              value={zipCode}
              onChange={(e) => setZipCode(e.currentTarget.value)}
              disabled={!!(cityFilter || statesFilter || geoBounds)}
              description={
                cityFilter || statesFilter || geoBounds
                  ? "Clear location search to use ZIP code"
                  : undefined
              }
            />
            <LocationSearch
              reset={resetAllFilters}
              onBoundsChange={(bounds) => {
                setGeoBounds(bounds);
                setPage(1);
              }}
              onLocationFound={handleLocationChange}
              onFilter={() => {}}
              disabled={!!zipCode}
              description={
                zipCode ? "Clear ZIP code to use location search" : undefined
              }
            />
          </Stack>
          <Stack gap="xs" align="flex-end">
            <Select
              label="Sort by"
              value={sortField}
              onChange={(value) =>
                setSortField(value as "breed" | "name" | "age")
              }
              data={[
                { label: "Breed", value: "breed" },
                { label: "Name", value: "name" },
                { label: "Age", value: "age" },
              ]}
            />
            <SegmentedControl
              value={sortOrder}
              onChange={(value) => setSortOrder(value as "asc" | "desc")}
              data={[
                {
                  label: sortField === "age" ? "Youngest" : "A-Z",
                  value: "asc",
                },
                {
                  label: sortField === "age" ? "Oldest" : "Z-A",
                  value: "desc",
                },
              ]}
            />
          </Stack>
        </SimpleGrid>

        <Grid>
          {isLoading ? (
            Array.from({ length: DOGS_PER_PAGE }).map((_, index) => (
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={index}>
                <DogCardSkeleton />
              </Grid.Col>
            ))
          ) : searchResult.dogs.length === 0 ? (
            <Grid.Col span={12}>
              <Center py="xl">
                <Stack align="center" gap="md">
                  <Text size="xl" fw={500} c="dimmed">
                    No dogs found
                  </Text>
                  <Text c="dimmed">
                    Try adjusting your filters or search criteria
                  </Text>
                </Stack>
              </Center>
            </Grid.Col>
          ) : (
            searchResult.dogs.map((dog) => (
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={dog.id}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Card.Section pt="xl">
                    <Image
                      src={dog.img}
                      height={160}
                      alt={dog.name}
                      fit="contain"
                      radius="md"
                      fallbackSrc="https://placehold.co/400x200?text=No+Image"
                    />
                  </Card.Section>

                  <Group justify="space-between" mt="md" mb="xs">
                    <Text ta="center" size="xl" fw={500}>
                      {dog.name}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => toggleFavorite(dog.id)}
                    >
                      {favorites.includes(dog.id) ? (
                        <IconHeartFilled size={20} />
                      ) : (
                        <IconHeart size={20} />
                      )}
                    </ActionIcon>
                  </Group>

                  <Stack gap="xs">
                    <Group justify="space-between" gap="xs">
                      <Badge color="blue">{dog.breed}</Badge>
                      <Badge color="cyan">{dog.age} years old</Badge>
                    </Group>
                    <Text size="sm" c="dimmed" ta="center">
                      Location: {dog.zip_code}
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
            ))
          )}
        </Grid>

        {totalPages > 1 && (
          <Center my="lg">
            <Pagination
              value={page}
              onChange={setPage}
              total={totalPages}
              radius="md"
            />
          </Center>
        )}

        {favorites.length > 0 && (
          <Box
            style={{
              position: "fixed",
              bottom:
                isNearBottom() && searchResult.dogs.length >= 12 ? 80 : 20,
              transition: "bottom 0.2s ease",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 100,
            }}
          >
            <Button
              onClick={handleMatch}
              size="lg"
              style={{ backgroundColor: "#ed4a5f", opacity: 0.9 }}
              radius="xl"
              px="xl"
              leftSection={<IconHeartFilled size={20} />}
            >
              Find Match ({favorites.length})
            </Button>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
