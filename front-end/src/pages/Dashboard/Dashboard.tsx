import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Button,
  Stack,
  Grid,
} from "@mantine/core";
import { useUser } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { UserService } from "../../api";
export function Dashboard() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch user statistics from the API
      const data = await UserService.getStats(user.id);
      console.log("User statistics:", data);
      return data;
    };

    fetchData();
  }, []);

  return (
    <>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Group justify="space-between" align="center">
            <div>
              <Title order={1} mb="xs">
                Bem-vindo, {user?.name}! 👋
              </Title>
              <Text c="dimmed" size="lg">
                Dashboard do Tomorrow's Money
              </Text>
            </div>
            <Group>
              <Button variant="outline" onClick={() => navigate("/profile")}>
                Ver Perfil
              </Button>
              <Button color="red" variant="light" onClick={handleLogout}>
                Sair
              </Button>
            </Group>
          </Group>

          {/* Quick Stats */}
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    Transações
                  </Text>
                  <Title order={2} c="blue">
                    0
                  </Title>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    Saldo
                  </Text>
                  <Title order={2} c="green">
                    R$ 0,00
                  </Title>
                  <Text size="xs" c="dimmed">
                    Adicione suas primeiras transações
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    Metas
                  </Text>
                  <Title order={2} c="orange">
                    0
                  </Title>
                  <Text size="xs" c="dimmed">
                    Defina suas metas financeiras
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Quick Actions */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Title order={3}>Ações Rápidas</Title>
              <Group>
                <Button
                  variant="filled"
                  onClick={() => navigate("/transactions/new")}
                >
                  Nova Transação
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/categories")}
                >
                  Gerenciar Categorias
                </Button>
                <Button variant="outline" onClick={() => navigate("/goals")}>
                  Minhas Metas
                </Button>
              </Group>
            </Stack>
          </Card>

          {/* User Info Card */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Title order={3}>Informações da Conta</Title>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Text size="sm" c="dimmed">
                    Tipo de Usuário
                  </Text>
                  <Text fw={500} tt="capitalize">
                    {user?.type}
                  </Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Text size="sm" c="dimmed">
                    Status
                  </Text>
                  <Text fw={500} c={user?.active ? "green" : "red"}>
                    {user?.active ? "Ativo" : "Inativo"}
                  </Text>
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </>
  );
}

export default Dashboard;
