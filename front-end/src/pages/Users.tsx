import { useState, useEffect } from "react";
import { UserService } from "../api";
import { User, PaginatedResponse } from "../types/api";
import {
  Table,
  Paper,
  TextInput,
  Select,
  Group,
  Button,
  Modal,
  Text,
  Badge,
  Title,
  Flex,
  ActionIcon,
  Box,
  Pagination,
  LoadingOverlay,
  Stack,
  Alert,
  PasswordInput,
  Card,
  SimpleGrid,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconX,
  IconSearch,
  IconUser,
} from "@tabler/icons-react";
import { useUser } from "../contexts/UserContext";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 10;

export default function Users() {
  const { user: currentUser } = useUser();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (currentUser && currentUser.type !== "admin") {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  const [users, setUsers] = useState<PaginatedResponse<User>>({
    data: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const filtersForm = useForm({
    initialValues: {
      page: 1,
      limit: PAGE_SIZE,
      search: "",
      type: "",
    },
  });

  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      password: "",
      type: 0,
      viewable_user_id: undefined as number | undefined,
    },
    validate: {
      name: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) return "Nome é obrigatório";
        if (trimmed.length < 2) return "Nome deve ter pelo menos 2 caracteres";
        return null;
      },
      email: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) return "Email é obrigatório";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
          return "Formato de email inválido";
        return null;
      },
      password: (value) => {
        if (!editUser && value.trim().length === 0)
          return "Senha é obrigatória";
        if (value && value.length < 6)
          return "Senha deve ter pelo menos 6 caracteres";
        return null;
      },
    },
  });

  useEffect(() => {
    if (currentUser?.type === "admin") {
      fetchUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUsers();
  }, [filtersForm.values.page]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        ...filtersForm.values,
        type: filtersForm.values.type
          ? parseInt(filtersForm.values.type)
          : undefined,
      };
      const data = await UserService.getAll(filters);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao buscar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (values: typeof filtersForm.values) => {
    filtersForm.setValues({ ...values, page: 1 });
    fetchUsers();
  };

  const handleResetFilters = () => {
    filtersForm.reset();
    fetchUsers();
  };

  const handleEdit = (user: User) => {
    setEditUser(user);
    form.setValues({
      name: user.name,
      email: user.email,
      password: "", // Don't pre-fill password
      type: parseInt(user.type.toString()),
      viewable_user_id: user.viewable_user_id,
    });
    setOpened(true);
  };

  const handleSubmit = async (values: typeof form.values) => {
    setError(null);
    setSuccess(null);
    try {
      const submitData = {
        name: values.name.trim(),
        email: values.email.trim(),
        type: values.type,
        ...(values.password && { password: values.password }),
        ...(values.viewable_user_id && {
          viewable_user_id: values.viewable_user_id,
        }),
      };

      if (editUser) {
        const updated = await UserService.update(editUser.id, submitData);
        setUsers({
          ...users,
          data: users.data.map((u) => (u.id === updated.id ? updated : u)),
        });
        setSuccess("Usuário atualizado com sucesso");
      } else {
        const created = await UserService.create({
          ...submitData,
          password: values.password, // Password is required for creation
        });
        setUsers({
          ...users,
          data: [created, ...users.data],
          total: users.total + 1,
        });
        setSuccess("Usuário criado com sucesso");
      }
      setOpened(false);
      form.reset();
      setEditUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar usuário");
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
      await UserService.delete(deleteId);
      setUsers({
        ...users,
        data: users.data.filter((u) => u.id !== deleteId),
        total: users.total - 1,
      });
      setDeleteConfirm(false);
      setDeleteId(null);
      setSuccess("Usuário excluído com sucesso");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir usuário");
    }
  };

  const handlePageChange = (page: number) => {
    filtersForm.setFieldValue("page", page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getUserTypeLabel = (type: number | string) => {
    return UserService.getUserTypeLabel(parseInt(type.toString()));
  };

  const getUserTypeBadgeColor = (type: number | string) => {
    const numType = parseInt(type.toString());
    switch (numType) {
      case 1:
        return "red"; // Admin
      case 0:
        return "blue"; // Regular User
      case 2:
        return "yellow"; // Viewer
      default:
        return "gray";
    }
  };

  const renderUserCard = (user: User) => (
    <Card key={user.id} shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Badge
            color={getUserTypeBadgeColor(user.type)}
            variant="light"
            leftSection={<IconUser size={12} />}
          >
            {getUserTypeLabel(user.type)}
          </Badge>
        </Group>

        <div>
          <Text fw={500} size="lg">
            {user.name}
          </Text>
          <Text size="sm" c="dimmed">
            {user.email}
          </Text>
        </div>

        <Group justify="space-between">
          <Text fw={500} size="xs" c="dimmed">
            Membro desde: {formatDate(user.created_at)}
          </Text>
        </Group>

        <Group justify="space-between" mt="md">
          <Group gap="xs">
            <Tooltip label="Editar Usuário">
              <ActionIcon color="blue" onClick={() => handleEdit(user)}>
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Excluir Usuário">
              <ActionIcon color="red" onClick={() => handleDelete(user.id)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Stack>
    </Card>
  );

  // Don't render if not admin
  if (!currentUser || currentUser.type !== "admin") {
    return null;
  }

  return (
    <Box p="md">
      <Title order={2} mb="xl">
        Gerenciamento de Usuários
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
              placeholder="Buscar por nome ou email..."
              leftSection={<IconSearch size={16} />}
              {...filtersForm.getInputProps("search")}
            />
            <Select
              label="Tipo de Usuário"
              placeholder="Filtrar por tipo"
              data={[
                { value: "1", label: "Administrador" },
                { value: "0", label: "Usuário" },
                { value: "2", label: "Visualizador" },
              ]}
              clearable
              {...filtersForm.getInputProps("type")}
            />
          </Group>
          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              leftSection={<IconX size={16} />}
              onClick={handleResetFilters}
            >
              Limpar
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
                <Table.Th>Usuário</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Membro Desde</Table.Th>
                <Table.Th>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.data.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <div>
                      <Text fw={500}>{user.name}</Text>
                      <Text size="sm" c="dimmed">
                        {user.email}
                      </Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={getUserTypeBadgeColor(user.type)}
                      variant="light"
                    >
                      {getUserTypeLabel(user.type)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{formatDate(user.created_at)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Editar">
                        <ActionIcon
                          color="blue"
                          onClick={() => handleEdit(user)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Excluir">
                        <ActionIcon
                          color="red"
                          onClick={() => handleDelete(user.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} p="md">
            {users.data.map(renderUserCard)}
          </SimpleGrid>
        )}

        {users.data.length === 0 && !loading && (
          <Text p="md" ta="center" c="dimmed">
            Nenhum usuário encontrado
          </Text>
        )}
      </Paper>

      {users.total > PAGE_SIZE && (
        <Flex justify="center" mt="md">
          <Pagination
            value={filtersForm.values.page || 1}
            onChange={handlePageChange}
            total={Math.ceil(users.total / PAGE_SIZE)}
          />
        </Flex>
      )}

      <Button
        variant="filled"
        mt="md"
        leftSection={<IconPlus size={16} />}
        onClick={() => {
          setEditUser(null);
          form.reset();
          setOpened(true);
        }}
      >
        Adicionar Novo Usuário
      </Button>

      {/* Edit/Create Modal */}
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          form.reset();
          setEditUser(null);
        }}
        title={editUser ? "Editar Usuário" : "Criar Usuário"}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nome"
              placeholder="Digite o nome do usuário"
              {...form.getInputProps("name")}
              required
            />
            <TextInput
              label="Email"
              placeholder="Digite o email do usuário"
              type="email"
              {...form.getInputProps("email")}
              required
            />
            <PasswordInput
              label="Senha"
              placeholder={
                editUser
                  ? "Deixe vazio para manter a senha atual"
                  : "Digite a senha"
              }
              {...form.getInputProps("password")}
              required={!editUser}
            />
            <Select
              label="Tipo de Usuário"
              data={[
                { value: "0", label: "Usuário Regular" },
                { value: "1", label: "Administrador" },
                { value: "2", label: "Visualizador" },
              ]}
              {...form.getInputProps("type")}
              required
            />
            {form.values.type === 2 && (
              <Select
                label="Usuário Visualizável"
                placeholder="Selecione o usuário para visualizar dados"
                data={users.data
                  .filter((u) => parseInt(u.type.toString()) !== 2) // Don't allow viewers to view other viewers
                  .map((u) => ({
                    value: u.id.toString(),
                    label: `${u.name} (${u.email})`,
                  }))}
                {...form.getInputProps("viewable_user_id")}
                clearable
              />
            )}
            <Group justify="flex-end" mt="md">
              <Button type="submit">
                {editUser ? "Atualizar Usuário" : "Criar Usuário"}
              </Button>
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
        <Text>Tem certeza de que deseja excluir este usuário?</Text>
        <Text size="sm" c="red" mt="sm">
          Aviso: Isso excluirá permanentemente o usuário e todos os seus dados
          incluindo transações, categorias e metas.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
            Cancelar
          </Button>
          <Button color="red" onClick={confirmDelete}>
            Excluir Usuário
          </Button>
        </Group>
      </Modal>
    </Box>
  );
}
