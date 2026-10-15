import casosJson from "./casos.json";
import { type Endereco, type Pedido } from "@/schemas/pedido";
import { extrairPedido } from "@/lib/extrair-pedido";

interface ItemEsperado {
  nome: string;
  quantidade?: number;
  observacao?: string | null;
}

interface PedidoEsperado {
  cliente?: string | null;
  telefone?: string | null;
  observacoes?: string | null;
  endereco?: Partial<Endereco>;
  itens?: ItemEsperado[];
  formaPagamento?: Pedido["formaPagamento"];
  troco?: number | null;
}

interface Caso {
  id: string;
  entrada: string;
  esperado: PedidoEsperado;
}

const CASOS = casosJson as Caso[];

const CAMPOS_ENDERECO = [
  "rua",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "referencia",
] as const;

export function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function iguais(esperado: string | null, obtido: string | null | undefined): boolean {
  if (esperado === null) return obtido === null || obtido === undefined || obtido === "";
  if (obtido === null || obtido === undefined) return false;
  return normalizar(esperado) === normalizar(obtido);
}

function itensOk(
  esperados: Caso["esperado"]["itens"],
  obtidos: Pedido["itens"] | undefined,
): boolean {
  if (!esperados || esperados.length === 0) return true;
  const restantes = (obtidos ?? []).map((i) => ({
    nome: normalizar(i.nome),
    quantidade: i.quantidade,
  }));
  for (const esperado of esperados) {
    const alvo = normalizar(esperado.nome);
    const indice = restantes.findIndex(
      (o) =>
        o.nome === alvo &&
        (esperado.quantidade === undefined || o.quantidade === esperado.quantidade),
    );
    if (indice === -1) return false;
    restantes.splice(indice, 1);
  }
  return true;
}

export interface Comparacao {
  campo: string;
  ok: boolean;
}

export function compararCaso(
  esperado: Caso["esperado"],
  obtido: Pedido | null,
): Comparacao[] {
  const resultado: Comparacao[] = [];

  for (const campo of ["cliente", "telefone", "observacoes"] as const) {
    if (campo in esperado) {
      resultado.push({ campo, ok: iguais(esperado[campo] ?? null, obtido?.[campo]) });
    }
  }

  if (esperado.endereco) {
    for (const sub of CAMPOS_ENDERECO) {
      if (sub in esperado.endereco) {
        resultado.push({
          campo: `endereco.${sub}`,
          ok: iguais(esperado.endereco[sub] ?? null, obtido?.endereco?.[sub]),
        });
      }
    }
  }

  if ("formaPagamento" in esperado) {
    resultado.push({
      campo: "formaPagamento",
      ok: esperado.formaPagamento === obtido?.formaPagamento,
    });
  }

  if ("troco" in esperado) {
    resultado.push({ campo: "troco", ok: esperado.troco === obtido?.troco });
  }

  if ("itens" in esperado) {
    resultado.push({ campo: "itens", ok: itensOk(esperado.itens, obtido?.itens) });
  }

  return resultado;
}

export interface ResultadoCaso {
  id: string;
  erro?: string;
  comparacoes: Comparacao[];
}

export interface Relatorio {
  totalCasos: number;
  casosCompletos: number;
  totalComparacoes: number;
  totalAcertos: number;
  acertoGeral: number;
  porCampo: { campo: string; acertos: number; total: number; taxa: number }[];
  casos: ResultadoCaso[];
  texto: string;
}

function pct(parte: number, todo: number): number {
  return todo === 0 ? 1 : parte / todo;
}

export async function rodarEvals(): Promise<Relatorio> {
  const resultados: ResultadoCaso[] = [];

  for (const caso of CASOS) {
    let pedido: Pedido | null = null;
    let erro: string | undefined;
    try {
      const { pedido: extraido } = await extrairPedido(caso.entrada);
      pedido = extraido;
    } catch (e) {
      erro = e instanceof Error ? e.message : String(e);
    }
    resultados.push({
      id: caso.id,
      erro,
      comparacoes: compararCaso(caso.esperado, pedido),
    });
  }

  const acumulado = new Map<string, { acertos: number; total: number }>();
  let totalComparacoes = 0;
  let totalAcertos = 0;
  let casosCompletos = 0;

  for (const r of resultados) {
    if (r.comparacoes.every((c) => c.ok)) casosCompletos++;
    for (const c of r.comparacoes) {
      const atual = acumulado.get(c.campo) ?? { acertos: 0, total: 0 };
      atual.total++;
      if (c.ok) atual.acertos++;
      acumulado.set(c.campo, atual);
      totalComparacoes++;
      if (c.ok) totalAcertos++;
    }
  }

  const porCampo = [...acumulado.entries()]
    .map(([campo, v]) => ({ campo, ...v, taxa: pct(v.acertos, v.total) }))
    .sort((a, b) => a.campo.localeCompare(b.campo));

  const acertoGeral = pct(totalAcertos, totalComparacoes);

  const linhas: string[] = [];
  linhas.push("");
  linhas.push("Avaliação do extrator de pedidos");
  linhas.push("=".repeat(40));
  linhas.push(`Casos: ${CASOS.length}`);
  linhas.push(`Acerto geral (campo a campo): ${(acertoGeral * 100).toFixed(1)}%`);
  linhas.push(
    `Casos 100% corretos: ${casosCompletos}/${CASOS.length} (${(
      pct(casosCompletos, CASOS.length) * 100
    ).toFixed(1)}%)`,
  );
  linhas.push("");
  linhas.push("Acerto por campo:");
  for (const c of porCampo) {
    linhas.push(
      `  ${c.campo.padEnd(20)} ${(c.taxa * 100).toFixed(1).padStart(5)}%  (${c.acertos}/${c.total})`,
    );
  }

  const comErro = resultados.filter((r) => r.erro);
  if (comErro.length > 0) {
    linhas.push("");
    linhas.push("Casos com erro de extração:");
    for (const r of comErro) linhas.push(`  - ${r.id}: ${r.erro}`);
  }

  const comDivergencia = resultados.filter(
    (r) => !r.erro && r.comparacoes.some((c) => !c.ok),
  );
  if (comDivergencia.length > 0) {
    linhas.push("");
    linhas.push("Casos com divergência:");
    for (const r of comDivergencia) {
      const campos = r.comparacoes
        .filter((c) => !c.ok)
        .map((c) => c.campo)
        .join(", ");
      linhas.push(`  - ${r.id}: ${campos}`);
    }
  }
  linhas.push("");

  return {
    totalCasos: CASOS.length,
    casosCompletos,
    totalComparacoes,
    totalAcertos,
    acertoGeral,
    porCampo,
    casos: resultados,
    texto: linhas.join("\n"),
  };
}
