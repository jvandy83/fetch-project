import axios from "axios";
import { Dog } from "../types";

export const BASE_URL = "https://frontend-take-home-service.fetch.com";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Important for handling auth cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Add response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

interface Coordinates {
  lat: number;
  lon: number;
}

interface SearchDogsParams {
  breeds?: string[];
  zipCodes?: string[];
  ageMin?: number;
  ageMax?: number;
  size?: number;
  from?: string;
  sort?: string;
  geoBoundingBox?: {
    top?: Coordinates;
    left?: Coordinates;
    bottom?: Coordinates;
    right?: Coordinates;
    bottom_left?: Coordinates;
    top_right?: Coordinates;
  };
  city?: string;
  states?: string[];
}

interface SearchResponse {
  resultIds: string[];
  total: number;
  next?: string;
  prev?: string;
}

interface Location {
  zip_code: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  county: string;
}

interface LocationSearchParams {
  city?: string;
  states?: string[];
  geoBoundingBox?: {
    top?: Coordinates;
    left?: Coordinates;
    bottom?: Coordinates;
    right?: Coordinates;
    bottom_left?: Coordinates;
    top_right?: Coordinates;
  };
  size?: number;
  from?: number;
}

async function searchLocations(
  params: LocationSearchParams
): Promise<Location[]> {
  const requestBody = {
    city: params.city,
    states: params.states,
    geoBoundingBox: params.geoBoundingBox,
    size: params.size,
    from: params.from,
  };

  const { data } = await apiClient.post<{ results: Location[]; total: number }>(
    "/locations/search",
    requestBody
  );
  return data.results;
}

// Add these new API functions
export async function getBreeds(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>("/dogs/breeds");
  return data;
}

export async function searchDogs(
  params: SearchDogsParams
): Promise<{ dogs: Dog[]; total: number }> {
  const { geoBoundingBox, city, states, ...queryParams } = params;

  // Use locations/search with city and states directly
  if (city || states || geoBoundingBox) {
    const locations = await searchLocations({
      city,
      states,
      geoBoundingBox,
    });
    queryParams.zipCodes = locations.map((loc) => loc.zip_code);
  }

  const searchResponse = await apiClient.get<SearchResponse>("/dogs/search", {
    params: {
      ...queryParams,
      size: queryParams.size || 25,
    },
  });

  if (searchResponse.data.resultIds.length === 0) {
    return { dogs: [], total: 0 };
  }

  const dogsResponse = await apiClient.post<Dog[]>(
    "/dogs",
    searchResponse.data.resultIds
  );

  return {
    dogs: dogsResponse.data,
    total: searchResponse.data.total,
  };
}

interface LoginCredentials {
  name: string;
  email: string;
}

export async function loginUser(credentials: LoginCredentials): Promise<void> {
  await apiClient.post("/auth/login", credentials);
}

export async function logoutUser(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function findMatch(favorites: string[]): Promise<Dog> {
  const { data } = await apiClient.post<{ match: string }>(
    "/dogs/match",
    favorites
  );
  const [dog] = await getDogs([data.match]);
  return dog;
}

export async function getDogs(ids: string[]): Promise<Dog[]> {
  const { data } = await apiClient.post<Dog[]>("/dogs", ids);
  return data;
}
