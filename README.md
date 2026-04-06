# Oxente Express — Frontend

<p align="center">
  Interface web do aplicativo de delivery — conectando lojas, entregadores e clientes.
</p>

## Visão Geral

O frontend do Oxente Express é a aplicação React que serve como ponto de contato para os três perfis do sistema: **Cliente** (navega lojas e faz pedidos), **Loja** (gerencia produtos e pedidos) e **Entregador** (aceita e finaliza entregas). Foi construído com Vite + React + TypeScript, estilizado com Tailwind CSS e shadcn/ui, e otimizado para deploy em plataformas serverless como Vercel.

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 6 + SWC (esbuild) |
| Roteamento | React Router v6 |
| UI Components | shadcn/ui (Radix UI) |
| Estilos | Tailwind CSS 3 |
| State / Server Cache | React Query v5 |
| HTTP Client | Axios |
| Notificações | Sonner (toast) |
| Formulários | react-hook-form + Zod |
| Gráficos | Recharts |
| Ícones | lucide-react |
| Testes | Vitest + Testing Library |
| E2E | Playwright |
| Lint | ESLint 9 |
| Deploy | Vercel |

## Configuração Local

```bash
# 1. Instale as dependências
npm install

# 2. Configure o .env (copie de .env.example)
cp .env.example .env

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173` (ou a porta que o Vite indicar).

### Variáveis de Ambiente

| Variável | Descrição | |
|---|---|---|
| `VITE_API_URL` | URL do backend |
| `VITE_SUPABASE_PUBLIC_BOX_URL` | URL pública do bucket Supabase (imagens) |

> O backend precisa estar rodando para o frontend funcionar. Veja [o README do Backend](https://github.com/newtsarthur/OxenteExpress_Backend).

## Estrutura de Pastas

```
src/
├── components/
│   ├── auth/           # RegisterWizard (fluxo de cadastro)
│   ├── media/          # BoxImage, PersonAvatar (render de imagens)
│   └── ui/             # Componentes shadcn/ui (Button, Dialog, Tabs…)
│   ├── AISupportChat.tsx     # Chatbot Oxente AI
│   ├── CartSheet.tsx         # Carrinho lateral
│   ├── ProductCatalog.tsx    # Catálogo de produtos da loja
│   ├── ProfileSheet.tsx      # Painel de perfil
│   ├── StoreInventory.tsx    # Gestão de produtos (Store)
│   ├── StoreList.tsx         # Lista de lojas próximas
│   └── UserNavAvatar.tsx     # Avatar do usuário na Navbar
├── contexts/
│   ├── AuthContext.tsx       # Sessão, login, logout
│   ├── CartContext.tsx       # Carrinho persistente (localStorage)
├── data/
│   └── types.ts              # Interfaces TypeScript (User, Order, Product…)
├── hooks/
│   └── useRealtimeSync.ts    # Hook genérico de polling
├── lib/
│   ├── api.ts                # Axios config, instâncias de API
│   ├── authMap.ts            # Mapeamento UserRole ↔ BackendUserType
│   ├── beep.ts               # Som de notificação (Web Audio API)
│   ├── packageMappers.ts     # Conversão API → tipos do frontend
│   ├── socketEvents.ts       # Constantes de eventos (legado)
│   └── storageUrl.ts         # Resolução de URLs de imagens
├── pages/
│   ├── Index.tsx             # Roteamento por perfil (Store/Rider/Customer)
│   ├── LoginPage.tsx         # Login
│   ├── StoreDashboard.tsx    # Painel da Loja (pedidos + estoque)
│   ├── RiderDashboard.tsx    # Painel do Entregador (pacotes + entregas)
│   ├── CustomerDashboard.tsx # Painel do Cliente (lojas + pedidos)
│   ├── LoginPage.tsx         # Autenticação
│   └── NotFound.tsx          # 404
├── test/                     # Testes unitários (Vitest)
└── App.tsx / main.tsx        # Entry points
```

## Perfis e Dashboards

### Cliente (Customer)
- **Lojas** → Lista de lojas num raio de 15km com busca por GPS
- **Catálogos** → Produtos com carrinho integrado
- **Pedidos** → Status em tempo real (polling a cada 8s) com barra de progresso
- **Chat IA** → Suporte com Oxente AI

### Loja (Store)
- **Pedidos ativos** → Lista com badge de status (Pendente, Preparando, Pronto, Coletando)
- **Ações** → Iniciar preparo, marcar como pronto, confirmar coleta com código
- **Histórico** → Entregas finalizadas
- **Produtos** → CRUD completo com upload de imagem (criar, editar, excluir, estoque)
- **Chat IA** → Suporte com Oxente AI

### Entregador (Rider)
- **Disponíveis** → Pacotes próximos com distância, peso, volume e taxa
- **Minha Entrega** → Mapa visual da rota (loja → cliente)
- **Finalizar** → Validação do código de entrega
- **Histórico** → Entregas concluídas
- **Chat IA** → Suporte com Oxente AI

## Funcionalidades Principais

### Polling (substituiu Socket.IO)
Atualizações automáticas via `setInterval`:
- Store / Rider: refetch a cada **5s**
- Customer: refetch a cada **8s**
- Catálogo de loja: refetch a cada **10s**
- Notificação sonora (beep) ao detectar novos pedidos

### Geolocalização
- **Prioridade 1**: Coordenadas salvas no perfil
- **Prioridade 2**: Geolocation API do navegador
- **Fallback**: Endereço padrão do perfil (backend faz geocoding via Nominatim)

### Suporte com IA (Oxente AI)
- Botão flutuante presente em todos os dashboards
- Chat popup com contador de perguntas restantes (5 por 30 min)
- Personalidade pernambucana, conhece regras do app

### Carrinho
- Persistente via `localStorage`
- Gerencia quantidade, subtotal, peso e volume totais
- Reserva de estoque no backend ao criar pedido

## Scripts

| Comando | Ação |
|---|---|
| `npm run dev` | Inicia Vite (dev server com hot reload) |
| `npm run build` | Gera build de produção |
| `npm run build:dev` | Build de produção com modo development |
| `npm run preview` | Serve o build localmente para conferência |
| `npm run test` | Executa testes (Vitest) |
| `npm run lint` | Executa ESLint |

## Deploy na Vercel

O deploy é feito pelo push na branch `main`. O Vercel detecta automaticamente o projeto Vite.

1. Configure as variáveis de ambiente no painel da Vercel (`VITE_API_URL` → URL do backend na Vercel, `VITE_SUPABASE_PUBLIC_BOX_URL`)
2. Aponte `VITE_API_URL` para a URL do backend deployado

## Licença

[MIT](LICENSE)
