import { ApiError, FunctionCallingConfigMode, GoogleGenAI } from "@google/genai";
import { pedidoSchema } from "@/schemas/pedido";
import { ProvedorError, SaidaInvalidaError } from "@/lib/erros";
import { schemaDaToolGemini } from "./schema-json";
import {
  DESCRICAO_TOOL,
  NOME_TOOL,
  SYSTEM_PROMPT,
  type ProvedorExtracao,
  type SaidaProvedor,
} from "./tipos";

const TIMEOUT_MS = Number(process.env.EXTRACT_TIMEOUT_MS ?? 20_000);

/** Lê o `retryDelay` (em segundos) que o Google devolve dentro do 429. */
function segundosDeRetry(mensagem: string): number | null {
  const m = mensagem.match(/"retryDelay":"(\d+)s"/);
  return m ? Number(m[1]) : null;
}

export function criarProvedorGemini(): ProvedorExtracao {
  const modelo = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";
  let cliente: GoogleGenAI | null = null;

  function getCliente(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new ProvedorError(
        "GEMINI_API_KEY não configurada. Defina a variável no .env.local.",
      );
    }
    if (!cliente) {
      cliente = new GoogleGenAI({ apiKey });
    }
    return cliente;
  }

  return {
    nome: "gemini",
    modelo,

    async chamar(texto, signal): Promise<SaidaProvedor> {
      const ai = getCliente();

      const resposta = await ai.models.generateContent({
        model: modelo,
        contents: texto,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [
            {
              functionDeclarations: [
                {
                  name: NOME_TOOL,
                  description: DESCRICAO_TOOL,
                  parametersJsonSchema: schemaDaToolGemini(),
                },
              ],
            },
          ],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.ANY,
              allowedFunctionNames: [NOME_TOOL],
            },
          },
          httpOptions: { timeout: TIMEOUT_MS },
          abortSignal: signal,
        },
      });

      const chamada = resposta.functionCalls?.[0];
      if (!chamada) {
        throw new SaidaInvalidaError(
          "O modelo não retornou a chamada da ferramenta de pedido.",
        );
      }

      const validado = pedidoSchema.safeParse(chamada.args);
      if (!validado.success) {
        throw new SaidaInvalidaError(
          "A saída do modelo não corresponde ao schema do pedido.",
          validado.error.issues,
        );
      }

      const uso = resposta.usageMetadata;
      return {
        pedido: validado.data,
        uso: uso
          ? {
              entrada: uso.promptTokenCount ?? 0,
              saida: uso.candidatesTokenCount ?? 0,
            }
          : null,
      };
    },

    ehErroTransitorio(erro) {
      if (erro instanceof ProvedorError) return false;
      if (erro instanceof ApiError) {
        if (erro.status === 429) {
          // Só repete se o próprio Google disser que é uma espera curta.
          // No free tier o limite é diário (20/dia por modelo) e repetir na
          // hora só queima cota sem conseguir voltar a responder.
          const espera = segundosDeRetry(erro.message);
          return espera === null ? false : espera <= 10;
        }
        return erro.status === undefined || erro.status >= 500;
      }
      // erros de rede/fetch não têm status
      return erro instanceof Error;
    },

    comoFalha(erro) {
      if (erro instanceof ProvedorError) return erro;
      if (erro instanceof ApiError) {
        return new ProvedorError(
          `Falha na API do Gemini (${erro.status}): ${erro.message}`,
          erro.status,
        );
      }
      return new ProvedorError(
        `Não foi possível extrair o pedido (gemini): ${
          erro instanceof Error ? erro.message : String(erro)
        }`,
      );
    },
  };
}
