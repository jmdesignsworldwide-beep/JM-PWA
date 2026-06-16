import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox } from "./combobox";
import { Dialog } from "./dialog";
import { INDUSTRIA_OPTIONS, CATEGORIA_OPTIONS } from "@/lib/ventas";

/** Harness: el Combobox DENTRO de un modal abierto (como "Nuevo cliente"). */
function ModalCombo({ options, placeholder }: { options: { value: string; label: string }[]; placeholder: string }) {
  const [val, setVal] = useState("");
  return (
    <Dialog open onClose={() => {}} title="Nuevo cliente">
      <Combobox options={options} value={val} onChange={setVal} placeholder={placeholder} />
      <span data-testid="val">{val}</span>
    </Dialog>
  );
}

describe("Combobox dentro de un modal", () => {
  it("Industria: abre, NO se cierra solo, muestra TODAS las opciones, busca y selecciona", async () => {
    const user = userEvent.setup();
    render(<ModalCombo options={INDUSTRIA_OPTIONS} placeholder="Buscar industria…" />);

    // Abrir el dropdown desde el trigger.
    await user.click(screen.getByRole("button", { name: /Buscar industria/ }));

    // Sigue abierto: el buscador está presente (antes se cerraba solo por el onBlur).
    expect(screen.getByPlaceholderText("Buscar…")).toBeTruthy();

    // TODAS las industrias están dentro del menú.
    for (const opt of INDUSTRIA_OPTIONS) {
      expect(screen.getByRole("button", { name: opt.label })).toBeTruthy();
    }
    expect(INDUSTRIA_OPTIONS).toHaveLength(20);

    // Buscar filtra.
    await user.type(screen.getByPlaceholderText("Buscar…"), "tecn");
    expect(screen.getByRole("button", { name: "Tecnología" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Automotriz" })).toBeNull();

    // Elegir una opción la selecciona.
    await user.click(screen.getByRole("button", { name: "Tecnología" }));
    expect(screen.getByTestId("val").textContent).toBe("Tecnología");
  });

  it("Categoría de servicio: las 4 opciones están dentro y se eligen", async () => {
    const user = userEvent.setup();
    render(<ModalCombo options={CATEGORIA_OPTIONS} placeholder="Elegir categoría" />);

    await user.click(screen.getByRole("button", { name: /Elegir categoría/ }));
    for (const label of ["Web", "Software", "App", "JM Distribution"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    await user.click(screen.getByRole("button", { name: "JM Distribution" }));
    expect(screen.getByTestId("val").textContent).toBe("distribution");
  });

  it("permanece abierto tras abrir (no auto-close por foco del buscador)", async () => {
    const user = userEvent.setup();
    render(<ModalCombo options={CATEGORIA_OPTIONS} placeholder="Elegir categoría" />);
    await user.click(screen.getByRole("button", { name: /Elegir categoría/ }));
    // El buscador toma foco (autoFocus). Verificamos que el menú NO se cerró.
    expect(document.activeElement).toBe(screen.getByPlaceholderText("Buscar…"));
    expect(screen.getByRole("button", { name: "Web" })).toBeTruthy();
  });

  it("regresión: sigue abierto pasados 250ms (el bug viejo cerraba a los 150ms)", async () => {
    const user = userEvent.setup();
    render(<ModalCombo options={CATEGORIA_OPTIONS} placeholder="Elegir categoría" />);
    await user.click(screen.getByRole("button", { name: /Elegir categoría/ }));
    await new Promise((r) => setTimeout(r, 250));
    // Con el onBlur+setTimeout(150) viejo, aquí ya estaría cerrado.
    expect(screen.getByPlaceholderText("Buscar…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "App" })).toBeTruthy();
  });
});
