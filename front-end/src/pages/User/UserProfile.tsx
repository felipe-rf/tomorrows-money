import {
  Container,
  Card,
  Text,
  Button,
  Group,
  Badge,
  Stack,
  Title,
  Modal,
} from "@mantine/core";
import { useUser } from "../../contexts/UserContext";
import { UserService } from "../../api";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export function UserProfile() {
  const { user, logout, isLoading, deleteUser } = useUser();
  const navigate = useNavigate();
  const [viewableUserName, setViewableUserName] = useState<string | null>(null);
  const [loadingViewableUser, setLoadingViewableUser] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch viewable user name if user has viewable_user_id
  useEffect(() => {
    const fetchViewableUserName = async () => {
      if (user?.viewable_user_id) {
        try {
          setLoadingViewableUser(true);
          const viewableUser = await UserService.getById(user.viewable_user_id);
          setViewableUserName(viewableUser.name);
        } catch (error) {
          console.error("Error fetching viewable user:", error);
          setViewableUserName(`Usuário #${user.viewable_user_id}`); // Fallback to ID
        } finally {
          setLoadingViewableUser(false);
        }
      }
    };

    fetchViewableUserName();
  }, [user?.viewable_user_id]);

  if (isLoading) {
    return (
      <Container size="sm">
        <Text>Carregando perfil...</Text>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="sm">
        <Text>Usuário não encontrado</Text>
      </Container>
    );
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await deleteUser(); // Delete current user
      // User will be redirected to login automatically
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const getUserTypeLabel = (type: string | number) => {
    // Handle both string and number types
    const userType = typeof type === "string" ? type : type.toString();

    switch (userType) {
      case "admin":
      case "1":
        return { label: "Administrador", color: "red" };
      case "viewer":
      case "2":
        return { label: "Visualizador", color: "blue" };
      case "user":
      case "0":
      default:
        return { label: "Usuário", color: "green" };
    }
  };

  const isViewerUser = (type: string | number) => {
    const userType = typeof type === "string" ? type : type.toString();
    return userType === "viewer" || userType === "2";
  };

  const isRegularUser = (type: string | number) => {
    const userType = typeof type === "string" ? type : type.toString();
    return userType === "user" || userType === "0";
  };

  const userType = getUserTypeLabel(user.type);

  return (
    <Container size="sm" py="xl">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2} mb="xs">
                Perfil do Usuário
              </Title>
              <Badge color={userType.color} variant="light">
                {userType.label}
              </Badge>
            </div>
            <Badge color={user.active ? "green" : "red"} variant="light">
              {user.active ? "Ativo" : "Inativo"}
            </Badge>
          </Group>

          <Stack gap="sm">
            <div>
              <Text size="sm" c="dimmed">
                Nome
              </Text>
              <Text fw={500}>{user.name}</Text>
            </div>

            <div>
              <Text size="sm" c="dimmed">
                Email
              </Text>
              <Text fw={500}>{user.email}</Text>
            </div>

            {user.viewable_user_id && (
              <div>
                <Text size="sm" c="dimmed">
                  {isViewerUser(user.type)
                    ? "Visualizando Usuário"
                    : "Usuário Visualizável"}
                </Text>
                <Text fw={500}>
                  {loadingViewableUser
                    ? "Carregando..."
                    : viewableUserName || `Usuário #${user.viewable_user_id}`}
                </Text>
              </div>
            )}

            <div>
              <Text size="sm" c="dimmed">
                Membro desde
              </Text>
              <Text fw={500}>
                {new Date(user.created_at).toLocaleDateString("pt-BR")}
              </Text>
            </div>
          </Stack>

          <Group justify="space-between" mt="md">
            <Group>
              {isRegularUser(user.type) && (
                <Button onClick={() => navigate("/profile/viewer")}>
                  Criar Perfil Visualizador
                </Button>
              )}
              <Button onClick={() => setDeleteModalOpen(true)} color="red">
                Excluir Conta
              </Button>
            </Group>
            <Button color="red" variant="light" onClick={handleLogout}>
              Sair
            </Button>
          </Group>
        </Stack>
      </Card>

      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirmar Exclusão"
        centered
      >
        <Stack gap="md">
          <Text>
            Tem certeza que deseja excluir sua conta? Esta ação é{" "}
            <Text span fw={700} c="red">
              irreversível
            </Text>{" "}
            e todos os seus dados serão perdidos permanentemente.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              color="red"
              onClick={handleDeleteAccount}
              loading={deleting}
              disabled={deleting}
            >
              {deleting ? "Excluindo..." : "Excluir Conta"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

export default UserProfile;
