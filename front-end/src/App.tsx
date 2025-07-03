import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { theme } from "./theme";
import { UserProvider } from "./contexts/UserContext";
import MainRoutes from "./routes/MainRoutes";

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <UserProvider>
        <MainRoutes />
      </UserProvider>
    </MantineProvider>
  );
}
