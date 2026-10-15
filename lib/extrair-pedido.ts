import { EntradaInvalidaError, ProvedorError, SaidaInvalidaError } from "./erros";
import { getProvedor } from "./provedores";
import type { Pedido } from "@/schemas/pedido";

export { EntradaInvalidaError, ProvedorError, SaidaInvalidaError };

const MAX_TENTATIVAS = 2; // 1 tentativa + 1 retry
const TAMANHO_MAXIMO = 4000;

export interface ResultadoExtracao {
  pedido: Pedido;
  tentativas: number;
  uso: { entrada: number; saida: number } | null;
}

/**
 * Envia a mensagem ao provedor de LLM configurado (`LLM_PROVIDER`) usando tool
 * use forçado e devolve o pedido já validado pelo schema Zod. Faz no máximo uma
 * nova tentativa em falhas transitórias (timeout, rede, 429, 5xx).
 */
export async function extrairPedido(
  texto: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<ResultadoExtracao> {
  const entrada = texto?.trim() ?? "";
  if (entrada.length === 0) {
    throw new EntradaInvalidaError("A mensagem do pedido está vazia.");
  }
  if (entrada.length > TAMANHO_MAXIMO) {
    throw new EntradaInvalidaError(
      `A mensagem é longa demais (máx. ${TAMANHO_MAXIMO} caracteres).`,
    );
  }

  const provedor = getProvedor();
  let ultimoErro: unknown;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const { pedido, uso } = await provedor.chamar(entrada, opcoes.signal);
      return { pedido, tentativas: tentativa, uso };
    } catch (erro) {
      ultimoErro = erro;
      if (
        erro instanceof EntradaInvalidaError ||
        erro instanceof SaidaInvalidaError ||
        erro instanceof ProvedorError
      ) {
        throw erro;
      }
      if (tentativa < MAX_TENTATIVAS && provedor.ehErroTransitorio(erro)) {
        continue;
      }
      break;
    }
  }

  throw provedor.comoFalha(ultimoErro);
}
