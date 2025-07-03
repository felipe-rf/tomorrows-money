import { IconHeart, IconLogout, IconUser } from "@tabler/icons-react";
import { Avatar, Menu } from "@mantine/core";
import styles from "./NavBar.module.css";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";

export interface Filters {
  search: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType: string;
  neighborhood: string;
  onlyFavorites: boolean;
}

export function NavBar() {
  const navigate = useNavigate();
  const { user, logout } = useUser();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleMenuOpen = () => {
    if (!user) {
      navigate("/login");
      return false;
    }
    return true;
  };

  return (
    <header className={styles.navbar}>
      <div className="cursor-pointer" onClick={() => navigate("/")}>
        {" "}
        Tomorrows Money
      </div>

      <Menu shadow="md" width={200} onOpen={handleMenuOpen}>
        <Menu.Target>
          <Avatar
            name={user?.name || ""}
            color="initials"
            radius="xl"
            style={{ cursor: "pointer" }}
          />
        </Menu.Target>

        {user && (
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconUser size={14} />}
              onClick={() => navigate("/profile")}
            >
              Meu Perfil
            </Menu.Item>
            <Menu.Item
              onClick={() => navigate("/?only_favorites=true")}
              leftSection={<IconHeart size={14} />}
            >
              Favoritos
            </Menu.Item>

            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={14} />}
              onClick={handleLogout}
            >
              Sair
            </Menu.Item>
          </Menu.Dropdown>
        )}
      </Menu>
    </header>
  );
}
