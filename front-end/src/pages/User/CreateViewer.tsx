import {
  Container,
  Card,
  Text,
  Button,
  Group,
  Stack,
  Title,
  TextInput,
  PasswordInput,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useUser } from "../../contexts/UserContext";
import { UserService } from "../../api";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function CreateViewer() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      password: "",
    },
    validate: {
      name: (value) => (value.length > 0 ? null : "Nome é obrigatório"),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Email inválido"),
      password: (value) =>
        value.length >= 6 ? null : "Senha deve ter pelo menos 6 caracteres",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setError(null);
    setIsLoading(true);

    try {
      // Create viewer user with the current user as the viewable user
      const viewerData = {
        name: values.name,
        email: values.email,
        password: values.password,
        type: 2, // viewer type
        viewable_user_id: user?.id,
      };

      await UserService.create(viewerData);
      setSuccess(true);

      // Optionally update current user context if needed
      setTimeout(() => {
        navigate("/profile");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Erro ao criar perfil visualizador");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <Container size="sm">
        <Text>Usuário não encontrado</Text>
      </Container>
    );
  }

  // Check if user is type 0 (regular user)
  const userType =
    typeof user.type === "string" ? user.type : String(user.type);
  if (userType !== "user" && userType !== "0") {
    return (
      <Container size="sm">
        <Alert color="red" title="Acesso Negado">
          Apenas usuários regulares podem criar perfis visualizadores.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <div>
            <Title order={2} mb="xs">
              Criar Perfil Visualizador
            </Title>
            <Text size="sm" c="dimmed">
              Crie um perfil visualizador que poderá acessar seus dados
              financeiros.
            </Text>
          </div>

          {success ? (
            <Alert color="green" title="Sucesso!">
              Perfil visualizador criado com sucesso! Redirecionando para o
              perfil...
            </Alert>
          ) : (
            <form onSubmit={form.onSubmit(handleSubmit)}>
              {error && (
                <Alert
                  title="Erro"
                  color="red"
                  withCloseButton
                  onClose={() => setError(null)}
                  mb="md"
                >
                  {error}
                </Alert>
              )}

              <Stack gap="md">
                <TextInput
                  label="Nome do Visualizador"
                  placeholder="Ex: João Silva"
                  required
                  disabled={isLoading}
                  {...form.getInputProps("name")}
                />

                <TextInput
                  label="Email do Visualizador"
                  placeholder="Ex: joao@email.com"
                  required
                  disabled={isLoading}
                  {...form.getInputProps("email")}
                />

                <PasswordInput
                  label="Senha"
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={isLoading}
                  {...form.getInputProps("password")}
                />

                <Group justify="space-between" mt="md">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/profile")}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    loading={isLoading}
                    disabled={isLoading}
                  >
                    Criar Visualizador
                  </Button>
                </Group>
              </Stack>
            </form>
          )}
        </Stack>
      </Card>
    </Container>
  );
}

export default CreateViewer;
