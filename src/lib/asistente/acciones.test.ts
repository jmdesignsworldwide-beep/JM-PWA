import { describe, it, expect } from "vitest";
import { detectarAccion, extraerMonto, extraerFecha, extraerHora, extraerMoneda } from "./acciones";

const HOY = "2026-08-01"; // sábado

describe("Asistente — extracción de datos", () => {
  it("monto: coma = miles, punto = decimal", () => {
    expect(extraerMonto("gaste 500 en comida")).toBe(500);
    expect(extraerMonto("rd$1,500.50")).toBe(1500.5);
    expect(extraerMonto("sin numero")).toBeUndefined();
  });

  it("moneda: por defecto DOP, USD si se menciona", () => {
    expect(extraerMoneda("gaste 500")).toBe("DOP");
    expect(extraerMoneda("recibi 500 usd")).toBe("USD");
    expect(extraerMoneda("100 dolares")).toBe("USD");
  });

  it("hora: 'a las 3' → tarde por defecto (15:00)", () => {
    expect(extraerHora("a las 3")).toBe("15:00");
    expect(extraerHora("a las 9 am")).toBe("09:00");
    expect(extraerHora("sin hora")).toBeUndefined();
  });

  it("fecha: 'el viernes' cae en viernes", () => {
    const f = extraerFecha("el viernes", HOY)!;
    expect(f).toBeDefined();
    expect(new Date(`${f}T12:00:00Z`).getUTCDay()).toBe(5);
    expect(extraerFecha("hoy", HOY)).toBe(HOY);
  });
});

describe("Asistente — detección de acciones", () => {
  it("gasto", () => {
    const a = detectarAccion("gasté 500 en comida", HOY)!;
    expect(a.tipo).toBe("gasto");
    expect(a.slots.monto).toBe(500);
    expect(a.slots.concepto).toBe("comida");
  });

  it("ingreso (sin cliente)", () => {
    const a = detectarAccion("entró 500 por un diseño", HOY)!;
    expect(a.tipo).toBe("ingreso");
    expect(a.slots.monto).toBe(500);
  });

  it("pendiente", () => {
    const a = detectarAccion("recuérdame llamar a Franklin", HOY)!;
    expect(a.tipo).toBe("pendiente");
    expect(a.slots.concepto).toBe("llamar a franklin");
  });

  it("evento con fecha y hora", () => {
    const a = detectarAccion("agéndame reunión con Edwin el viernes a las 3", HOY)!;
    expect(a.tipo).toBe("evento");
    expect(a.slots.fecha).toBeDefined();
    expect(a.slots.hora).toBe("15:00");
  });

  it("deuda: 'le debo 500 a X'", () => {
    const a = detectarAccion("le debo 500 a Franklin", HOY)!;
    expect(a.tipo).toBe("deuda");
    expect(a.slots.monto).toBe(500);
  });

  it("pago: 'X me pagó 500' (nombre antes del verbo)", () => {
    const a = detectarAccion("Franklin me pagó 500", HOY)!;
    expect(a.tipo).toBe("pago");
    expect(a.slots.monto).toBe(500);
  });

  it("'me pagaron 500' (plural) → ingreso, no pago", () => {
    const a = detectarAccion("me pagaron 500", HOY)!;
    expect(a.tipo).toBe("ingreso");
  });

  it("cliente / prospecto", () => {
    expect(detectarAccion("nuevo cliente Juan Pérez", HOY)!.tipo).toBe("cliente");
    expect(detectarAccion("nuevo prospecto Ana", HOY)!.slots.esProspecto).toBe(true);
  });

  it("consultas NO son acciones (sin monto/verbo de acción)", () => {
    expect(detectarAccion("cuánto gasté este mes", HOY)).toBeNull();
    expect(detectarAccion("quién me debe", HOY)).toBeNull();
    expect(detectarAccion("cuánto le debo a Juan", HOY)).toBeNull();
  });
});
