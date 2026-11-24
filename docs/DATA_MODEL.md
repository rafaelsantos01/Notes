# Modelo de dados

Banco: **SQLite** (`%APPDATA%\com.notes.desktop\notes.db`), modo WAL, `foreign_keys=ON`.
Identificadores: **UUID v4** (TEXT). Timestamps: **ISO 8601 UTC** (`created_at`/`updated_at`).
Datas puras (vencimentos): `YYYY-MM-DD`, comparadas no fuso local.

## Diagrama (resumo)

```
projects 1───n notes          tags 1───n entity_tags (polimórfica)
projects 1───n activity_logs  entity_tags → note | activity | task | project | link
projects 1───n tasks          attachments → note | activity
projects 1───n links          reminders (entidade opcional)
settings (chave/valor)
```

## Tabelas

### projects
| Coluna | Tipo | Observações |
| --- | --- | --- |
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | |
| description | TEXT | default '' |
| color | TEXT | hex, default `#6366f1` |
| status | TEXT CHECK | `active` \| `paused` \| `completed` |
| created_at / updated_at | TEXT | ISO UTC |

### notes
| Coluna | Tipo | Observações |
| --- | --- | --- |
| id | TEXT PK | UUID |
| title | TEXT | default 'Sem título' |
| content | TEXT | Markdown |
| project_id | TEXT FK → projects | `ON DELETE SET NULL` |
| is_favorite / is_pinned / is_archived | INTEGER | flags 0/1 |
| created_at / updated_at | TEXT | |

Índices: `project_id`, `updated_at DESC`, parcial em `is_favorite`, parcial em `is_archived`.

### activity_logs (diário)
| Coluna | Tipo | Observações |
| --- | --- | --- |
| id | TEXT PK | UUID |
| title | TEXT NOT NULL | |
| description | TEXT | detalhes |
| category | TEXT CHECK | `development, configuration, meeting, problem, solution, study, delivery, other` |
| status | TEXT CHECK | `done` \| `pending` |
| project_id | TEXT FK | `ON DELETE SET NULL` |
| occurred_at | TEXT | **quando aconteceu** (agrupamento dia/semana/mês) |
| created_at / updated_at | TEXT | |

Índices: `occurred_at DESC`, `project_id`.

### tasks
| Coluna | Tipo | Observações |
| --- | --- | --- |
| id | TEXT PK | UUID |
| title / description | TEXT | |
| status | TEXT CHECK | `pending, in_progress, done, cancelled` |
| priority | TEXT CHECK | `low, medium, high, urgent` |
| due_date | TEXT? | `YYYY-MM-DD` (local) |
| completed_at | TEXT? | preenchido ao concluir |
| project_id | TEXT FK | `ON DELETE SET NULL` |
| created_at / updated_at | TEXT | |

Índices: `status`, `due_date`, `project_id`.

### links
| Coluna | Tipo | Observações |
| --- | --- | --- |
| id | TEXT PK | UUID |
| name / url / description | TEXT | url validada http(s) |
| category | TEXT | texto livre normalizado (minúsculas) |
| project_id | TEXT FK | `ON DELETE SET NULL` |
| is_favorite | INTEGER | |
| created_at / updated_at | TEXT | |

### tags
| Coluna | Tipo | Observações |
| --- | --- | --- |
| id | TEXT PK | UUID |
| name | TEXT UNIQUE | `COLLATE NOCASE` |
| created_at / updated_at | TEXT | |

### entity_tags (associação polimórfica)
| Coluna | Tipo |
| --- | --- |
| tag_id | FK → tags `ON DELETE CASCADE` |
| entity_type | CHECK (`note, activity, task, project, link`) |
| entity_id | TEXT |

PK composta `(tag_id, entity_type, entity_id)` + índice por `(entity_type, entity_id)`.
Sem FK para as tabelas de entidades (por design); os repositórios limpam órfãos ao excluir.

### attachments (schema pronto; UI planejada)
| Coluna | Tipo |
| --- | --- |
| id, entity_type (`note/activity`), entity_id | TEXT |
| file_name, file_path, mime_type | TEXT |
| size | INTEGER |
| created_at | TEXT |

### reminders
| Coluna | Tipo | Observações |
| --- | --- | --- |
| id | TEXT PK | UUID |
| title / notes | TEXT | |
| remind_at | TEXT | ISO UTC |
| entity_type / entity_id | TEXT? | vínculo opcional |
| is_done | INTEGER | |
| created_at / updated_at | TEXT | |

### settings
| Coluna | Tipo |
| --- | --- |
| key | TEXT PK |
| value | TEXT |
| updated_at | TEXT |

Chaves usadas: `theme`, `autoBackup` (`off|daily|weekly`), `autoBackupKeep`, `lastAutoBackup`.

### _migrations
Controle de migrations aplicadas (`name` PK, `applied_at`).

## Padrões de integridade

- **Exclusão de projeto** desvincula (`SET NULL`) notas/tarefas/atividades/links — nada é perdido.
- **Exclusão de entidade** remove suas associações em `entity_tags` explicitamente.
- **CHECK constraints** garantem enums no banco (defesa em profundidade além do Rust/Zod).
- **WAL + busy_timeout** para leitura fluida durante escrita.
