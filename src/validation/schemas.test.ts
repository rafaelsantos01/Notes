import { describe, expect, it } from "bun:test";
import { activitySchema, linkSchema, noteSchema, projectSchema, tagsSchema, taskSchema } from "./schemas";

describe("validation/schemas", () => {
  describe("tagsSchema", () => {
    it("remove duplicatas case-insensitive", () => {
      const result = tagsSchema.parse(["Rust", "rust", "SQLite"]);
      expect(result).toEqual(["Rust", "SQLite"]);
    });

    it("rejeita mais de 12 tags", () => {
      const many = Array.from({ length: 13 }, (_, i) => `tag-${i}`);
      expect(tagsSchema.safeParse(many).success).toBe(false);
    });

    it("rejeita tags vazias ou muito longas", () => {
      expect(tagsSchema.safeParse([""]).success).toBe(false);
      expect(tagsSchema.safeParse(["x".repeat(41)]).success).toBe(false);
    });
  });

  describe("projectSchema", () => {
    it("aplica defaults de cor e status", () => {
      const result = projectSchema.parse({ name: "Projeto" });
      expect(result.color).toBe("#6366f1");
      expect(result.status).toBe("active");
      expect(result.tags).toEqual([]);
    });

    it("rejeita nome vazio", () => {
      expect(projectSchema.safeParse({ name: "   " }).success).toBe(false);
    });

    it("rejeita cor inválida", () => {
      expect(projectSchema.safeParse({ name: "X", color: "azul" }).success).toBe(false);
    });
  });

  describe("noteSchema", () => {
    it("rejeita título vazio", () => {
      expect(noteSchema.safeParse({ title: "" }).success).toBe(false);
    });

    it("aceita conteúdo opcional e normaliza para vazio", () => {
      const result = noteSchema.parse({ title: "Nota" });
      expect(result.content).toBe("");
    });
  });

  describe("activitySchema", () => {
    it("aplica categoria e status padrão", () => {
      const result = activitySchema.parse({ title: "Algo", occurredAt: "2026-11-24T10:00:00.000Z" });
      expect(result.category).toBe("other");
      expect(result.status).toBe("done");
    });

    it("rejeita categoria fora da lista", () => {
      const result = activitySchema.safeParse({
        title: "X",
        occurredAt: "2026-11-24T10:00:00.000Z",
        category: "invalida",
      });
      expect(result.success).toBe(false);
    });

    it("rejeita data inválida", () => {
      expect(
        activitySchema.safeParse({ title: "X", occurredAt: "não é data" }).success
      ).toBe(false);
    });
  });

  describe("taskSchema", () => {
    it("aplica prioridade média por padrão", () => {
      const result = taskSchema.parse({ title: "Fazer algo" });
      expect(result.priority).toBe("medium");
      expect(result.status).toBe("pending");
    });

    it("aceita due date YYYY-MM-DD ou null", () => {
      expect(taskSchema.safeParse({ title: "X", dueDate: "2026-12-01" }).success).toBe(true);
      expect(taskSchema.safeParse({ title: "X", dueDate: null }).success).toBe(true);
      expect(taskSchema.safeParse({ title: "X", dueDate: "01/12/2026" }).success).toBe(false);
    });
  });

  describe("linkSchema", () => {
    it("normaliza URL sem scheme para https", () => {
      const result = linkSchema.parse({ name: "GitLab", url: "gitlab.com" });
      expect(result.url).toBe("https://gitlab.com");
    });

    it("preserva scheme existente", () => {
      const result = linkSchema.parse({ name: "X", url: "http://intranet.local" });
      expect(result.url).toBe("http://intranet.local");
    });

    it("rejeita schemes não http(s)", () => {
      expect(linkSchema.safeParse({ name: "X", url: "javascript:alert(1)" }).success).toBe(false);
    });

    it("normaliza categoria vazia para outros", () => {
      const result = linkSchema.parse({ name: "X", url: "https://a.com", category: "" });
      expect(result.category).toBe("outros");
    });
  });
});
