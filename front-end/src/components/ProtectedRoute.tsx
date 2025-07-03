import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { Loader, Center, Container, Space } from "@mantine/core";
import { NavBar } from "./Navbar/NavBar";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useUser();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Container size="sm" style={{ height: "100vh" }}>
        <Center style={{ height: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Loader size="lg" />
            <p style={{ marginTop: "1rem", color: "var(--color-dark)" }}>
              Verificando autenticação...
            </p>
          </div>
        </Center>
      </Container>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Render protected content if authenticated
  return (
    <>
      {" "}
      <NavBar />
      <Space h="xl" />
      <Space h="md" />
      {children}
    </>
  );
}

/**
 * Component for routes that should only be accessible to non-authenticated users
 * (like login/register pages)
 */
export function PublicRoute({
  children,
  redirectTo = "/dashboard",
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useUser();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Container size="sm" style={{ height: "100vh" }}>
        <Center style={{ height: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Loader size="lg" />
            <p style={{ marginTop: "1rem", color: "var(--color-dark)" }}>
              Carregando...
            </p>
          </div>
        </Center>
      </Container>
    );
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Render public content if not authenticated
  return <>{children}</>;
}

export default ProtectedRoute;
