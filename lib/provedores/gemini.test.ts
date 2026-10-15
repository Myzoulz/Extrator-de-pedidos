import { ApiError } from "@google/genai";
import { describe, expect, it } from "vitest";
import { ProvedorError } from "@/lib/erros";
import { criarProvedorGemini } from "./gemini";

const p = criarProvedorGemini();

describe("gemini: ehErroTransitorio", () => {
  it("não repete o 429 de cota diária (retryDelay longo)", () => {
    const erro = new ApiError({
      status: 429,
      message:
        '{"error":{"code":429,"message":"quota","status":"RESOURCE_EXHAUSTED","details":[{"retryDelay":"28966s"}]}}',
    });
    expect(p.ehErroTransitorio(erro)).toBe(false);
  });

  it("repete o 429 de limite de rajada (retryDelay curto)", () => {
    const erro = new ApiError({
      status: 429,
      message: '{"error":{"code":429,"details":[{"retryDelay":"5s"}]}}',
    });
    expect(p.ehErroTransitorio(erro)).toBe(true);
  });

  it("repete erro 5xx e timeout", () => {
    expect(p.ehErroTransitorio(new ApiError({ status: 503, message: "x" }))).toBe(
      true,
    );
    expect(p.ehErroTransitorio(new TypeError("timeout"))).toBe(true);
  });

  it("não repete 4xx de requisição inválida", () => {
    expect(p.ehErroTransitorio(new ApiError({ status: 404, message: "x" }))).toBe(
      false,
    );
    expect(p.ehErroTransitorio(new ProvedorError("falta chave"))).toBe(false);
  });

  it("comoFalha preserva o status", () => {
    const falha = p.comoFalha(new ApiError({ status: 500, message: "boom" }));
    expect(falha).toBeInstanceOf(ProvedorError);
    expect(falha.status).toBe(500);
    expect(falha.message).toContain("500");
  });
});
