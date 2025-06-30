# Tomorrow's Money 💰

Uma aplicação web completa para gestão financeira pessoal, desenvolvida com tecnologias modernas e arquitetura escalável.

## 🚀 Tecnologias

### Backend
- **Node.js** com **TypeScript**
- **Express.js** - Framework web
- **PostgreSQL** - Banco de dados principal
- **MongoDB** - Banco de dados para logs
- **Sequelize** - ORM para PostgreSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticação
- **bcryptjs** - Criptografia de senhas

### Frontend
- **React** 19.1.0 com **TypeScript**
- **Vite** - Build tool e dev server
- **Mantine** - Biblioteca de componentes UI
- **PostCSS** - Processamento de CSS

### Infraestrutura
- **Docker** e **Docker Compose**
- **Nginx** - Servidor web para o frontend

## 📋 Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 18+ (para desenvolvimento local)
- Git

## 🛠️ Instalação e Execução

### Usando Docker (Recomendado)

1. **Clone o repositório:**
```bash
git clone <url-do-repositorio>
cd tomorrows-money
```

2. **Execute com Docker Compose:**
```bash
docker-compose up --build
```

3. **Acesse a aplicação:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Desenvolvimento Local

#### Backend
```bash
cd back-end
npm install
npm run build
npm start
```

#### Frontend
```bash
cd front-end
npm install
npm run dev
```

## 🏗️ Estrutura do Projeto

```
tomorrows-money/
├── back-end/                 # API Backend
│   ├── config/              # Configurações de banco de dados
│   ├── controllers/         # Controladores das rotas
│   ├── models/              # Modelos de dados
│   ├── routes/              # Definição de rotas
│   ├── services/            # Lógica de negócio
│   ├── middlewares/         # Middlewares personalizados
│   ├── utils/               # Utilitários
│   ├── Dockerfile
│   └── package.json
│
├── front-end/               # Interface do usuário
│   ├── src/
│   │   ├── components/      # Componentes React reutilizáveis
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── contexts/        # Contextos React
│   │   ├── services/        # Serviços para API
│   │   └── styles/          # Estilos globais
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml       # Orquestração dos containers
```

## 🐳 Serviços Docker

A aplicação é composta por 4 serviços:

- **postgres**: Banco de dados PostgreSQL (porta 5432)
- **mongodb**: Banco de dados MongoDB (porta 27017)
- **backend**: API Node.js (porta 3001)
- **frontend**: Interface React (porta 3000)

## 🔧 Configuração

### Variáveis de Ambiente

O projeto utiliza as seguintes configurações padrão no Docker:

#### PostgreSQL
- **Host**: postgres
- **Usuário**: admin
- **Senha**: secret
- **Database**: tm_db

#### MongoDB
- **URI**: mongodb://admin:secret@mongodb:27017
- **Usuário**: admin
- **Senha**: secret

## 📝 Scripts Disponíveis

### Backend
- `npm run build` - Compila o TypeScript
- `npm test` - Executa os testes

### Frontend
- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run preview` - Visualiza o build de produção
- `npm run typecheck` - Verifica tipos TypeScript

## 🌟 Funcionalidades

- [ ] Autenticação de usuários
- [ ] Gestão de contas financeiras
- [ ] Registro de transações
- [ ] Relatórios financeiros
- [ ] Dashboard interativo
- [ ] Sistema de logs

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC.

## 👥 Autores

- Desenvolvido como projeto acadêmico para a disciplina de Desenvolvimento Web 2

---

## 🚀 Status do Projeto

🚧 **Em Desenvolvimento** - Este projeto está atualmente em fase de desenvolvimento ativo.
