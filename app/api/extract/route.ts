import { z } from "zod";
import {
  EntradaInvalidaError,
  ProvedorError,
  SaidaInvalidaError,
  extrairPedido,
} from "@/lib/extrair-pedido";

export const maxDuration = 60;

const corpoSchema = z.object({
  texto: z.string().trim().min(1, "Envie uma mensagem de pedido.").max(4000),
});

function erro(mensagem: string, status: number, extra?: unknown) {
  return Response.json({ erro: mensagem, ...(extra ? { detalhes: extra } : {}) }, { status });
}

export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return erro("Corpo da requisição não é um JSON válido.", 400);
  }

  const entrada = corpoSchema.safeParse(corpo);
  if (!entrada.success) {
    return erro(
      entrada.error.issues[0]?.message ?? "Entrada inválida.",
      400,
      entrada.error.issues,
    );
  }

  try {
    const { pedido, tentativas, uso } = await extrairPedido(entrada.data.texto);
    return Response.json({ pedido, tentativas, uso });
  } catch (e) {
    if (e instanceof EntradaInvalidaError) {
      return erro(e.message, 400);
    }
    if (e instanceof SaidaInvalidaError) {
      return erro(e.message, 422, e.detalhes);
    }
    if (e instanceof ProvedorError) {
      const status = e.message.includes("não configurada") ? 500 : 502;
      return erro(e.message, status);
    }
    console.error("[extract] erro inesperado:", e);
    return erro("Erro inesperado ao extrair o pedido.", 500);
  }
}
