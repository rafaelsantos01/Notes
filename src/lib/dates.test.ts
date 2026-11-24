import { describe, expect, it } from "bun:test";
import {
  dayLabel,
  dueLabel,
  formatShortDate,
  groupByLocalDay,
  isOverdue,
  relativeTime,
  weekLabel,
} from "./dates";

describe("lib/dates", () => {
  describe("isOverdue", () => {
    it("marca datas passadas como atrasadas", () => {
      const past = new Date();
      past.setDate(past.getDate() - 3);
      const iso = past.toISOString().slice(0, 10);
      expect(isOverdue(iso)).toBe(true);
    });

    it("não marca hoje como atrasada", () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(isOverdue(today)).toBe(false);
    });

    it("não marca datas futuras", () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      expect(isOverdue(future.toISOString().slice(0, 10))).toBe(false);
    });

    it("retorna false para null", () => {
      expect(isOverdue(null)).toBe(false);
    });
  });

  describe("dueLabel", () => {
    it("rotula hoje e amanhã", () => {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      expect(dueLabel(today.toISOString().slice(0, 10))).toBe("Hoje");
      expect(dueLabel(tomorrow.toISOString().slice(0, 10))).toBe("Amanhã");
    });

    it("retorna null quando não há data", () => {
      expect(dueLabel(null)).toBeNull();
    });

    it("rotula ontem", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(dueLabel(yesterday.toISOString().slice(0, 10))).toBe("Ontem");
    });
  });

  describe("dayLabel", () => {
    it("rotula hoje", () => {
      expect(dayLabel(new Date().toISOString())).toBe("Hoje");
    });

    it("rotula ontem", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(dayLabel(yesterday.toISOString())).toBe("Ontem");
    });
  });

  describe("relativeTime", () => {
    it("descreve momentos recentes", () => {
      const now = new Date().toISOString();
      expect(relativeTime(now)).toBe("agora mesmo");
    });

    it("descreve minutos atrás", () => {
      const d = new Date(Date.now() - 5 * 60_000);
      expect(relativeTime(d.toISOString())).toBe("há 5 min");
    });

    it("descreve horas atrás", () => {
      const d = new Date(Date.now() - 3 * 3_600_000);
      expect(relativeTime(d.toISOString())).toBe("há 3 h");
    });
  });

  describe("groupByLocalDay", () => {
    it("agrupa itens por dia local preservando ordem de inserção", () => {
      // Datas construídas em horário local — garantem o mesmo dia local em qualquer fuso
      const sameDayA = new Date(2026, 10, 23, 10, 0, 0).toISOString();
      const sameDayB = new Date(2026, 10, 23, 18, 0, 0).toISOString();
      const otherDay = new Date(2026, 10, 24, 10, 0, 0).toISOString();

      const groups = groupByLocalDay(
        [{ at: sameDayA }, { at: sameDayB }, { at: otherDay }],
        (i) => i.at
      );

      expect(groups.size).toBe(2);
      const firstDayItems = [...groups.values()][0]!;
      expect(firstDayItems.length).toBe(2);
      expect(firstDayItems[0]!.at).toBe(sameDayA);
    });
  });

  describe("weekLabel", () => {
    it("formata intervalo da semana", () => {
      const label = weekLabel(new Date(2026, 10, 24)); // terça, 24 nov 2026
      expect(label).toMatch(/–/);
      expect(label).toMatch(/novembro/i);
    });
  });

  describe("formatShortDate", () => {
    it("formata datas UTC completas no fuso local", () => {
      expect(formatShortDate("2026-11-24T14:00:00.000Z")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });
});
