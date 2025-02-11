import { BrowserRouter } from "react-router-dom";
import { MantineProvider, createTheme } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./routes";
import { LoadScript } from "@react-google-maps/api";

// Configure React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Configure Mantine theme
const theme = createTheme({
  primaryColor: "blue",
  // You can customize your theme here
  components: {
    Button: {
      defaultProps: {
        size: "md",
      },
    },
  },
});

const libraries: ("places" | "drawing")[] = ["places", "drawing"];

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={libraries}
      >
        <MantineProvider theme={theme}>
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </MantineProvider>
      </LoadScript>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}

export default App;
