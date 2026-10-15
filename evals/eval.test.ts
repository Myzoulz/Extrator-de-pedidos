import { describe, expect, it } from "vitest";
import { rodarEvals } from "./rodar";

const provedor = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
const temChave =
  provedor === "gemini" || provedor === "google"
    ? Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY)
    : Boolean(process.env.ANTHROPIC_API_KEY);

describe.skipIf(!temChave)("avaliação do extrator de pedidos", () => {
  it(
    "roda a suíte de casos e imprime o % de acerto",
    async () => {
      const relatorio = await rodarEvals();
      console.log(relatorio.texto);
      expect(relatorio.totalCasos).toBeGreaterThan(0);
      expect(relatorio.totalComparacoes).toBeGreaterThan(0);
    },
    10 * 60_000,
  );
});
