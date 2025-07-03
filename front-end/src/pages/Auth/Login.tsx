import styles from "./auth.module.css";
import {
  Title,
  Container,
  TextInput,
  PasswordInput,
  Button,
  Group,
  Alert,
  Anchor,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUser } from "../../contexts/UserContext";

export default function Login() {
  const navigate = useNavigate();
  const { login: loginUser, isLoading, isAuthenticated } = useUser();
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Email inválido"),
      password: (value) => (value.length > 0 ? null : "Senha é obrigatória"),
    },
  });

  async function handleSubmit(values: typeof form.values) {
    setError(null);

    try {
      await loginUser(values.email, values.password);
      // Don't navigate here - let the useEffect handle it
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    }
  }

  return (
    <div className={styles.wrapper}>
      <Container className={styles.formContainer}>
        <Title className={styles.title}>Bem vindo de volta!</Title>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          {error && (
            <Alert
              title="Erro de Login"
              color="red"
              withCloseButton
              onClose={() => setError(null)}
              mb="md"
            >
              {error}
            </Alert>
          )}

          <TextInput
            label="Email"
            placeholder="Ex: seunome@email.com"
            required
            radius="md"
            disabled={isLoading}
            {...form.getInputProps("email")}
          />

          <PasswordInput
            label="Senha"
            required
            mt="md"
            radius="md"
            disabled={isLoading}
            {...form.getInputProps("password")}
          />

          <Button
            fullWidth
            mt="xl"
            radius="md"
            type="submit"
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <Group justify="center" mt="lg">
          Não tem uma conta?
          <Anchor
            component="button"
            style={{ color: "var(--color-primary)" }}
            onClick={() => navigate("/register")}
            disabled={isLoading}
          >
            Criar conta
          </Anchor>
        </Group>
      </Container>
      <Container className={styles.titleContainer}></Container>
    </div>
  );
}
