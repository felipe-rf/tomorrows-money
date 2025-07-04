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
import { useEffect, useState } from "react";
import { UserService } from "../../api";
import { stat } from "fs";
export function Dashboard() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    financial: {
      total_transactions: 0,
      total_income: 0,
      total_expenses: 0,
      net_balance: 0,
    },
    organization: {
      total_categories: 0,
    },
    goals: {
      total_goals: 0,
      completed_goals: 0,
      completion_rate: 0,
    },
  });

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
    fetchData()
      .then((data) => {
        setStats({
          financial: {
            total_transactions: data.financial.total_transactions,
            total_income: data.financial.total_income,
            total_expenses: data.financial.total_expenses,
            net_balance: data.financial.net_balance,
          },
          organization: {
            total_categories: data.organization.total_categories,
          },
          goals: {
            total_goals: data.goals.total_goals,
            completed_goals: data.goals.completed_goals,
            completion_rate: data.goals.completion_rate,
          },
        });
      })
      .catch((error) => {
        console.error("Error fetching user stats:", error);
      });
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
                    Despesas
                  </Text>
                  <Title order={2} c="red">
                    {stats.financial.total_expenses.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }) || "R$ 0,00"}
                  </Title>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    Lucro
                  </Text>
                  <Title order={2} c="green">
                    {stats.financial.total_income.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }) || "R$ 0,00"}{" "}
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
                  <Title
                    order={2}
                    c={stats.financial.net_balance > 0 ? "green" : "red"}
                  >
                    {stats.financial.net_balance.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }) || "R$ 0,00"}
                  </Title>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    </>
  );
}

export default Dashboard;
