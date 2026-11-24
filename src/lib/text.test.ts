import { describe, expect, it } from "bun:test";
import { excerpt, slugify, stripMarkdown } from "./text";

describe("lib/text", () => {
  it("stripMarkdown remove sintaxe comum", () => {
    const md = [
      "# Título",
      "",
      "Texto com **negrito** e *itálico*.",
      "- item 1",
      "- [ ] tarefa",
      "[link](https://exemplo.com)",
      "`codigo`",
    ].join("\n");
    const text = stripMarkdown(md);
    expect(text).not.toContain("#");
    expect(text).not.toContain("**");
    expect(text).toContain("negrito");
    expect(text).toContain("link");
    expect(text).toContain("codigo");
  });

  it("excerpt trunca com reticências", () => {
    const long = "a".repeat(300);
    const result = excerpt(long, 100);
    expect(result.length).toBeLessThanOrEqual(101);
    expect(result.endsWith("…")).toBe(true);
  });

  it("excerpt preserva textos curtos", () => {
    expect(excerpt("curto", 100)).toBe("curto");
  });

  it("slugify remove acentos e caracteres especiais", () => {
    expect(slugify("Configuração do Ambiente!")).toBe("configuracao-do-ambiente");
    expect(slugify("Açúcar & Café")).toBe("acucar-cafe");
    expect(slugify("///")).toBe("sem-titulo");
  });
});
