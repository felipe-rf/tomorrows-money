import { useState, useEffect } from "react";
import { CategoryService } from "../api";
import { Category, PaginatedResponse } from "../types/api";
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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconX,
  IconSearch,
} from "@tabler/icons-react";

const PAGE_SIZE = 10;

export default function Categories() {
  const [categories, setCategories] = useState<PaginatedResponse<Category>>({
    data: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filtersForm = useForm({
    initialValues: {
      page: 1,
      limit: PAGE_SIZE,
      name: "",
    },
  });

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      color: "#868e96",
      icon: "",
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? "Nome é obrigatório" : null,
      color: (value) =>
        value.trim().length === 0 ? "Cor é obrigatória" : null,
    },
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [filtersForm.values.page]);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CategoryService.getAll(filtersForm.values);
      setCategories(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar categorias"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (values: typeof filtersForm.values) => {
    filtersForm.setValues({ ...values, page: 1 });
    fetchCategories();
  };

  const handleResetFilters = () => {
    filtersForm.reset();
    fetchCategories();
  };

  const handleEdit = (category: Category) => {
    setEditCategory(category);
    form.setValues({
      name: category.name,
      description: (category as any).description || "",
      color: category.color || "#868e96",
      icon: category.icon || "",
    });
    setOpened(true);
  };

  const handleSubmit = async (values: typeof form.values) => {
    setError(null);
    setSuccess(null);
    try {
      if (editCategory) {
        const updated = await CategoryService.update(editCategory.id, values);
        setCategories({
          ...categories,
          data: categories.data.map((c) => (c.id === updated.id ? updated : c)),
        });
        setSuccess("Categoria atualizada com sucesso");
      } else {
        const created = await CategoryService.create(values);
        setCategories({
          ...categories,
          data: [created, ...categories.data],
          total: categories.total + 1,
        });
        setSuccess("Categoria criada com sucesso");
      }
      setOpened(false);
      form.reset();
      setEditCategory(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao salvar categoria"
      );
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
      await CategoryService.delete(deleteId);
      setCategories({
        ...categories,
        data: categories.data.filter((c) => c.id !== deleteId),
        total: categories.total - 1,
      });
      setDeleteConfirm(false);
      setDeleteId(null);
      setSuccess("Categoria excluída com sucesso");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao excluir categoria"
      );
    }
  };

  const handlePageChange = (page: number) => {
    filtersForm.setFieldValue("page", page);
  };

  return (
    <Box p="md">
      <Title order={2} mb="xl">
        Gerenciamento de Categorias
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
              label="Pesquisar"
              placeholder="Pesquisar por nome..."
              leftSection={<IconSearch size={16} />}
              {...filtersForm.getInputProps("name")}
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
          </Group>
        </form>
      </Paper>

      <Paper withBorder radius="md" style={{ position: "relative" }}>
        <LoadingOverlay visible={loading} />

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Descrição</Table.Th>
              <Table.Th>Cor</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {categories.data.map((category) => (
              <Table.Tr key={category.id}>
                <Table.Td>
                  <Group gap="xs">
                    <Badge color={category.color} variant="light">
                      {category.icon || category.name.charAt(0)}
                    </Badge>
                    <Text>{category.name}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>{(category as any).description || "-"}</Table.Td>
                <Table.Td>
                  <Badge color={category.color} variant="filled">
                    {category.color}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      color="blue"
                      onClick={() => handleEdit(category)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      color="red"
                      onClick={() => handleDelete(category.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {categories.data.length === 0 && !loading && (
          <Text p="md" ta="center" c="dimmed">
            Nenhuma categoria encontrada
          </Text>
        )}
      </Paper>

      {categories.total > PAGE_SIZE && (
        <Flex justify="center" mt="md">
          <Pagination
            value={filtersForm.values.page || 1}
            onChange={handlePageChange}
            total={Math.ceil(categories.total / PAGE_SIZE)}
          />
        </Flex>
      )}

      <Button
        variant="filled"
        mt="md"
        leftSection={<IconPlus size={16} />}
        onClick={() => {
          setEditCategory(null);
          form.reset();
          setOpened(true);
        }}
      >
        Adicionar Nova Categoria
      </Button>

      {/* Edit/Create Modal */}
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          form.reset();
          setEditCategory(null);
        }}
        title={editCategory ? "Editar Categoria" : "Criar Categoria"}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nome"
              placeholder="Digite o nome da categoria"
              {...form.getInputProps("name")}
              required
            />
            <TextInput
              label="Descrição"
              placeholder="Digite a descrição da categoria"
              {...form.getInputProps("description")}
            />
            <ColorInput
              label="Cor"
              placeholder="Escolher cor"
              {...form.getInputProps("color")}
              required
            />
            <TextInput
              label="Ícone"
              placeholder="Adicione um ícone"
              {...form.getInputProps("icon")}
            />
            <Group justify="flex-end" mt="md">
              <Button type="submit">
                {editCategory ? "Editar Categoria" : "Criar Categoria"}
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
        <Text>Tem certeza de que deseja excluir esta categoria?</Text>
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
