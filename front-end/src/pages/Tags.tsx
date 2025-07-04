import { useState, useEffect } from "react";
import { TagService } from "../api";
import { Tag, PaginatedResponse } from "../types/api";
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
  Card,
  SimpleGrid,
  Select,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconX,
  IconSearch,
  IconChartBar,
} from "@tabler/icons-react";

const PAGE_SIZE = 10;

export default function Tags() {
  const [tags, setTags] = useState<PaginatedResponse<Tag>>({
    data: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [editTag, setEditTag] = useState<Tag | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [statsMode, setStatsMode] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [tagStats, setTagStats] = useState<any>(null);

  const filtersForm = useForm({
    initialValues: {
      page: 1,
      limit: PAGE_SIZE,
      name: "",
      search: "",
    },
  });

  const form = useForm({
    initialValues: {
      name: "",
      color: "#868e96",
    },
    validate: {
      name: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) return "Nome é obrigatório";
        if (trimmed.length < 2) return "Nome deve ter pelo menos 2 caracteres";
        return null;
      },
      color: (value) =>
        value.trim().length === 0 ? "Cor é obrigatória" : null,
    },
  });

  useEffect(() => {
    fetchTags();
    fetchPopularTags();
  }, []);

  useEffect(() => {
    fetchTags();
  }, [filtersForm.values.page]);

  const fetchTags = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await TagService.getAll(filtersForm.values);
      setTags(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao buscar tags");
    } finally {
      setLoading(false);
    }
  };

  const fetchPopularTags = async () => {
    try {
      const data = await TagService.getPopular();
      setPopularTags(data);
    } catch (err) {
      console.error("Falha ao buscar tags populares", err);
    }
  };

  const fetchTagStats = async (tagId: number) => {
    try {
      const data = await TagService.getStats(tagId);
      setTagStats(data);
    } catch (err) {
      console.error("Falha ao buscar estatísticas da tag", err);
      setError("Falha ao buscar estatísticas da tag");
    }
  };

  const handleFilterSubmit = (values: typeof filtersForm.values) => {
    filtersForm.setValues({ ...values, page: 1 });
    fetchTags();
  };

  const handleResetFilters = () => {
    filtersForm.reset();
    fetchTags();
  };

  const handleEdit = (tag: Tag) => {
    setEditTag(tag);
    form.setValues({
      name: tag.name,
      color: tag.color || "#868e96",
    });
    setOpened(true);
  };

  const handleSubmit = async (values: typeof form.values) => {
    setError(null);
    setSuccess(null);
    try {
      // Trim the name but don't convert to lowercase here (backend will handle it)
      const submitData = {
        ...values,
        name: values.name.trim(),
      };

      if (editTag) {
        const updated = await TagService.update(editTag.id, submitData);
        setTags({
          ...tags,
          data: tags.data.map((t) => (t.id === updated.id ? updated : t)),
        });
        setSuccess("Tag atualizada com sucesso");
      } else {
        const created = await TagService.create(submitData);
        setTags({
          ...tags,
          data: [created, ...tags.data],
          total: tags.total + 1,
        });
        setSuccess("Tag criada com sucesso");
      }
      setOpened(false);
      form.reset();
      setEditTag(null);
      // Refresh popular tags after successful create/update
      fetchPopularTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar tag");
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
      await TagService.delete(deleteId);
      setTags({
        ...tags,
        data: tags.data.filter((t) => t.id !== deleteId),
        total: tags.total - 1,
      });
      setDeleteConfirm(false);
      setDeleteId(null);
      setSuccess("Tag excluída com sucesso");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir tag");
    }
  };

  const handlePageChange = (page: number) => {
    filtersForm.setFieldValue("page", page);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === "table" ? "grid" : "table");
  };

  const toggleStatsMode = (tag?: Tag) => {
    if (tag) {
      setSelectedTag(tag);
      fetchTagStats(tag.id);
    }
    setStatsMode(!statsMode);
  };

  return (
    <Box p="md">
      <Title order={2} mb="xl">
        Gerenciamento de Tags
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

      {popularTags.length > 0 && (
        <Card withBorder shadow="sm" radius="md" mb="md">
          <Title order={4} mb="sm">
            Tags Populares
          </Title>
          <Group gap="xs">
            {popularTags.map((tag) => (
              <Badge
                key={tag.id}
                color={tag.color}
                variant="filled"
                size="lg"
                style={{ cursor: "pointer" }}
                onClick={() => handleEdit(tag)}
              >
                {tag.name}
              </Badge>
            ))}
          </Group>
        </Card>
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
            <Button variant="outline" onClick={toggleViewMode}>
              {viewMode === "table"
                ? "Visualização em Grade"
                : "Visualização em Tabela"}
            </Button>
          </Group>
        </form>
      </Paper>

      {statsMode && selectedTag && (
        <Paper withBorder p="md" mb="md" radius="md">
          <Group justify="space-between" mb="md">
            <Title order={4}>Estatísticas para {selectedTag.name}</Title>
            <ActionIcon onClick={() => toggleStatsMode()}>
              <IconX size={16} />
            </ActionIcon>
          </Group>
          {tagStats ? (
            <SimpleGrid cols={3}>
              <div>
                <Text size="sm" c="dimmed">
                  Contagem de Uso
                </Text>
                <Text size="xl" fw={500}>
                  {tagStats.usage_count || 0}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Transações de Receita
                </Text>
                <Text size="xl" fw={500}>
                  {tagStats.income_count || 0}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Transações de Despesa
                </Text>
                <Text size="xl" fw={500}>
                  {tagStats.expense_count || 0}
                </Text>
              </div>
            </SimpleGrid>
          ) : (
            <Text>Carregando estatísticas...</Text>
          )}
        </Paper>
      )}

      <Paper withBorder radius="md" style={{ position: "relative" }}>
        <LoadingOverlay visible={loading} />

        {viewMode === "table" ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Cor</Table.Th>
                <Table.Th>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tags.data.map((tag) => (
                <Table.Tr key={tag.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Badge color={tag.color} variant="light">
                        {tag.name.charAt(0)}
                      </Badge>
                      <Text>{tag.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={tag.color} variant="filled">
                      {tag.color}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon color="blue" onClick={() => handleEdit(tag)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        color="red"
                        onClick={() => handleDelete(tag.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                      <ActionIcon
                        color="green"
                        onClick={() => toggleStatsMode(tag)}
                      >
                        <IconChartBar size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <SimpleGrid cols={4} p="md">
            {tags.data.map((tag) => (
              <Card
                key={tag.id}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
              >
                <Card.Section p="md" bg={tag.color} style={{ color: "white" }}>
                  <Group justify="space-between">
                    <Badge color="white" variant="light">
                      {tag.name.charAt(0)}
                    </Badge>
                    <Text fw={500}>{(tag as any).usage_count || 0} usos</Text>
                  </Group>
                </Card.Section>
                <Stack mt="md" gap="xs">
                  <Text fw={500} size="lg">
                    {tag.name}
                  </Text>
                  <Group justify="space-between" mt="md">
                    <Badge color={tag.color} variant="dot">
                      {tag.color}
                    </Badge>
                    <Group gap="xs">
                      <ActionIcon color="blue" onClick={() => handleEdit(tag)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        color="red"
                        onClick={() => handleDelete(tag.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                      <ActionIcon
                        color="green"
                        onClick={() => toggleStatsMode(tag)}
                      >
                        <IconChartBar size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}

        {tags.data.length === 0 && !loading && (
          <Text p="md" ta="center" c="dimmed">
            Nenhuma tag encontrada
          </Text>
        )}
      </Paper>

      {tags.total > PAGE_SIZE && (
        <Flex justify="center" mt="md">
          <Pagination
            value={filtersForm.values.page || 1}
            onChange={handlePageChange}
            total={Math.ceil(tags.total / PAGE_SIZE)}
          />
        </Flex>
      )}

      <Button
        variant="filled"
        mt="md"
        leftSection={<IconPlus size={16} />}
        onClick={() => {
          setEditTag(null);
          form.reset();
          setOpened(true);
        }}
      >
        Adicionar Nova Tag
      </Button>

      {/* Edit/Create Modal */}
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          form.reset();
          setEditTag(null);
        }}
        title={editTag ? "Editar Tag" : "Criar Tag"}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nome"
              placeholder="Digite o nome da tag"
              {...form.getInputProps("name")}
              required
            />
            <ColorInput
              label="Cor"
              placeholder="Escolha uma cor"
              {...form.getInputProps("color")}
              required
            />
            <Group justify="flex-end" mt="md">
              <Button type="submit">
                {editTag ? "Atualizar Tag" : "Criar Tag"}
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
        <Text>Tem certeza de que deseja excluir esta tag?</Text>
        <Text size="sm" c="red" mt="sm">
          Nota: Isso removerá a tag de todas as transações associadas.
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
