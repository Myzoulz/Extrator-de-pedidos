import { describe, expect, it } from "vitest";
import { compararCaso, normalizar } from "./rodar";
import type { Pedido } from "@/schemas/pedido";

const pedidoBase: Pedido = {
  cliente: "Ana",
  telefone: null,
  endereco: {
    rua: "Rua das Flores",
    numero: "123",
    complemento: "apto 4",
    bairro: null,
    cidade: null,
    referencia: null,
  },
  itens: [
    { nome: "x-burger", quantidade: 2, observacao: null },
    { nome: "coca lata", quantidade: 1, observacao: null },
  ],
  formaPagamento: "pix",
  troco: null,
  observacoes: null,
};

describe("normalizar", () => {
  it("ignora acentos, caixa e espaços", () => {
    expect(normalizar("  X-BÚrger  ")).toBe("x-burger");
  });
});

describe("compararCaso", () => {
  it("marca tudo certo quando o pedido bate", () => {
    const comparacoes = compararCaso(
      {
        cliente: "ana",
        endereco: { rua: "rua das flores", numero: "123" },
        itens: [
          { nome: "x-burger", quantidade: 2 },
          { nome: "coca lata", quantidade: 1 },
        ],
        formaPagamento: "pix",
      },
      pedidoBase,
    );
    expect(comparacoes.every((c) => c.ok)).toBe(true);
  });

  it("detecta campos errados", () => {
    const comparacoes = compararCaso(
      { cliente: "Bruno", itens: [{ nome: "pizza" }] },
      pedidoBase,
    );
    const porCampo = Object.fromEntries(comparacoes.map((c) => [c.campo, c.ok]));
    expect(porCampo.cliente).toBe(false);
    expect(porCampo.itens).toBe(false);
  });

  it("aceita item previsto sem quantidade declarada", () => {
    const comparacoes = compararCaso(
      { itens: [{ nome: "x-burger" }] },
      pedidoBase,
    );
    expect(comparacoes[0].ok).toBe(true);
  });
});
