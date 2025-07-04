import { useState, useEffect } from "react";
import { LogService, Log } from "../api/services/logs";
import { PaginatedResponse } from "../types/api";
import {
  Table,
  Paper,
  TextInput,
  Select,
  Group,
  Button,
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
  Card,
  SimpleGrid,
  Tooltip,
  Code,
  Modal,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconX, IconSearch, IconEye } from "@tabler/icons-react";
import { useUser } from "../contexts/UserContext";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 20;

export default function Logs() {
  const { user: currentUser } = useUser();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (currentUser && currentUser.type !== "admin") {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  const [logs, setLogs] = useState<PaginatedResponse<Log>>({
    data: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  const filtersForm = useForm({
    initialValues: {
      page: 1,
      limit: PAGE_SIZE,
      search: "",
      action: "",
      entity_type: "",
      user_id: "",
      startDate: "",
      endDate: "",
    },
  });

  useEffect(() => {
    if (currentUser?.type === "admin") {
      fetchLogs();
    }
  }, [currentUser]);

  useEffect(() => {
    fetchLogs();
  }, [filtersForm.values.page]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        ...filtersForm.values,
        // Remove empty values
        ...(filtersForm.values.search && { search: filtersForm.values.search }),
        ...(filtersForm.values.action && { action: filtersForm.values.action }),
        ...(filtersForm.values.entity_type && {
          entity_type: filtersForm.values.entity_type,
        }),
        ...(filtersForm.values.user_id && {
          user_id: filtersForm.values.user_id,
        }),
        ...(filtersForm.values.startDate && {
          startDate: filtersForm.values.startDate,
        }),
        ...(filtersForm.values.endDate && {
          endDate: filtersForm.values.endDate,
        }),
      };
      const data = await LogService.getAll(filters);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao buscar logs");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (values: typeof filtersForm.values) => {
    filtersForm.setValues({ ...values, page: 1 });
    fetchLogs();
  };

  const handleResetFilters = () => {
    filtersForm.reset();
    fetchLogs();
  };

  const handleViewDetails = (log: Log) => {
    setSelectedLog(log);
    setDetailsModal(true);
  };

  const handlePageChange = (page: number) => {
    filtersForm.setFieldValue("page", page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const renderLogCard = (log: Log) => (
    <Card key={log.log_id} shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Badge color={LogService.getActionColor(log.action)} variant="light">
            {LogService.getActionLabel(log.action)}
          </Badge>
          <Badge variant="outline">
            {LogService.getEntityTypeLabel(log.entity_type)}
          </Badge>
        </Group>

        <div>
          <Text fw={500} size="sm">
            {LogService.formatLogDescription(log)}
          </Text>
          <Text size="xs" c="dimmed">
            {LogService.formatTimestamp(log.created_at)}
          </Text>
        </div>

        {log.entity_id && (
          <Text size="xs" c="dimmed">
            Entity ID: {log.entity_id}
          </Text>
        )}

        <Group justify="space-between" mt="md">
          <Text size="xs" c="dimmed">
            {log.ip_address && `IP: ${log.ip_address}`}
          </Text>
          <Group gap="xs">
            <Tooltip label="Ver Detalhes">
              <ActionIcon color="blue" onClick={() => handleViewDetails(log)}>
                <IconEye size={16} />
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
        Logs do Sistema
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

      <Paper withBorder p="md" mb="md" radius="md">
        <form onSubmit={filtersForm.onSubmit(handleFilterSubmit)}>
          <Stack>
            <Group grow>
              <TextInput
                label="Buscar"
                placeholder="Buscar logs..."
                leftSection={<IconSearch size={16} />}
                {...filtersForm.getInputProps("search")}
              />
              <Select
                label="Ação"
                placeholder="Filtrar por ação"
                data={[
                  { value: "create", label: "Criar" },
                  { value: "update", label: "Atualizar" },
                  { value: "delete", label: "Excluir" },
                  { value: "read", label: "Ler" },
                  { value: "login", label: "Login" },
                  { value: "logout", label: "Logout" },
                  { value: "register", label: "Registrar" },
                ]}
                clearable
                {...filtersForm.getInputProps("action")}
              />
            </Group>

            <Group grow>
              <Select
                label="Tipo de Entidade"
                placeholder="Filtrar por tipo de entidade"
                data={[
                  { value: "user", label: "Usuário" },
                  { value: "transaction", label: "Transação" },
                  { value: "category", label: "Categoria" },
                  { value: "tag", label: "Tag" },
                  { value: "goal", label: "Meta" },
                  { value: "auth", label: "Autenticação" },
                  { value: "system", label: "Sistema" },
                ]}
                clearable
                {...filtersForm.getInputProps("entity_type")}
              />
              <TextInput
                label="ID do Usuário"
                placeholder="Filtrar por ID do usuário"
                {...filtersForm.getInputProps("user_id")}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Data Inicial"
                placeholder="AAAA-MM-DD"
                type="date"
                {...filtersForm.getInputProps("startDate")}
              />
              <TextInput
                label="Data Final"
                placeholder="AAAA-MM-DD"
                type="date"
                {...filtersForm.getInputProps("endDate")}
              />
            </Group>
          </Stack>

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
                <Table.Th>Action</Table.Th>
                <Table.Th>Entity</Table.Th>
                <Table.Th>User</Table.Th>
                <Table.Th>Time</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {logs.data.map((log) => (
                <Table.Tr key={log.log_id}>
                  <Table.Td>
                    <Badge
                      color={LogService.getActionColor(log.action)}
                      variant="light"
                    >
                      {LogService.getActionLabel(log.action)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <div>
                      <Text fw={500} size="sm">
                        {LogService.getEntityTypeLabel(log.entity_type)}
                      </Text>
                      {log.entity_id && (
                        <Text size="xs" c="dimmed">
                          ID: {log.entity_id}
                        </Text>
                      )}
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <div>
                      <Text fw={500} size="sm">
                        {log.user?.name || "Unknown"}
                      </Text>
                      <Text size="xs" c="dimmed">
                        ID: {log.user_id}
                      </Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <div>
                      <Text size="sm">{formatDate(log.created_at)}</Text>
                      <Text size="xs" c="dimmed">
                        {formatTime(log.created_at)}
                      </Text>
                    </div>
                  </Table.Td>

                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Ver Detalhes">
                        <ActionIcon
                          color="blue"
                          onClick={() => handleViewDetails(log)}
                        >
                          <IconEye size={16} />
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
            {logs.data.map(renderLogCard)}
          </SimpleGrid>
        )}

        {logs.data.length === 0 && !loading && (
          <Text p="md" ta="center" c="dimmed">
            Nenhum log encontrado
          </Text>
        )}
      </Paper>

      {logs.total > PAGE_SIZE && (
        <Flex justify="center" mt="md">
          <Pagination
            value={filtersForm.values.page || 1}
            onChange={handlePageChange}
            total={Math.ceil(logs.total / PAGE_SIZE)}
          />
        </Flex>
      )}

      {/* Log Details Modal */}
      <Modal
        opened={detailsModal}
        onClose={() => setDetailsModal(false)}
        title="Log Details"
        size="lg"
      >
        {selectedLog && (
          <Stack>
            <Group>
              <Badge
                color={LogService.getActionColor(selectedLog.action)}
                variant="light"
                size="lg"
              >
                {LogService.getActionLabel(selectedLog.action)}
              </Badge>
              <Badge variant="outline" size="lg">
                {LogService.getEntityTypeLabel(selectedLog.entity_type)}
              </Badge>
            </Group>

            <div>
              <Text fw={500} mb="xs">
                Description
              </Text>
              <Text size="sm">
                {LogService.formatLogDescription(selectedLog)}
              </Text>
            </div>

            <Group grow>
              <div>
                <Text fw={500} mb="xs">
                  Log ID
                </Text>
                <Code>{selectedLog.log_id}</Code>
              </div>
              <div>
                <Text fw={500} mb="xs">
                  Entity ID
                </Text>
                <Code>{selectedLog.entity_id || "N/A"}</Code>
              </div>
            </Group>

            <Group grow>
              <div>
                <Text fw={500} mb="xs">
                  User
                </Text>
                <Text size="sm">
                  {selectedLog.user?.name || "Unknown"} (ID:{" "}
                  {selectedLog.user_id})
                </Text>
                {selectedLog.user?.email && (
                  <Text size="xs" c="dimmed">
                    {selectedLog.user.email}
                  </Text>
                )}
              </div>
              <div>
                <Text fw={500} mb="xs">
                  Timestamp
                </Text>
                <Text size="sm">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </Text>
                <Text size="xs" c="dimmed">
                  {LogService.formatTimestamp(selectedLog.created_at)}
                </Text>
              </div>
            </Group>

            <Group grow>
              <div>
                <Text fw={500} mb="xs">
                  IP Address
                </Text>
                <Code>{selectedLog.ip_address || "N/A"}</Code>
              </div>
              <div>
                <Text fw={500} mb="xs">
                  User Agent
                </Text>
                <Text size="xs" style={{ wordBreak: "break-all" }}>
                  {selectedLog.user_agent || "N/A"}
                </Text>
              </div>
            </Group>

            {selectedLog.old_value && (
              <div>
                <Text fw={500} mb="xs">
                  Old Value
                </Text>
                <Code block>
                  {JSON.stringify(selectedLog.old_value, null, 2)}
                </Code>
              </div>
            )}

            {selectedLog.new_value && (
              <div>
                <Text fw={500} mb="xs">
                  New Value
                </Text>
                <Code block>
                  {JSON.stringify(selectedLog.new_value, null, 2)}
                </Code>
              </div>
            )}
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
