# Arquitetura

## Visão geral

O Notes segue uma separação clara entre **interface**, **domínio** e **persistência**, distribuída entre o frontend (React/TypeScript) e o backend (Rust/Tauri):

```
┌───────────────────────────────────────────────────────────────┐
│ Frontend (React + TypeScript)                                 │
│                                                               │
│  components/ui        → primitivos visuais (Radix/shadcn)     │
│  components/common    → componentes de domínio compartilhados │
│  features/<entidade>  → páginas e diálogos por funcionalidade │
│  stores               → estado global (Zustand: tema, UI,     │
│                          cache de projetos)                   │
│  validation           → schemas Zod (formulários/RHF)         │
│  services             → wrapper tipado do invoke() + erros    │
│  lib                  → utilitários puros (datas, texto)      │
└──────────────────────────────┬────────────────────────────────┘
                               │ invoke() — comandos tipados
┌──────────────────────────────▼────────────────────────────────┐
│ Backend (Rust / Tauri 2)                                      │
│                                                               │
│  commands/    → camada fina de IPC (1 comando = 1 caso de uso)│
│  repo/        → regras de acesso a dados + validação          │
│  models.rs    → entidades de domínio + inputs + filtros       │
│  db.rs        → conexão, pragmas, migrations versionadas      │
│  state.rs     → AppState (Mutex<Option<Connection>>)          │
│  error.rs     → AppError serializável p/ frontend             │
└──────────────────────────────┬────────────────────────────────┘
                               │ rusqlite (WAL, FK ON)
                        ┌──────▼──────┐
                        │  notes.db   │  %APPDATA%\com.notes.desktop
                        └─────────────┘
```

## Princípios aplicados

1. **Nada de SQL no frontend.** O React nunca monta consultas; ele chama comandos de domínio (`note_list`, `project_create`…) com filtros tipados. Isso mantém regras e integridade no Rust.
2. **Validação dupla.** Zod valida formulários (UX imediata); o Rust revalida toda entrada de IPC (segurança/integridade) — fontes de erro nunca ficam dependentes da UI.
3. **Erros centralizados.** `AppError` é serializado como `{ kind, message }`; `services/api.ts` exibe toast e registra no console. Nenhum erro silencioso.
4. **Datas consistentes.** Tudo persistido em ISO 8601 UTC; datas puras (vencimentos) como `YYYY-MM-DD`. A apresentação e o agrupamento por dia/semana/mês usam sempre o fuso local do Windows (via `date-fns` no frontend e `chrono::Local` no backend para o dashboard).
5. **Sem lógica de negócio em componentes.** Páginas orquestram; as regras vivem no Rust (repos) e em utilitários puros testados (`lib/dates`, `lib/text`, `validation`).

## Decisões técnicas relevantes

- **`Mutex<Option<Connection>>`**: a conexão fica atrás de um mutex (comandos async executam no pool do Tauri). O `Option` permite fechar a conexão durante a restauração de backup, substituindo o arquivo com segurança.
- **Migrations**: arquivos `.sql` embutidos (`include_str!`) aplicados na inicialização, versionados na tabela `_migrations`. Idempotentes e auditáveis.
- **Backup via `VACUUM INTO`**: gera uma cópia consistente e compactada mesmo com o app em uso. A restauração valida o header SQLite, cria cópia de segurança `.pre-restore.db` e reabre a conexão.
- **Tags polimórficas**: `entity_tags(tag_id, entity_type, entity_id)` sem FK para as tabelas de entidades (por design); os repositórios limpam as associações na exclusão de cada entidade.
- **Markdown seguro**: `react-markdown` **sem** `rehype-raw` — HTML bruto do conteúdo nunca é interpretado; URLs passam pelo sanitizador padrão (bloqueia `javascript:`).
- **Tema**: aplicado antes do primeiro paint (script inline no `index.html`), persistido em `localStorage` + tabela `settings`.

## Testes

| Camada | Ferramenta | O que cobre |
| --- | --- | --- |
| Utilitários TS | `bun test` | agrupamento de datas, vencimentos, schemas Zod, markdown→texto |
| Persistência Rust | `cargo test` | migrations, CRUD de todas as entidades, filtros, constraints, backup/restauração/exportação (SQLite em memória) |

## Estrutura de diretórios

```
src/
  assets/globals.css     # design system (tokens Tailwind 4, tema claro/escuro)
  components/{ui,common,layout}
  features/              # dashboard, journal, notes, projects, tasks,
                         # links, calendar, favorites, archive, search, settings
  hooks/ lib/ services/ stores/ types/ validation/
src-tauri/
  src/{commands,repo}/   # IPC + persistência
  src/migrations/        # schema versionado
docs/                    # esta documentação
```
