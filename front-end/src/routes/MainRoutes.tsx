import { Routes, Route } from "react-router-dom";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import { ProtectedRoute, PublicRoute } from "../components/ProtectedRoute";
import Dashboard from "../pages/Dashboard/Dashboard";
import UserProfile from "../pages/User/UserProfile";
import CreateViewer from "../pages/User/CreateViewer";
const MainRoutes = () => {
  return (
    // In your MainRoutes.tsx

    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/viewer"
        element={
          <ProtectedRoute>
            <CreateViewer />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default MainRoutes;
