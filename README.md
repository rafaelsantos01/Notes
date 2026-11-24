# Notes — Personal Knowledge Manager

> **Registre hoje. Encontre quando precisar.**

Aplicativo desktop nativo para Windows para gerenciamento de informações pessoais e profissionais: diário de atividades, anotações em Markdown, projetos, tarefas, links e lembretes — tudo em um banco **local** (SQLite), sem cadastro, sem nuvem e 100% offline.

## 📥 Download

**[⬇️ Baixar o instalador (última versão)](https://github.com/rafaelsantos01/Notes/releases/latest)**

Baixe o `Notes_x.y.z_x64-setup.exe` na seção *Assets* da release e execute. Requer Windows 10/11.

![Stack](https://img.shields.io/badge/Tauri%202-Rust%20·%20React%20·%20TypeScript-6366f1)

## Funcionalidades

| Módulo | Descrição |
| --- | --- |
| **Dashboard** | Visão geral: atividades de hoje, tarefas pendentes/atrasadas, últimos registros, notas, projetos e lembretes |
| **Diário** | Registro do dia a dia com categoria, projeto, tags, status e agrupamento por dia/semana/mês |
| **Anotações** | Markdown com salvamento automático, favoritos, fixadas, arquivadas, tags e projetos |
| **Projetos** | Contextos com cor, status, contadores e visão detalhada (notas, tarefas, histórico, links) |
| **Tarefas** | Prioridade, vencimento, conclusão rápida, filtros e associação a projetos |
| **Links** | Central de acessos com categorias, busca e abertura no navegador padrão |
| **Calendário** | Grade mensal com marcadores por dia e painel de detalhes |
| **Busca global** | `Ctrl+K` pesquisa em tudo, com resultados agrupados e navegação direta |
| **Backup/Export** | Backup SQLite (`VACUUM INTO`), restauração, exportação Markdown e JSON |
| **Atualizações** | Verificação manual e automática, download e instalação via GitHub Releases (assinado) |

## Stack

- **Desktop:** Tauri 2 (Rust) + WebView2
- **Frontend:** React 18 + TypeScript + Vite
- **Estilo:** Tailwind CSS 4 + componentes estilo shadcn/ui (Radix) + Lucide
- **Banco:** SQLite (`rusqlite`) com migrations versionadas
- **Estado:** Zustand · **Validação:** Zod · **Formulários:** React Hook Form
- **Package manager/scripts:** Bun

## Desenvolvimento

Pré-requisitos: [Bun](https://bun.sh), [Rust (MSVC)](https://rustup.rs) e VS Build Tools + WebView2 (padrão no Windows 11).

```bash
bun install        # dependências
bun run dev        # app de desenvolvimento (Tauri + Vite)
bun test           # testes unitários (frontend)
cargo test         # testes de integração (backend, dentro de src-tauri)
bun run lint       # ESLint
bun run typecheck  # verificação de tipos
```

## Build do instalador

```bash
bun run build      # gera instalador NSIS (.exe) em src-tauri/target/release/bundle/
```

Para builds **assinados** (necessários para o auto-update), defina as variáveis
de ambiente de assinatura antes — veja [docs/RELEASE.md](docs/RELEASE.md).

## Releases automáticas (GitHub Actions)

Ao enviar uma tag `vX.Y.Z`, o workflow `.github/workflows/release.yml` builda,
testa, assina e publica a release completa (instalador + `latest.json`)
automaticamente. Requer os secrets `TAURI_SIGNING_PRIVATE_KEY` (e
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`) no repositório. O CI
(`ci.yml`) roda lint, typecheck e todos os testes em cada push/PR.

## Atalhos de teclado

| Atalho | Ação |
| --- | --- |
| `Ctrl+K` | Busca global |
| `Ctrl+N` | Nova anotação |
| `Ctrl+D` | Novo registro diário |
| `Ctrl+T` | Nova tarefa |
| `Ctrl+S` | Salvar anotação (no editor) |
| `Esc` | Fechar diálogos |

## Onde ficam os dados

Tudo é local e privado:

```
%APPDATA%\com.notes.desktop\
├── notes.db        # banco SQLite (WAL)
└── backups\        # backups automáticos (se habilitados)
```

Backups manuais, exportações Markdown/JSON e restauração estão em **Configurações**.

## Arquitetura e documentação

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — camadas, fluxo de dados e decisões
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — schema do banco e relacionamentos
- [docs/RELEASE.md](docs/RELEASE.md) — assinatura, releases e auto-update

## Roadmap

- [x] Fase 1 — Fundação (Tauri, SQLite, navegação, tema, dashboard)
- [x] Fase 2 — Diário, anotações, projetos, tags, links
- [x] Fase 3 — Tarefas, calendário, busca global, favoritos, arquivamento
- [x] Fase 4 — Backup/restauração/exportação (área de segredos com DPAPI: pendente)
- [ ] Fase 5 — Revisão final de segurança, ícone customizado do usuário, instalador assinado

## Licença

Uso pessoal.
