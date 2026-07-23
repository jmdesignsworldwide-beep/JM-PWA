import { describe, it, expect } from "vitest";
import { occursOn, datesInRange, parseOccurrenceId, occurrenceId } from "./recurrence";

describe("recurrencia por patrón", () => {
  it("semanal / quincenal", () => {
    expect(occursOn("2026-07-06", "semanal", "2026-07-13")).toBe(true);
    expect(occursOn("2026-07-06", "semanal", "2026-07-14")).toBe(false);
    expect(occursOn("2026-07-06", "quincenal", "2026-07-20")).toBe(true);
    expect(occursOn("2026-07-06", "quincenal", "2026-07-13")).toBe(false);
  });

  it("mensual con clamp de fin de mes", () => {
    expect(occursOn("2026-01-31", "mensual", "2026-02-28")).toBe(true); // feb no tiene 31
    expect(occursOn("2026-01-15", "mensual", "2026-03-15")).toBe(true);
    expect(occursOn("2026-01-15", "mensual", "2026-03-16")).toBe(false);
  });

  it("anual", () => {
    expect(occursOn("2025-07-04", "anual", "2026-07-04")).toBe(true);
    expect(occursOn("2025-07-04", "anual", "2026-07-05")).toBe(false);
  });

  it("no ocurre antes del inicio", () => {
    expect(occursOn("2026-07-06", "semanal", "2026-06-29")).toBe(false);
  });

  it("datesInRange respeta el rango y el until", () => {
    expect(datesInRange("2026-07-06", "semanal", null, "2026-07-01", "2026-07-31"))
      .toEqual(["2026-07-06", "2026-07-13", "2026-07-20", "2026-07-27"]);
    expect(datesInRange("2026-07-06", "semanal", "2026-07-15", "2026-07-01", "2026-07-31"))
      .toEqual(["2026-07-06", "2026-07-13"]);
  });

  it("id virtual de ocurrencia ida y vuelta", () => {
    const id = occurrenceId("abc-123", "2026-07-20");
    expect(parseOccurrenceId(id)).toEqual({ masterId: "abc-123", fecha: "2026-07-20" });
    expect(parseOccurrenceId("plain-id")).toBeNull();
  });
});
