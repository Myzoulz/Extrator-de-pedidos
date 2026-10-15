import type { Pedido } from "@/schemas/pedido";
import type { ProvedorError } from "@/lib/erros";

export const NOME_TOOL = "registrar_pedido";

export const SYSTEM_PROMPT = `Você extrai pedidos de delivery a partir de uma mensagem em texto livre escrita por um cliente.

Regras:
- Responda SEMPRE chamando a ferramenta "${NOME_TOOL}".
- Copie os valores como o cliente escreveu; não corrija nem reescreva nomes de itens.
- "2 x-burger" significa quantidade 2. Item sem quantidade conta como 1.
- Só preencha um campo quando a informação aparecer na mensagem; caso contrário use null.
- Nunca invente endereço, telefone, nome ou valores.
- "troco para 100" / "pago com 100" => troco = 100.
- formaPagamento: use "cartao" para crédito ou débito; "nao_informado" quando não houver menção.`;

export const DESCRICAO_TOOL =
  "Registra o pedido estruturado extraído da mensagem do cliente. " +
  "Chame esta ferramenta sempre, exatamente uma vez.";

export interface Uso {
  entrada: number;
  saida: number;
}

export interface SaidaProvedor {
  pedido: Pedido;
  uso: Uso | null;
}

/** Contrato que cada provedor de LLM (Anthropic, Gemini, ...) implementa. */
export interface ProvedorExtracao {
  readonly nome: string;
  readonly modelo: string;
  /** Faz uma única chamada à LLM e devolve o pedido já validado. */
  chamar(texto: string, signal?: AbortSignal): Promise<SaidaProvedor>;
  /** true para falhas que valem a pena repetir (timeout, rede, 429, 5xx). */
  ehErroTransitorio(erro: unknown): boolean;
  /** Converte um erro desconhecido do provedor em ProvedorError. */
  comoFalha(erro: unknown): ProvedorError;
}
