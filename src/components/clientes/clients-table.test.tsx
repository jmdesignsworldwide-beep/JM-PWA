import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientsTable } from "./clients-table";
import type { Client } from "@/lib/data/clients";

// El form "Nuevo cliente" usa un server action y el router; los mockeamos.
vi.mock("@/app/(app)/leads/actions", () => ({ createLead: async () => ({ ok: true }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }),
}));

function client(nombre: string, industria: string): Client {
  return {
    id: nombre, nombre, apellido: "", cedula: null, factura_fiscal: false, rnc: null,
    telefono: null, whatsapp: null, correo: null, direccion: null, info_nota: null,
    categoria_servicio: null, industria, es_lead: false, etapa_venta: "nuevo",
    lo_que_quiere: null, fuente: null, valor_estimado: null, valor_estimado_moneda: "DOP",
    brand_id: null, created_by: null, created_at: "", updated_at: "",
  } as Client;
}

describe("Filtro de industria (lupita, por inicio de palabra) en Clientes", () => {
  const clients = [client("AcmeTec", "Tecnología"), client("LexLegal", "Legal")];

  function industriaInput() {
    return screen.getByPlaceholderText("Industria…") as HTMLInputElement;
  }

  it("las industrias del dato aparecen como sugerencias (datalist)", () => {
    render(<ClientsTable clients={clients} brands={[]} />);
    const opts = Array.from(document.querySelectorAll("#industria-opts option")).map((o) => (o as HTMLOptionElement).value);
    expect(opts).toContain("Tecnología");
    expect(opts).toContain("Legal");
  });

  it("escribir en la lupita filtra por inicio de palabra", async () => {
    const user = userEvent.setup();
    render(<ClientsTable clients={clients} brands={[]} />);
    // Antes de filtrar, ambos aparecen.
    expect(screen.getAllByText("AcmeTec").length).toBeGreaterThan(0);
    expect(screen.getAllByText("LexLegal").length).toBeGreaterThan(0);

    await user.type(industriaInput(), "Tecno");

    // Después: solo AcmeTec; LexLegal desaparece.
    expect(screen.getAllByText("AcmeTec").length).toBeGreaterThan(0);
    expect(screen.queryByText("LexLegal")).toBeNull();
  });

  it("sin filtros se ve todo (los filtros solo acotan)", () => {
    render(<ClientsTable clients={clients} brands={[]} />);
    expect(screen.getAllByText("AcmeTec").length).toBeGreaterThan(0);
    expect(screen.getAllByText("LexLegal").length).toBeGreaterThan(0);
  });
});
