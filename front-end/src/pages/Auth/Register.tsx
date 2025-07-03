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
import { useState } from "react";
import { useUser } from "../../contexts/UserContext";

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: {
      email: "",
      password: "",
      name: "",
      confirmPassword: "",
    },
    validate: {
      name: (value) => (value.trim() ? null : "O nome é obrigatório"),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Email inválido"),
      password: (value) =>
        value.length < 6 ? "A senha deve ter pelo menos 6 caracteres" : null,
      confirmPassword: (value, values) =>
        value !== values.password ? "As senhas não conferem" : null,
    },
  });

  async function handleSubmit(values: typeof form.values) {
    setError(null);
    setLoading(true);

    try {
      // Call register from UserContext
      await registerUser(values.name, values.email, values.password);

      // Success - redirect to dashboard
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <Container className={styles.formContainer}>
        <Title className={styles.title}>Bem vindo!</Title>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          {error && (
            <Alert
              title="Erro de Registro"
              color="red"
              withCloseButton
              onClose={() => setError(null)}
              mb="md"
            >
              {error}
            </Alert>
          )}

          <TextInput
            label="Nome"
            placeholder="Seu Nome"
            required
            radius="md"
            disabled={loading}
            {...form.getInputProps("name")}
          />

          <TextInput
            label="Email"
            placeholder="Ex: seunome@email.com"
            required
            mt="md"
            radius="md"
            disabled={loading}
            {...form.getInputProps("email")}
          />

          <PasswordInput
            label="Senha"
            placeholder="Mínimo 6 caracteres"
            required
            mt="md"
            radius="md"
            disabled={loading}
            {...form.getInputProps("password")}
          />

          <PasswordInput
            label="Confirme a Senha"
            placeholder="Digite a senha novamente"
            required
            mt="md"
            radius="md"
            disabled={loading}
            {...form.getInputProps("confirmPassword")}
          />

          <Button
            fullWidth
            mt="xl"
            radius="md"
            type="submit"
            loading={loading}
            disabled={loading}
          >
            {loading ? "Criando conta..." : "Criar Conta"}
          </Button>
        </form>
        <Group justify="center" mt="lg">
          Já tem uma conta?
          <Anchor
            component="button"
            style={{ color: "var(--color-primary)" }}
            onClick={() => navigate("/login")}
            disabled={loading}
          >
            Entrar
          </Anchor>
        </Group>
      </Container>
      <Container className={styles.titleContainer}></Container>
    </div>
  );
}
