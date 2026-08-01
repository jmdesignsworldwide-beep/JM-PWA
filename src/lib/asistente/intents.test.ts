import { describe, it, expect } from "vitest";
import { detectarIntencion } from "./intents";

describe("Asistente — detección de intención", () => {
  const casos: [string, string, string | null][] = [
    // Los 5 ejemplos pedidos
    ["quién me debe", "cobros", null],
    ["cuánto gasté este mes", "gastos", "mes"],
    ["qué tengo esta semana", "agenda", "semana"],
    ["a quién le debo", "deudas", null],
    ["cómo va todo", "resumen", null],
    // Variantes: sin acentos, mayúsculas, errores
    ["AQUIEN LE DEBO", "deudas", null],
    ["quien me debe", "cobros", null],
    ["cuanto me deben", "cobros", null],
    ["que vence esta semana", "vencimientos", "semana"],
    ["cuánto tengo disponible", "neto", null],
    ["cuanto facture este ano", "ingresos", "anio"],
    ["mis pedidos activos", "pedidos", null],
    ["cuantos clientes tengo", "clientes", null],
    ["que gaste ayer", "gastos", "ayer"],
    ["resumeme el mes", "resumen", "mes"],
    // Deudas gana a cobros cuando dice "le debo"
    ["cuanto le debo a juan", "deudas", null],
    // Nuevos (PR1): pendientes, datos de cliente, variantes
    ["qué pendientes tengo", "pendientes", null],
    ["mis tareas", "pendientes", null],
    ["el teléfono de franklin", "datos_cliente", null],
    ["info de edwin", "datos_cliente", null],
    ["cuánto me debe franklin", "cobros", null],
    ["mi mayor gasto", "gastos", null],
    ["ponme al día", "resumen", null],
    ["quién me paga esta semana", "vencimientos", "semana"],
    ["cuál es mi cliente top", "clientes", null],
    // "pendientes de [proyecto]" sigue siendo proyectos, no mis pendientes
    ["qué pendientes tengo de kitjoy", "proyectos", null],
  ];

  it.each(casos)("'%s' → intención %s", (texto, intent, periodo) => {
    const d = detectarIntencion(texto);
    expect(d.intent).toBe(intent);
    if (periodo !== null) expect(d.periodo).toBe(periodo);
  });

  it("texto sin sentido → desconocido", () => {
    expect(detectarIntencion("xyz abc 123").intent).toBe("desconocido");
    expect(detectarIntencion("").intent).toBe("desconocido");
  });
});
