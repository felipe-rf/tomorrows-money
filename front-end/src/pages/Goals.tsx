import { useState, useEffect } from "react";
import { GoalService, CategoryService } from "../api";
import type { Goal, PaginatedResponse, Category } from "../types/api";
import {
  Table,
  Paper,
  TextInput,
  Group,
  Button,
  Modal,
  Text,
  Title,
  Flex,
  ActionIcon,
  Box,
  Pagination,
  LoadingOverlay,
  Stack,
  Badge,
  ColorInput,
  Alert,
  Select,
  NumberInput,
  Progress,
  Card,
  SimpleGrid,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconX,
  IconSearch,
  IconTarget,
  IconCalendar,
  IconCurrencyDollar,
  IconTrendingUp,
  IconAlertTriangle,
  IconCheck,
  IconClock,
} from "@tabler/icons-react";
import { useUser } from "../contexts/UserContext";

const PAGE_SIZE = 10;

export default function Goals() {
  const { user } = useUser();
  const [goals, setGoals] = useState<PaginatedResponse<Goal>>({
    data: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [opened, setOpened] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [progressModal, setProgressModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  const filtersForm = useForm({
    initialValues: {
      page: 1,
      limit: PAGE_SIZE,
      search: "",
      priority: "",
      status: "",
      category_id: "",
    },
  });

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      target_amount: 0,
      current_amount: 0,
      target_date: "",
      category_id: undefined as number | undefined,
      color: "#3b82f6",
      icon: "",
      priority: "medium" as "low" | "medium" | "high",
      auto_deduct: false,
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? "Nome é obrigatório" : null,
      target_amount: (value) =>
        value <= 0 ? "Valor da meta deve ser positivo" : null,
      current_amount: (value) =>
        value < 0 ? "Valor atual não pode ser negativo" : null,
    },
  });

  const progressForm = useForm({
    initialValues: {
      amount: 0,
    },
    validate: {
      amount: (value) => (value <= 0 ? "Valor deve ser positivo" : null),
    },
  });

  useEffect(() => {
    fetchGoals();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [filtersForm.values.page]);

  const fetchGoals = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        ...filtersForm.values,
        category_id: filtersForm.values.category_id
          ? parseInt(filtersForm.values.category_id)
          : undefined,
        priority: filtersForm.values.priority
          ? (filtersForm.values.priority as "high" | "medium" | "low")
          : undefined,
        status: filtersForm.values.status
          ? (filtersForm.values.status as "active" | "completed" | "overdue")
          : undefined,
      };
      const data = await GoalService.getAll(filters);
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar metas");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await CategoryService.getAll();
      setCategories(data.data);
    } catch (err) {
      console.error("Erro ao buscar categorias", err);
    }
  };

  const handleFilterSubmit = (values: typeof filtersForm.values) => {
    filtersForm.setValues({ ...values, page: 1 });
    fetchGoals();
  };

  const handleResetFilters = () => {
    filtersForm.reset();
    fetchGoals();
  };

  const handleEdit = (goal: Goal) => {
    setEditGoal(goal);
    form.setValues({
      name: goal.name,
      description: goal.description || "",
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      target_date: goal.target_date ? goal.target_date.split("T")[0] : "",
      category_id: goal.category_id,
      color: goal.color,
      icon: goal.icon || "",
      priority: goal.priority,
      auto_deduct: goal.auto_deduct,
    });
    setOpened(true);
  };

  const handleSubmit = async (values: typeof form.values) => {
    setError(null);
    setSuccess(null);
    try {
      const submitData = {
        ...values,
        target_date: values.target_date || undefined,
      };

      if (editGoal) {
        const updated = await GoalService.update(editGoal.id, submitData);
        setGoals({
          ...goals,
          data: goals.data.map((g) => (g.id === updated.id ? updated : g)),
        });
        setSuccess("Meta atualizada com sucesso");
      } else {
        const created = await GoalService.create(submitData);
        setGoals({
          ...goals,
          data: [created, ...goals.data],
          total: goals.total + 1,
        });
        setSuccess("Meta criada com sucesso");
      }
      setOpened(false);
      form.reset();
      setEditGoal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar meta");
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteId(id);
    setDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setError(null);
    setSuccess(null);
    try {
      await GoalService.delete(deleteId);
      setGoals({
        ...goals,
        data: goals.data.filter((g) => g.id !== deleteId),
        total: goals.total - 1,
      });
      setDeleteConfirm(false);
      setDeleteId(null);
      setSuccess("Meta excluída com sucesso");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir meta");
    }
  };

  const handleAddProgress = (goal: Goal) => {
    setSelectedGoal(goal);
    setProgressModal(true);
    progressForm.reset();
  };

  const handleProgressSubmit = async (values: typeof progressForm.values) => {
    if (!selectedGoal) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await GoalService.addProgress(selectedGoal.id, values);
      setGoals({
        ...goals,
        data: goals.data.map((g) =>
          g.id === selectedGoal.id ? response.goal : g
        ),
      });
      setProgressModal(false);
      setSelectedGoal(null);
      setSuccess(response.message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao adicionar progresso"
      );
    }
  };

  const handlePageChange = (page: number) => {
    filtersForm.setFieldValue("page", page);
  };

  const getProgressPercentage = (goal: Goal) => {
    if (!goal.target_amount || goal.target_amount <= 0) return 0;
    const percentage = Math.min(
      100,
      Math.round((goal.current_amount / goal.target_amount) * 100)
    );
    return percentage;
  };

  const getDaysRemaining = (goal: Goal) => {
    if (!goal.target_date) return null;
    const targetDate = new Date(goal.target_date);
    const currentDate = new Date();
    const timeDiff = targetDate.getTime() - currentDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const isOverdue = (goal: Goal) => {
    const daysRemaining = getDaysRemaining(goal);
    return daysRemaining !== null && daysRemaining < 0 && !goal.is_completed;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "red";
      case "medium":
        return "yellow";
      case "low":
        return "green";
      default:
        return "gray";
    }
  };

  const getStatusIcon = (goal: Goal) => {
    if (goal.is_completed) return <IconCheck color="green" />;
    if (isOverdue(goal)) return <IconAlertTriangle color="red" />;
    return <IconClock color="blue" />;
  };

  const renderGoalCard = (goal: Goal) => (
    <Card key={goal.id} shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section p="md" bg={goal.color} style={{ color: "white" }}>
        <Group justify="space-between">
          <Text fw={500} size="lg">
            {goal.name}
          </Text>
          {getStatusIcon(goal)}
        </Group>
        <Progress
          value={getProgressPercentage(goal)}
          color="white"
          bg="rgba(255,255,255,0.3)"
          mt="xs"
        />
        <Text size="sm" mt="xs">
          {getProgressPercentage(goal)}% Completa
        </Text>
      </Card.Section>

      <Stack mt="md" gap="xs">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Progresso
          </Text>
          <Text fw={500}>
            {formatCurrency(goal.current_amount)} /{" "}
            {formatCurrency(goal.target_amount)}
          </Text>
        </Group>

        {goal.target_date && (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Data Limite
            </Text>
            <Text size="sm">{formatDate(goal.target_date)}</Text>
          </Group>
        )}

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Prioridade
          </Text>
          <Badge color={getPriorityColor(goal.priority)} variant="light">
            {goal.priority}
          </Badge>
        </Group>
        <Group justify="space-between" mt="md">
          <Group gap="xs">
            <ActionIcon color="blue" onClick={() => handleEdit(goal)}>
              <IconEdit size={16} />
            </ActionIcon>
            <ActionIcon color="red" onClick={() => handleDelete(goal.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
          {!goal.is_completed && (
            <Button
              size="xs"
              leftSection={<IconTrendingUp size={14} />}
              onClick={() => handleAddProgress(goal)}
            >
              Adicionar Progresso
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );

  return (
    <Box p="md">
      <Title order={2} mb="xl">
        Gerenciamento de Metas
      </Title>

      {error && (
        <Alert
          color="red"
          mb="md"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          color="green"
          mb="md"
          withCloseButton
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <Paper withBorder p="md" mb="md" radius="md">
        <form onSubmit={filtersForm.onSubmit(handleFilterSubmit)}>
          <Group grow>
            <TextInput
              label="Buscar"
              placeholder="Buscar por nome..."
              leftSection={<IconSearch size={16} />}
              {...filtersForm.getInputProps("search")}
            />
            <Select
              label="Prioridade"
              placeholder="Filtrar por prioridade"
              data={[
                { value: "high", label: "Alta" },
                { value: "medium", label: "Média" },
                { value: "low", label: "Baixa" },
              ]}
              clearable
              {...filtersForm.getInputProps("priority")}
            />
            <Select
              label="Status"
              placeholder="Filtrar por status"
              data={[
                { value: "active", label: "Ativa" },
                { value: "completed", label: "Concluída" },
                { value: "overdue", label: "Atrasada" },
              ]}
              clearable
              {...filtersForm.getInputProps("status")}
            />
            <Select
              label="Categoria"
              placeholder="Filtrar por categoria"
              data={categories.map((c) => ({
                value: c.id.toString(),
                label: c.name,
              }))}
              clearable
              {...filtersForm.getInputProps("category_id")}
            />
          </Group>
          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              leftSection={<IconX size={16} />}
              onClick={handleResetFilters}
            >
              Resetar
            </Button>
            <Button type="submit" leftSection={<IconSearch size={16} />}>
              Aplicar Filtros
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setViewMode(viewMode === "table" ? "cards" : "table")
              }
            >
              {viewMode === "table"
                ? "Visualização em Cartões"
                : "Visualização em Tabela"}
            </Button>
          </Group>
        </form>
      </Paper>

      <Paper withBorder radius="md" style={{ position: "relative" }}>
        <LoadingOverlay visible={loading} />

        {viewMode === "table" ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Progresso</Table.Th>
                <Table.Th>Valor Alvo</Table.Th>
                <Table.Th>Data Limite</Table.Th>
                <Table.Th>Prioridade</Table.Th>
                <Table.Th>Categoria</Table.Th>
                <Table.Th>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {goals.data.map((goal) => (
                <Table.Tr key={goal.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Box
                        w={12}
                        h={12}
                        bg={goal.color}
                        style={{ borderRadius: "50%" }}
                      />
                      <div>
                        <Text fw={500}>{goal.name}</Text>
                        {goal.description && (
                          <Text size="xs" c="dimmed">
                            {goal.description}
                          </Text>
                        )}
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <div style={{ width: 100 }}>
                      <Progress
                        value={getProgressPercentage(goal)}
                        color={goal.color}
                      />
                      <Text size="xs" c="dimmed" ta="center" mt={4}>
                        {getProgressPercentage(goal)}%
                      </Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <div>
                      <Text fw={500}>{formatCurrency(goal.target_amount)}</Text>
                      <Text size="xs" c="dimmed">
                        {formatCurrency(goal.current_amount)} guardados
                      </Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    {goal.target_date ? (
                      <div>
                        <Text size="sm">{formatDate(goal.target_date)}</Text>
                        {getDaysRemaining(goal) !== null && (
                          <Text
                            size="xs"
                            c={isOverdue(goal) ? "red" : "dimmed"}
                          >
                            {isOverdue(goal)
                              ? `${Math.abs(
                                  getDaysRemaining(goal)!
                                )} days overdue`
                              : `${getDaysRemaining(goal)} dias restantes`}
                          </Text>
                        )}
                      </div>
                    ) : (
                      <Text c="dimmed">Sem prazo</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={getPriorityColor(goal.priority)}
                      variant="light"
                    >
                      {goal.priority}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {goal.category ? (
                      <Badge color={goal.category.color} variant="outline">
                        {goal.category.name}
                      </Badge>
                    ) : (
                      <Text c="dimmed">-</Text>
                    )}
                  </Table.Td>
                  {user?.type === "1" && (
                    <Table.Td>
                      <Text size="sm">User {goal.user_id}</Text>
                    </Table.Td>
                  )}
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Editar">
                        <ActionIcon
                          color="blue"
                          onClick={() => handleEdit(goal)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Deletar">
                        <ActionIcon
                          color="red"
                          onClick={() => handleDelete(goal.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {!goal.is_completed && (
                        <Tooltip label="Adicionar Progresso">
                          <ActionIcon
                            color="green"
                            onClick={() => handleAddProgress(goal)}
                          >
                            <IconTrendingUp size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} p="md">
            {goals.data.map(renderGoalCard)}
          </SimpleGrid>
        )}

        {goals.data.length === 0 && !loading && (
          <Text p="md" ta="center" c="dimmed">
            No goals found
          </Text>
        )}
      </Paper>

      {goals.total > PAGE_SIZE && (
        <Flex justify="center" mt="md">
          <Pagination
            value={filtersForm.values.page || 1}
            onChange={handlePageChange}
            total={Math.ceil(goals.total / PAGE_SIZE)}
          />
        </Flex>
      )}

      <Button
        variant="filled"
        mt="md"
        leftSection={<IconPlus size={16} />}
        onClick={() => {
          setEditGoal(null);
          form.reset();
          setOpened(true);
        }}
      >
        Adicionar Meta
      </Button>

      {/* Edit/Create Modal */}
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          form.reset();
          setEditGoal(null);
        }}
        title={editGoal ? "Editar Meta" : "Criar Meta"}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nome"
              placeholder="Digite o nome da meta"
              {...form.getInputProps("name")}
              required
            />
            <Textarea
              label="Descrição"
              placeholder="Digite a descrição da meta (opcional)"
              {...form.getInputProps("description")}
            />
            <NumberInput
              label="Valor Alvo"
              placeholder="Digite o valor alvo"
              min={0.01}
              step={0.01}
              decimalScale={2}
              leftSection={<IconCurrencyDollar size={16} />}
              {...form.getInputProps("target_amount")}
              required
            />
            <NumberInput
              label="Valor Atual"
              placeholder="Digite o valor atual"
              min={0}
              step={0.01}
              decimalScale={2}
              leftSection={<IconCurrencyDollar size={16} />}
              {...form.getInputProps("current_amount")}
            />
            <TextInput
              label="Data Alvo"
              placeholder="Selecionar data alvo (opcional)"
              type="date"
              leftSection={<IconCalendar size={16} />}
              {...form.getInputProps("target_date")}
            />
            <Select
              label="Prioridade"
              data={[
                { value: "low", label: "Baixa" },
                { value: "medium", label: "Média" },
                { value: "high", label: "Alta" },
              ]}
              {...form.getInputProps("priority")}
              required
            />
            <ColorInput
              label="Cor"
              placeholder="Escolher cor da meta"
              {...form.getInputProps("color")}
              required
            />
            <TextInput
              label="Ícone"
              placeholder="Escolha um ícone (opcional)"
              leftSection={<IconTarget size={16} />}
              {...form.getInputProps("icon")}
            />
            <Group justify="flex-end" mt="md">
              <Button type="submit">
                {editGoal ? "Atualizar Meta" : "Criar Meta"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Add Progress Modal */}
      <Modal
        opened={progressModal}
        onClose={() => {
          setProgressModal(false);
          setSelectedGoal(null);
        }}
        title={`Adicionar Progresso em ${selectedGoal?.name}`}
      >
        <form onSubmit={progressForm.onSubmit(handleProgressSubmit)}>
          <Stack>
            {selectedGoal && (
              <div>
                <Text size="sm" c="dimmed">
                  Current Progress
                </Text>
                <Progress
                  value={getProgressPercentage(selectedGoal)}
                  color={selectedGoal.color}
                  mb="xs"
                />
                <Text size="sm">
                  {formatCurrency(selectedGoal.current_amount)} /{" "}
                  {formatCurrency(selectedGoal.target_amount)}
                </Text>
              </div>
            )}
            <NumberInput
              label="Valor a Adicionar"
              placeholder="Digite o valor a adicionar"
              min={0.01}
              step={0.01}
              decimalScale={2}
              leftSection={<IconCurrencyDollar size={16} />}
              {...progressForm.getInputProps("amount")}
              required
            />
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={() => setProgressModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar Progresso</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Confirmar Exclusão"
      >
        <Text>Tem certeza de que deseja excluir esta meta?</Text>
        <Text size="sm" c="red" mt="sm">
          Esta ação não pode ser desfeita.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
            Cancelar
          </Button>
          <Button color="red" onClick={confirmDelete}>
            Excluir
          </Button>
        </Group>
      </Modal>
    </Box>
  );
}
