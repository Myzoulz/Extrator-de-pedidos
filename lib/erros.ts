import type { z } from "zod";

/** Erro de dado de entrada (mensagem vazia/inválida). */
export class EntradaInvalidaError extends Error {}

/** A LLM respondeu, mas a saída não bateu com o schema do pedido. */
export class SaidaInvalidaError extends Error {
  constructor(
    message: string,
    readonly detalhes: z.ZodIssue[] = [],
  ) {
    super(message);
    this.name = "SaidaInvalidaError";
  }
}

/** Falha do provedor (configuração ausente, rede, 429, 5xx). */
export class ProvedorError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProvedorError";
  }
}
