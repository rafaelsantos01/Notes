import { describe, expect, it } from "bun:test";
import { buildLatestJson } from "./release";

describe("scripts/release", () => {
  it("monta latest.json no formato do Tauri Updater", () => {
    const latest = buildLatestJson({
      version: "0.2.0",
      notes: "Correções e melhorias",
      pubDate: "2026-11-24T12:00:00.000Z",
      signature: "dW50cnVzdGVk…",
      downloadUrl: "https://github.com/user/repo/releases/download/v0.2.0/Notes_0.2.0_x64-setup.exe",
    });

    expect(latest).toEqual({
      version: "0.2.0",
      notes: "Correções e melhorias",
      pub_date: "2026-11-24T12:00:00.000Z",
      platforms: {
        "windows-x86_64": {
          signature: "dW50cnVzdGVk…",
          url: "https://github.com/user/repo/releases/download/v0.2.0/Notes_0.2.0_x64-setup.exe",
        },
      },
    });
  });

  it("usa a chave correta de data (pub_date, snake_case)", () => {
    const latest = buildLatestJson({
      version: "1.0.0",
      notes: "",
      pubDate: "2026-01-01T00:00:00.000Z",
      signature: "sig",
      downloadUrl: "https://example.com/a.exe",
    });
    expect(Object.keys(latest)).toContain("pub_date");
    expect(Object.keys(latest)).not.toContain("pubDate");
  });
});
