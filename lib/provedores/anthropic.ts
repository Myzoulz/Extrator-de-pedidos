import Anthropic from "@anthropic-ai/sdk";
import { pedidoSchema } from "@/schemas/pedido";
import { ProvedorError, SaidaInvalidaError } from "@/lib/erros";
import { schemaDaTool } from "./schema-json";
import {
  DESCRICAO_TOOL,
  NOME_TOOL,
  SYSTEM_PROMPT,
  type ProvedorExtracao,
  type SaidaProvedor,
} from "./tipos";

const TIMEOUT_MS = Number(process.env.EXTRACT_TIMEOUT_MS ?? 20_000);

export function criarProvedorAnthropic(): ProvedorExtracao {
  const modelo = process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest";
  let cliente: Anthropic | null = null;

  function getCliente(): Anthropic {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ProvedorError(
        "ANTHROPIC_API_KEY não configurada. Defina a variável no .env.local.",
      );
    }
    if (!cliente) {
      cliente = new Anthropic({ apiKey, maxRetries: 0 });
    }
    return cliente;
  }

  const tools: Anthropic.Messages.Tool[] = [
    {
      name: NOME_TOOL,
      description: DESCRICAO_TOOL,
      input_schema: schemaDaTool() as Anthropic.Messages.Tool.InputSchema,
    },
  ];

  return {
    nome: "anthropic",
    modelo,

    async chamar(texto, signal): Promise<SaidaProvedor> {
      const resposta = await getCliente().messages.create(
        {
          model: modelo,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools,
          tool_choice: { type: "tool", name: NOME_TOOL },
          messages: [{ role: "user", content: texto }],
        },
        { timeout: TIMEOUT_MS, signal },
      );

      const bloco = resposta.content.find(
        (c): c is Anthropic.Messages.ToolUseBlock => c.type === "tool_use",
      );
      if (!bloco) {
        throw new SaidaInvalidaError(
          "O modelo não retornou a chamada da ferramenta de pedido.",
        );
      }

      const validado = pedidoSchema.safeParse(bloco.input);
      if (!validado.success) {
        throw new SaidaInvalidaError(
          "A saída do modelo não corresponde ao schema do pedido.",
          validado.error.issues,
        );
      }

      return {
        pedido: validado.data,
        uso: resposta.usage
          ? {
              entrada: resposta.usage.input_tokens,
              saida: resposta.usage.output_tokens,
            }
          : null,
      };
    },

    ehErroTransitorio(erro) {
      if (erro instanceof ProvedorError) return false;
      if (erro instanceof Anthropic.APIError) {
        return (
          erro.status === 429 || erro.status === undefined || erro.status >= 500
        );
      }
      return (
        erro instanceof Anthropic.APIConnectionTimeoutError ||
        erro instanceof Anthropic.APIConnectionError
      );
    },

    comoFalha(erro) {
      if (erro instanceof ProvedorError) return erro;
      if (erro instanceof Anthropic.APIError) {
        return new ProvedorError(
          `Falha na API da Anthropic (${erro.status ?? "sem status"}): ${erro.message}`,
          erro.status ?? undefined,
        );
      }
      return new ProvedorError(
        `Não foi possível extrair o pedido (anthropic): ${
          erro instanceof Error ? erro.message : String(erro)
        }`,
      );
    },
  };
}
