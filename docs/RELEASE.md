# Atualizações e publicação de releases

O Notes usa o **Tauri Updater** com assinatura **minisign**: o app verifica um
endpoint (`latest.json`), valida a assinatura do instalador e faz download +
instalação com um clique (o aplicativo reinicia ao concluir).

## Como o usuário atualiza

- **Configurações → Atualizações → "Verificar atualizações"** — botão manual.
- **Automático na inicialização** — se habilitado (padrão), um toast discreto
  oferece instalar quando houver versão nova.
- O endpoint e um token opcional (repo privado) ficam salvos nas configurações.

## Preparação única: chave de assinatura

Já gerada em `%USERPROFILE%\.tauri\notes-updater.key` (sem senha). A chave
**pública** está em `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.

> ⚠️ **Guarde a private key com backup.** Sem ela não é possível publicar
> atualizações que o app aceite. Não a commite no repositório.

## Fluxo de release (a cada versão)

1. **Suba a versão** em `src-tauri/tauri.conf.json` → `"version": "X.Y.Z"`.

2. **Gere o instalador assinado:**

   ```powershell
   # PowerShell
   $env:TAURI_SIGNING_PRIVATE_KEY = "$env:USERPROFILE\.tauri\notes-updater.key"
   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
   bun run build
   ```

   ```bash
   # Git Bash
   export TAURI_SIGNING_PRIVATE_KEY="$HOME/.tauri/notes-updater.key"
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
   bun run build
   ```

   Saída: `src-tauri/target/release/bundle/nsis/`
   - `Notes_X.Y.Z_x64-setup.exe` — instalador
   - `Notes_X.Y.Z_x64-setup.exe.sig` — assinatura minisign

3. **Gere o `latest.json`:**

   ```bash
   bun run release --repo USUARIO/REPO --tag vX.Y.Z --notes "O que mudou"
   ```

   Cria `bundle/nsis/latest.json` apontando para o asset da release.

4. **Crie a release no GitHub** (tag `vX.Y.Z`) e anexe:
   - `Notes_X.Y.Z_x64-setup.exe`
   - `latest.json`

5. **Configure o app** (uma única vez, em Configurações → Atualizações):

   ```
   https://github.com/USUARIO/REPO/releases/latest/download/latest.json
   ```

A partir daí, todos os builds antigos detectam e instalam as novas versões.

## Repos privados

Defina um *personal access token* (escopo `repo`) no campo de token das
Configurações; ele é enviado como `Authorization: Bearer …` na verificação.

## Formato do latest.json

```json
{
  "version": "0.2.0",
  "notes": "Novidades da versão",
  "pub_date": "2026-11-24T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "<conteúdo do .sig>",
      "url": "https://github.com/USER/REPO/releases/download/v0.2.0/Notes_0.2.0_x64-setup.exe"
    }
  }
}
```

## Segurança

- O instalador só instala se a assinatura minisign conferir com a pubkey
  embutida no binário — um `latest.json` ou URL comprometido não basta.
- O download usa HTTPS e valida o host; a validação ocorre antes de executar.
- Endpoint e token ficam no banco local (`settings`), nunca no código-fonte.
