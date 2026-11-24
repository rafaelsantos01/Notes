/**
 * Gera o arquivo `latest.json` (formato Tauri Updater) para anexar na
 * release do GitHub, usando o instalador NSIS e a assinatura (.sig)
 * produzidos por `bun run build`.
 *
 * Uso:
 *   bun run scripts/release.ts --repo USUARIO/REPO [--tag v0.2.0] [--notes "…"]
 *
 * Saída: dist/latest.json (junto dos artefatos de bundle, se existirem)
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface LatestJsonInput {
  version: string;
  notes: string;
  pubDate: string;
  signature: string;
  downloadUrl: string;
}

/** Monta o objeto latest.json no formato esperado pelo Tauri Updater. */
export function buildLatestJson(input: LatestJsonInput) {
  return {
    version: input.version,
    notes: input.notes,
    pub_date: input.pubDate,
    platforms: {
      "windows-x86_64": {
        signature: input.signature,
        url: input.downloadUrl,
      },
    },
  };
}

function findFile(dir: string, suffix: string): string | null {
  if (!existsSync(dir)) return null;
  const match = readdirSync(dir).find((f) => f.endsWith(suffix));
  return match ? resolve(dir, match) : null;
}

function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };

  const repo = getArg("repo");
  if (!repo) {
    console.error("Uso: bun run scripts/release.ts --repo USUARIO/REPO [--tag vX.Y.Z] [--notes \"…\"]");
    process.exit(1);
  }

  const root = resolve(import.meta.dir, "..");
  const conf = JSON.parse(readFileSync(resolve(root, "src-tauri/tauri.conf.json"), "utf-8"));
  const version: string = conf.version;

  const bundleDir = resolve(root, `src-tauri/target/release/bundle/nsis`);
  const setupPath =
    findFile(bundleDir, `_x64-setup.exe`) ?? findFile(bundleDir, `-setup.exe`);
  const sigPath = setupPath ? `${setupPath}.sig` : null;

  if (!setupPath || !existsSync(setupPath)) {
    console.error(
      `Instalador não encontrado em ${bundleDir}.\nExecute primeiro: bun run build (com as env vars de assinatura).`
    );
    process.exit(1);
  }
  if (!sigPath || !existsSync(sigPath)) {
    console.error(
      `Assinatura ausente: ${sigPath}\nGere o build com TAURI_SIGNING_PRIVATE_KEY definido.`
    );
    process.exit(1);
  }

  const tag = getArg("tag") ?? `v${version}`;
  if (tag !== `v${version}`) {
    console.error(
      `A tag ${tag} não corresponde à versão ${version} definida em src-tauri/tauri.conf.json.\n` +
        `Atualize a versão no tauri.conf.json (ou use --tag v${version}).`
    );
    process.exit(1);
  }
  const notes = getArg("notes") ?? `Notes ${version}`;
  const setupName = setupPath.split(/[\\/]/).pop()!;
  const downloadUrl = `https://github.com/${repo}/releases/download/${tag}/${setupName}`;
  const signature = readFileSync(sigPath, "utf-8").trim();

  const latest = buildLatestJson({
    version,
    notes,
    pubDate: new Date().toISOString(),
    signature,
    downloadUrl,
  });

  const outPath = resolve(bundleDir, "latest.json");
  writeFileSync(outPath, `${JSON.stringify(latest, null, 2)}\n`, "utf-8");

  console.log(`✅ latest.json gerado: ${outPath}`);
  console.log(`   versão: ${version}`);
  console.log(`   tag: ${tag}`);
  console.log(`   url: ${downloadUrl}`);
  console.log(`\nAnexe à release ${tag} do ${repo}:`);
  console.log(`  1. ${setupName}`);
  console.log(`  2. ${setupName}.sig (opcional)`);
  console.log(`  3. latest.json`);
}

if (import.meta.main) {
  main();
}
