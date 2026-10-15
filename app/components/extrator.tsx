"use client";

import { useState } from "react";
import {
  FORMAS_PAGAMENTO,
  type Endereco,
  type Item,
  type Pedido,
} from "@/schemas/pedido";

const EXEMPLO =
  "Boa noite! Queria 2 x-burger e 1 coca lata. Entrega na rua das Flores 123, apto 4, centro. Pago no pix. Obs: um dos burgers sem cebola. Meu nome é Ana, tel 11 90000-0000";

const ROTULO_PAGAMENTO: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  outro: "Outro",
  nao_informado: "Não informado",
};

const ROTULO_ENDERECO: Record<keyof Endereco, string> = {
  rua: "Rua",
  numero: "Número",
  complemento: "Complemento",
  bairro: "Bairro",
  cidade: "Cidade",
  referencia: "Referência",
};

function Campo({
  rotulo,
  valor,
  onChange,
  placeholder,
}: {
  rotulo: string;
  valor: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-600 dark:text-zinc-400">{rotulo}</span>
      <input
        value={valor ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-300"
      />
    </label>
  );
}

export default function Extrator() {
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function extrair() {
    setCarregando(true);
    setErro(null);
    setCopiado(false);
    try {
      const resposta = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados?.erro ?? `Falha na extração (HTTP ${resposta.status}).`);
        setPedido(null);
        return;
      }
      setPedido(dados.pedido as Pedido);
    } catch (e) {
      setErro(
        e instanceof Error ? `Erro de rede: ${e.message}` : "Erro inesperado.",
      );
      setPedido(null);
    } finally {
      setCarregando(false);
    }
  }

  function atualizarEndereco(campo: keyof Endereco, valor: string | null) {
    setPedido((p) => (p ? { ...p, endereco: { ...p.endereco, [campo]: valor } } : p));
  }

  function atualizarItem(indice: number, patch: Partial<Item>) {
    setPedido((p) => {
      if (!p) return p;
      const itens = p.itens.map((it, i) => (i === indice ? { ...it, ...patch } : it));
      return { ...p, itens };
    });
  }

  function adicionarItem() {
    setPedido((p) =>
      p
        ? {
            ...p,
            itens: [...p.itens, { nome: "", quantidade: 1, observacao: null }],
          }
        : p,
    );
  }

  function removerItem(indice: number) {
    setPedido((p) =>
      p ? { ...p, itens: p.itens.filter((_, i) => i !== indice) } : p,
    );
  }

  async function copiarJson() {
    if (!pedido) return;
    await navigator.clipboard.writeText(JSON.stringify(pedido, null, 2));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Extrator de pedidos</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Cole a mensagem do cliente em texto livre e receba o pedido estruturado,
          editável.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={5}
          placeholder={EXEMPLO}
          className="w-full resize-y rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-300"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={extrair}
            disabled={carregando || texto.trim() === ""}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {carregando ? "Extraindo…" : "Extrair"}
          </button>
          <button
            onClick={() => {
              setTexto(EXEMPLO);
              setErro(null);
            }}
            className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          >
            usar exemplo
          </button>
        </div>
      </section>

      {erro && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {erro}
        </div>
      )}

      {pedido && (
        <section className="flex flex-col gap-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Pedido extraído</h2>
            <button
              onClick={copiarJson}
              className="text-sm text-zinc-500 underline-offset-4 hover:underline"
            >
              {copiado ? "copiado!" : "copiar JSON"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Cliente"
              valor={pedido.cliente}
              onChange={(v) => setPedido({ ...pedido, cliente: v })}
            />
            <Campo
              rotulo="Telefone"
              valor={pedido.telefone}
              onChange={(v) => setPedido({ ...pedido, telefone: v })}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Endereço
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(Object.keys(ROTULO_ENDERECO) as (keyof Endereco)[]).map((campo) => (
                <Campo
                  key={campo}
                  rotulo={ROTULO_ENDERECO[campo]}
                  valor={pedido.endereco[campo]}
                  onChange={(v) => atualizarEndereco(campo, v)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Itens
              </h3>
              <button
                onClick={adicionarItem}
                className="text-sm text-zinc-500 underline-offset-4 hover:underline"
              >
                + item
              </button>
            </div>
            {pedido.itens.length === 0 && (
              <p className="text-sm text-zinc-500">Nenhum item identificado.</p>
            )}
            {pedido.itens.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-12 items-end gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900"
              >
                <div className="col-span-12 sm:col-span-6">
                  <Campo
                    rotulo="Item"
                    valor={item.nome}
                    onChange={(v) => atualizarItem(i, { nome: v ?? "" })}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-zinc-600 dark:text-zinc-400">
                      Qtd.
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) =>
                        atualizarItem(i, {
                          quantidade: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </label>
                </div>
                <div className="col-span-8 sm:col-span-3">
                  <Campo
                    rotulo="Obs."
                    valor={item.observacao}
                    onChange={(v) => atualizarItem(i, { observacao: v })}
                  />
                </div>
                <div className="col-span-12 sm:col-span-1">
                  <button
                    onClick={() => removerItem(i)}
                    aria-label={`Remover ${item.nome || "item"}`}
                    className="w-full rounded-lg border border-zinc-300 py-2 text-sm text-zinc-500 hover:border-red-400 hover:text-red-600 dark:border-zinc-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                Forma de pagamento
              </span>
              <select
                value={pedido.formaPagamento}
                onChange={(e) =>
                  setPedido({
                    ...pedido,
                    formaPagamento: e.target.value as Pedido["formaPagamento"],
                  })
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>
                    {ROTULO_PAGAMENTO[f]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                Troco (R$)
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={pedido.troco ?? ""}
                onChange={(e) =>
                  setPedido({
                    ...pedido,
                    troco: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">
              Observações
            </span>
            <textarea
              value={pedido.observacoes ?? ""}
              onChange={(e) =>
                setPedido({
                  ...pedido,
                  observacoes: e.target.value === "" ? null : e.target.value,
                })
              }
              rows={2}
              className="w-full resize-y rounded-lg border border-zinc-300 bg-white p-3 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
        </section>
      )}
    </div>
  );
}
