import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientsTable } from "./clients-table";
import { INDUSTRIAS } from "@/lib/ventas";
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

describe("Filtro de industria en la página de Clientes", () => {
  const clients = [client("AcmeTec", "Tecnología"), client("LexLegal", "Legal")];

  function industriaSelect() {
    const selects = screen.getAllByRole("combobox");
    const sel = selects.find((s) => within(s).queryByRole("option", { name: "Toda industria" }));
    if (!sel) throw new Error("No se encontró el filtro de industria");
    return sel as HTMLSelectElement;
  }

  it("el filtro tiene TODAS las industrias de la lista", () => {
    render(<ClientsTable clients={clients} brands={[]} />);
    const sel = industriaSelect();
    for (const ind of INDUSTRIAS) {
      expect(within(sel).getByRole("option", { name: ind })).toBeTruthy();
    }
  });

  it("elegir una industria filtra la lista a esos clientes", async () => {
    const user = userEvent.setup();
    render(<ClientsTable clients={clients} brands={[]} />);
    // Antes de filtrar, ambos aparecen.
    expect(screen.getAllByText("AcmeTec").length).toBeGreaterThan(0);
    expect(screen.getAllByText("LexLegal").length).toBeGreaterThan(0);

    await user.selectOptions(industriaSelect(), "Tecnología");

    // Después de filtrar por Tecnología: solo AcmeTec; LexLegal desaparece.
    expect(screen.getAllByText("AcmeTec").length).toBeGreaterThan(0);
    expect(screen.queryByText("LexLegal")).toBeNull();
  });
});
