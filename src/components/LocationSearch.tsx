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
} from "@mantine/core";
import { useDebouncedValue, useClickOutside } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";

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
}

interface Prediction {
  description: string;
  place_id: string;
}

export function LocationSearch({
  onBoundsChange,
  onFilter,
  onLocationFound,
}: LocationSearchProps) {
  const [searchValue, setSearchValue] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const dropdownRef = useClickOutside(() => setShowDropdown(false));
  const mapRef = useRef<google.maps.Map>(null);
  const [rectangle, setRectangle] = useState<google.maps.Rectangle | null>(
    null
  );
  const [drawingManager, setDrawingManager] =
    useState<google.maps.drawing.DrawingManager | null>(null);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService>(null);
  const placesService = useRef<google.maps.places.PlacesService>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const [debouncedSearch] = useDebouncedValue(searchValue, 500);

  const handlePlaceSelect = (prediction: Prediction) => {
    if (!mapRef.current || loading) return;

    setIsSelecting(true);
    setLoading(true);
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
    setSearchValue("");
    setPredictions([]);
    setLoading(false);
    onBoundsChange(null);
    onLocationFound?.({ city: undefined, states: undefined });
  };

  const clearRectangle = () => {
    if (rectangle) {
      rectangle.setMap(null);
    }
    setRectangle(null);
    onBoundsChange(null);
  };

  const handleRectangleComplete = (rect: google.maps.Rectangle) => {
    if (rectangle) {
      rectangle.setMap(null);
    }
    setRectangle(rect);

    google.maps.event.addListener(rect, "click", () => {
      clearRectangle();
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
        const response = await autocompleteService.current.getPlacePredictions({
          input: debouncedSearch,
          componentRestrictions: { country: "us" },
          types: ["(cities)"],
        });
        setPredictions(response.predictions);
        setShowDropdown(true);
      } catch (error) {
        console.error("Error fetching predictions:", error);
      } finally {
        setLoading(false);
        setIsSelecting(false);
      }
    };

    fetchPredictions();
  }, [debouncedSearch, isSelecting]);

  return (
    <Stack>
      <Box style={{ position: "relative" }} ref={dropdownRef}>
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
                  onClick={(e) => {
                    if (loading) return;
                    e.stopPropagation();
                    handlePlaceSelect(prediction);
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
        {rectangle ? (
          <Button variant="light" color="red" onClick={clearRectangle}>
            Clear Area
          </Button>
        ) : (
          <div />
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
