import { ProvedorError } from "@/lib/erros";
import { criarProvedorAnthropic } from "./anthropic";
import { criarProvedorGemini } from "./gemini";
import type { ProvedorExtracao } from "./tipos";

export type { ProvedorExtracao, SaidaProvedor, Uso } from "./tipos";
export { NOME_TOOL, SYSTEM_PROMPT } from "./tipos";

let cache: ProvedorExtracao | null = null;

/** Provedor selecionado via `LLM_PROVIDER` (padrão: anthropic). */
export function getProvedor(): ProvedorExtracao {
  if (cache) return cache;

  const escolhido = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  switch (escolhido) {
    case "anthropic":
      cache = criarProvedorAnthropic();
      break;
    case "gemini":
    case "google":
      cache = criarProvedorGemini();
      break;
    default:
      throw new ProvedorError(
        `LLM_PROVIDER desconhecido: "${escolhido}". Use "anthropic" ou "gemini".`,
      );
  }
  return cache;
}
