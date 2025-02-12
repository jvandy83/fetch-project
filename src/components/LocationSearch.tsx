import { useState, useRef, useEffect } from "react";
import { GoogleMap } from "@react-google-maps/api";
import {
  Box,
  TextInput,
  Paper,
  Stack,
  Text,
  Group,
  Button,
  Loader,
  ActionIcon,
  Center,
} from "@mantine/core";
import { useDebouncedValue, useClickOutside } from "@mantine/hooks";
import { IconX, IconFilterOff } from "@tabler/icons-react";

interface LocationSearchProps {
  onBoundsChange: (
    bounds: {
      top: number;
      left: number;
      bottom: number;
      right: number;
    } | null
  ) => void;
  onFilter: () => void;
  onLocationFound?: (location: { city?: string; states?: string[] }) => void;
  disabled?: boolean;
  description?: string;
  reset?: () => void;
}

interface Prediction {
  description: string;
  place_id: string;
}

export function LocationSearch({
  reset,
  onBoundsChange,
  onFilter,
  onLocationFound,
}: LocationSearchProps) {
  const [searchValue, setSearchValue] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  console.log("predictions", predictions);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const dropdownRef = useClickOutside(() => setShowDropdown(false));
  const mapRef = useRef<google.maps.Map>(null);

  const [rectangles, setRectangles] = useState<google.maps.Rectangle[]>([]);
  const [drawingManager, setDrawingManager] =
    useState<google.maps.drawing.DrawingManager | null>(null);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService>(null);
  const placesService = useRef<google.maps.places.PlacesService>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useClickOutside(() => setShowDropdown(false));

  const [debouncedSearch] = useDebouncedValue(searchValue, 500);

  const handlePlaceSelect = (prediction: Prediction) => {
    console.log("handlePlaceSelect", prediction);
    if (!mapRef.current || loading) return;

    setLoading(true);
    setIsSelecting(true);
    setPredictions([]);

    if (!placesService.current) {
      placesService.current = new google.maps.places.PlacesService(
        mapRef.current
      );
    }

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["geometry", "address_components"],
      },
      (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.viewport
        ) {
          if (markerRef.current) {
            markerRef.current.setMap(null);
          }

          const center = place.geometry.viewport.getCenter();

          // Add new marker
          markerRef.current = new google.maps.Marker({
            map: mapRef.current!,
            position: center,
            animation: google.maps.Animation.DROP,
          });

          // Just center the map on the marker
          mapRef.current?.panTo(center);

          // Set bounds for the search area
          onBoundsChange({
            top: place.geometry.viewport.getNorthEast().lat(),
            right: place.geometry.viewport.getNorthEast().lng(),
            bottom: place.geometry.viewport.getSouthWest().lat(),
            left: place.geometry.viewport.getSouthWest().lng(),
          });

          const cityComponent = place.address_components?.find((component) =>
            component.types.includes("locality")
          );
          const stateComponent = place.address_components?.find((component) =>
            component.types.includes("administrative_area_level_1")
          );

          console.log("Found location components:", {
            city: cityComponent?.long_name,
            state: stateComponent?.short_name,
            allComponents: place.address_components,
          });

          if (onLocationFound && (cityComponent || stateComponent)) {
            onLocationFound({
              city: cityComponent?.long_name,
              states: stateComponent ? [stateComponent.short_name] : undefined,
            });

            // Set display value to "City, State" format
            setSearchValue(
              [cityComponent?.long_name, stateComponent?.short_name]
                .filter(Boolean)
                .join(", ")
            );
          }

          // Only need to clear loading state here now
          setLoading(false);
          onFilter();
        }
      }
    );
  };

  const clearSearch = () => {
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    setIsSelecting(false);
    setSearchValue("");
    onBoundsChange(null);
    onLocationFound?.({ city: undefined, states: undefined });
  };

  const clearRectangle = () => {
    rectangles.forEach((rect) => rect.setMap(null)); // Remove all from the map
    setRectangles([]); // Clear state
    onBoundsChange(null);
  };

  const resetAllFilters = () => {
    clearSearch();
    clearRectangle();
    reset?.();
    setShowDropdown(false);
    setPredictions([]);
    setLoading(false);
    setIsSelecting(false);
    setSearchValue("");
  };

  const handleRectangleComplete = (rect: google.maps.Rectangle) => {
    setRectangles((prev) => [...prev, rect]); // Store all rectangles

    google.maps.event.addListener(rect, "click", () => {
      rect.setMap(null);
      setRectangles((prev) => prev.filter((r) => r !== rect));
    });

    const bounds = rect.getBounds();
    if (bounds) {
      onBoundsChange({
        top: bounds.getNorthEast().lat(),
        right: bounds.getNorthEast().lng(),
        bottom: bounds.getSouthWest().lat(),
        left: bounds.getSouthWest().lng(),
      });
      onFilter();
      setSearchValue(""); // Clear input after drawing rectangle
      setPredictions([]); // Clear any existing predictions
    }
  };

  useEffect(() => {
    if (window.google && !autocompleteService.current) {
      autocompleteService.current =
        new google.maps.places.AutocompleteService();
    }
  }, []);

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!debouncedSearch || !autocompleteService.current || isSelecting)
        return;

      setLoading(true);
      try {
        const response = await autocompleteService.current?.getPlacePredictions(
          {
            input: debouncedSearch,
            componentRestrictions: { country: "us" },
            types: ["(cities)"],
          }
        );
        setPredictions(response!.predictions);
        setShowDropdown(true);
      } catch (error) {
        console.error("Error fetching predictions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [debouncedSearch]);

  return (
    <Stack>
      <Box style={{ position: "relative" }} ref={dropdownRef}>
        <Group w="100%" justify="space-between" align="center">
          <TextInput
            label="Search by location"
            placeholder="Enter a US city"
            value={searchValue}
            onChange={(e) => setSearchValue(e.currentTarget.value)}
            rightSection={
              loading ? (
                <Loader size="xs" />
              ) : (
                searchValue && (
                  <ActionIcon size="sm" onClick={clearSearch} color="red">
                    <IconX size={16} />
                  </ActionIcon>
                )
              )
            }
          />
          <Box pt="lg">
            <Button
              variant="light"
              color="gray"
              onClick={resetAllFilters}
              leftSection={<IconFilterOff size={16} />}
            >
              Reset All Filters
            </Button>
          </Box>
        </Group>
        {showDropdown && predictions.length > 0 && (
          <Paper
            shadow="md"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 1000,
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            <Stack>
              {predictions.map((prediction) => (
                <Button
                  key={prediction.place_id}
                  variant="subtle"
                  onClick={() => {
                    if (loading) return;
                    handlePlaceSelect(prediction);
                    setShowDropdown(false);
                    setPredictions([]);
                  }}
                  disabled={loading}
                  fullWidth
                >
                  {prediction.description}
                </Button>
              ))}
            </Stack>
          </Paper>
        )}
      </Box>
      <Group h={36} justify="apart" align="flex-end">
        {rectangles.length > 0 && (
          <Button variant="light" color="red" onClick={clearRectangle}>
            Clear Area
          </Button>
        )}
      </Group>
      <Box h={300}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          zoom={4}
          center={{ lat: 39.8283, lng: -98.5795 }} // Center of US
          onLoad={(map) => {
            mapRef.current = map;
            const manager = new google.maps.drawing.DrawingManager({
              drawingMode: google.maps.drawing.OverlayType.RECTANGLE,
              drawingControl: true,
              drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [google.maps.drawing.OverlayType.RECTANGLE],
              },
            });
            manager.setMap(map);
            setDrawingManager(manager);
            google.maps.event.addListener(
              manager,
              "rectanglecomplete",
              handleRectangleComplete
            );
          }}
        />
      </Box>
      <Text size="sm" c="dimmed">
        Use the rectangle tool to draw a search area on the map
      </Text>
    </Stack>
  );
}
