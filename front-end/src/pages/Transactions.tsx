import { useState, useEffect } from "react";
import { TransactionService } from "../api";
import { Transaction, PaginatedResponse } from "../types/api";
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
  NumberInput,
  ActionIcon,
  Box,
  Pagination,
  LoadingOverlay,
  Stack,
  Alert,
  MultiSelect,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconEdit,
  IconTrash,
  IconX,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { CategoryService, TagService } from "../api";
import { Category, Tag } from "../types/api";
import { useUser } from "../contexts/UserContext";

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: "income" | "expense";
  category_id?: number;
  startDate?: string;
  endDate?: string;
  summary?: boolean;
}

const PAGE_SIZE = 10;

export default function Transactions() {
  const { user } = useUser();
  const [transactions, setTransactions] = useState<
    PaginatedResponse<Transaction>
  >({
    data: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [opened, setOpened] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(
    null
  );
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtersForm = useForm<TransactionFilters>({
    initialValues: {
      page: 1,
      limit: PAGE_SIZE,
      type: undefined,
      category_id: undefined,
      startDate: undefined,
      endDate: undefined,
    },
  });

  const form = useForm({
    initialValues: {
      amount: 0,
      type: "expense" as "income" | "expense",
      description: "",
      date: new Date().toISOString().split("T")[0],
      category_id: undefined as number | undefined,
      tags: [] as string[],
    },
    validate: {
      amount: (value) => (value <= 0 ? "Valor deve ser positivo" : null),
      description: (value) =>
        value.trim().length === 0 ? "Descrição é obrigatória" : null,
    },
  });

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    fetchTags();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filtersForm.values.page]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await TransactionService.getAll(filtersForm.values);
      setTransactions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao buscar transações"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await CategoryService.getAll();
      setCategories(data.data);
    } catch (err) {
      console.error("Falha ao buscar categorias", err);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await TagService.getAll();
      setTags(data.data);
      console.log("Tags disponíveis:", data.data);
      console.log("Informações do usuário:", user);
    } catch (err) {
      console.error("Falha ao buscar tags", err);
    }
  };

  const handleFilterSubmit = (values: TransactionFilters) => {
    filtersForm.setValues({ ...values, page: 1 });
    fetchTransactions();
  };

  const handleResetFilters = () => {
    filtersForm.reset();
    fetchTransactions();
  };

  const handleEdit = (transaction: Transaction) => {
    setEditTransaction(transaction);
    form.setValues({
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      date: transaction.date.split("T")[0],
      category_id: (transaction as any).category?.id,
      tags:
        (transaction as any).tags?.map((tag: any) => tag.id.toString()) || [],
    });
    setOpened(true);
  };

  const handleSubmit = async (values: typeof form.values) => {
    setError(null);
    setSuccess(null);
    try {
      // Ensure tags is always an array and convert string tags to numbers
      const tagIds = Array.isArray(values.tags) ? values.tags : [];
      const processedTagIds = tagIds
        .map((id) => (typeof id === "string" ? parseInt(id) : id))
        .filter((id) => !isNaN(id) && id > 0);

      const submitData = {
        amount: values.amount,
        type: values.type,
        description: values.description,
        date: values.date,
        category_id: values.category_id
          ? typeof values.category_id === "string"
            ? parseInt(values.category_id)
            : values.category_id
          : undefined,
        tags: processedTagIds, // This should be an array of numbers
      };

      if (editTransaction) {
        const updated = await TransactionService.update(
          editTransaction.id,
          submitData
        );
        setTransactions({
          ...transactions,
          data: transactions.data.map((t) =>
            t.id === updated.id ? updated : t
          ),
        });
        setSuccess("Transação atualizada com sucesso");
      } else {
        const created = await TransactionService.create(submitData);
        setTransactions({
          ...transactions,
          data: [created, ...transactions.data],
          total: transactions.total + 1,
        });
        setSuccess("Transação criada com sucesso");
      }
      setOpened(false);
      form.reset();
      setEditTransaction(null);
    } catch (err) {
      console.error("Erro ao enviar transação:", err);
      setError(
        err instanceof Error ? err.message : "Falha ao salvar transação"
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
      await TransactionService.delete(deleteId);
      setTransactions({
        ...transactions,
        data: transactions.data.filter((t) => t.id !== deleteId),
        total: transactions.total - 1,
      });
      setDeleteConfirm(false);
      setDeleteId(null);
      setSuccess("Transação excluída com sucesso");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao excluir transação"
      );
    }
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

  const handlePageChange = (page: number) => {
    filtersForm.setFieldValue("page", page);
  };

  return (
    <Box p="md">
      <Title order={2} mb="xl">
        Gerenciamento de Transações
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
            <Select
              label="Tipo"
              placeholder="Filtrar por tipo"
              data={[
                { value: "income", label: "Receita" },
                { value: "expense", label: "Despesa" },
              ]}
              clearable
              {...filtersForm.getInputProps("type")}
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
            <TextInput
              label="Data de Início"
              placeholder="YYYY-MM-DD"
              type="date"
              {...filtersForm.getInputProps("startDate")}
            />
            <TextInput
              label="Data de Fim"
              placeholder="YYYY-MM-DD"
              type="date"
              {...filtersForm.getInputProps("endDate")}
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
              <Table.Th>Data</Table.Th>
              <Table.Th>Descrição</Table.Th>
              <Table.Th>Categoria</Table.Th>
              <Table.Th>Tags</Table.Th>
              <Table.Th>Valor</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {transactions.data.map((transaction) => (
              <Table.Tr key={transaction.id}>
                <Table.Td>{formatDate(transaction.date)}</Table.Td>
                <Table.Td>{transaction.description}</Table.Td>
                <Table.Td>
                  {(transaction as any).category?.name || "-"}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {(transaction as any).tags?.map((tag: any) => (
                      <Badge key={tag.id} variant="outline">
                        {tag.name}
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>
                <Table.Td>{formatCurrency(transaction.amount)}</Table.Td>
                <Table.Td>
                  <Badge
                    color={transaction.type === "income" ? "green" : "red"}
                  >
                    {transaction.type}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      color="blue"
                      onClick={() => handleEdit(transaction)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      color="red"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {transactions.data.length === 0 && !loading && (
          <Text p="md" ta="center" c="dimmed">
            Nenhuma transação encontrada
          </Text>
        )}
      </Paper>

      {transactions.total > PAGE_SIZE && (
        <Flex justify="center" mt="md">
          <Pagination
            value={filtersForm.values.page || 1}
            onChange={handlePageChange}
            total={Math.ceil(transactions.total / PAGE_SIZE)}
          />
        </Flex>
      )}

      <Button
        variant="filled"
        mt="md"
        leftSection={<IconPlus size={16} />}
        onClick={() => {
          setEditTransaction(null);
          form.reset();
          setOpened(true);
        }}
      >
        Adicionar Nova Transação
      </Button>

      {/* Edit/Create Modal */}
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          form.reset();
          setEditTransaction(null);
        }}
        title={editTransaction ? "Editar Transação" : "Criar Transação"}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Select
              label="Tipo"
              data={[
                { value: "income", label: "Receita" },
                { value: "expense", label: "Despesa" },
              ]}
              {...form.getInputProps("type")}
              required
            />
            <NumberInput
              label="Valor"
              decimalScale={2}
              min={0.01}
              step={0.01}
              {...form.getInputProps("amount")}
              required
            />
            <TextInput
              label="Descrição"
              placeholder="Digite a descrição"
              {...form.getInputProps("description")}
              required
            />
            <TextInput
              label="Data"
              type="date"
              {...form.getInputProps("date")}
              required
            />
            <Select
              label="Categoria"
              placeholder="Selecione a categoria"
              data={categories.map((c) => ({
                value: c.id.toString(),
                label: c.name,
              }))}
              clearable
              {...form.getInputProps("category_id")}
            />
            <MultiSelect
              label={`Tags (${tags.length} disponíveis)`}
              placeholder="Selecione várias tags"
              data={tags.map((t) => ({
                value: t.id.toString(),
                label: t.name,
              }))}
              clearable
              searchable
              value={form.values.tags}
              onChange={(value: string[]) => {
                form.setFieldValue("tags", value);
              }}
              error={form.errors.tags}
            />

            <Group justify="flex-end" mt="md">
              <Button type="submit">
                {editTransaction ? "Atualizar Transação" : "Criar Transação"}
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
        <Text>Tem certeza de que deseja excluir esta transação?</Text>
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
