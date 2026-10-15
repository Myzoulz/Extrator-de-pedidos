import { describe, expect, it } from "vitest";
import { EntradaInvalidaError, extrairPedido } from "@/lib/extrair-pedido";

describe("extrairPedido - validação de entrada", () => {
  it("rejeita mensagem vazia antes de chamar a API", async () => {
    await expect(extrairPedido("   ")).rejects.toBeInstanceOf(EntradaInvalidaError);
  });

  it("rejeita mensagem longa demais", async () => {
    await expect(extrairPedido("a".repeat(4001))).rejects.toBeInstanceOf(
      EntradaInvalidaError,
    );
  });
});
