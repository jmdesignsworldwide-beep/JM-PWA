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

describe("Multi-marca: categorías por marca (tipo Tire center)", () => {
  const brands = [{ id: "designs", nombre: "JM Designs" }, { id: "distri", nombre: "JM Distribution" }];
  // Un solo cliente que compró web (Designs) Y gorras (Distribution).
  const tire = [client("Tire center", "Automotriz")];
  const aggregates = {
    "Tire center": {
      brandIds: ["designs", "distri"],
      pairs: [
        { brand: "designs", cat: "Sitio web" },
        { brand: "distri", cat: "Gorras" },
      ],
      industrias: ["Automotriz"],
    },
  };

  function marcaSelect() {
    return screen.getByLabelText("Marca") as HTMLSelectElement;
  }
  function categoriaSelect() {
    return screen.getByLabelText("Categoría") as HTMLSelectElement;
  }

  it("al elegir una marca, la categoría solo ofrece lo de esa marca", async () => {
    const user = userEvent.setup();
    render(<ClientsTable clients={tire} brands={brands} aggregates={aggregates} />);

    await user.selectOptions(marcaSelect(), "distri");
    const opts = Array.from(categoriaSelect().querySelectorAll("option")).map((o) => o.textContent);
    expect(opts).toContain("Gorras");
    expect(opts).not.toContain("Sitio web");
  });

  it("aparece al filtrar por CUALQUIERA de sus marcas", async () => {
    const user = userEvent.setup();
    render(<ClientsTable clients={tire} brands={brands} aggregates={aggregates} />);

    await user.selectOptions(marcaSelect(), "designs");
    expect(screen.getAllByText("Tire center").length).toBeGreaterThan(0);

    await user.selectOptions(marcaSelect(), "distri");
    expect(screen.getAllByText("Tire center").length).toBeGreaterThan(0);
  });
});
