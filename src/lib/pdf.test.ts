import { describe, it, expect } from "vitest";
import { buildQuotePdf, buildContractPdf, buildInvoicePdf } from "./pdf";

const isPdf = (b: Uint8Array) => String.fromCharCode(...b.slice(0, 5)) === "%PDF-";

describe("PDFs premium se generan sin error", () => {
  it("cotización con precio, líneas y notas", async () => {
    const bytes = await buildQuotePdf({
      brand: "JM Designs Worldwide", cliente: "María Pérez", rama: "designs",
      tipo: "Sistema web", industria: "Tecnología",
      lineas: ["Landing page", "Panel de administración", "Integración de pagos"],
      notas: "Incluye 2 rondas de revisión.", precio: 85000, moneda: "DOP", fecha: "2026-06-16",
    });
    expect(bytes.length).toBeGreaterThan(1000);
    expect(isPdf(bytes)).toBe(true);
  });

  it("contrato y factura", async () => {
    const c = await buildContractPdf({ brand: "JM Designs", cliente: "Cliente", contenido: "Términos…", estado: "enviado", fecha: "2026-06-16" });
    const f = await buildInvoicePdf({
      brand: "JM Designs", cliente: "Cliente", rnc: null, ncf: null, esFiscal: false,
      items: [{ producto: "Servicio", cantidad: 1, subtotal: 1000 }],
      subtotal: 1000, itbis: 0, total: 1000, moneda: "DOP", estadoPago: "pendiente", fecha: "2026-06-16",
    });
    expect(isPdf(c)).toBe(true);
    expect(isPdf(f)).toBe(true);
  });
});
