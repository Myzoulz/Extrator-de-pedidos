import { z } from "zod";

/**
 * Fonte única da verdade do pedido.
 *
 * Todo o resto (schema da tool enviado ao Claude, validação da saída da API e
 * formulário da UI) é derivado ou validado a partir daqui.
 */

export const FORMAS_PAGAMENTO = [
  "pix",
  "dinheiro",
  "cartao",
  "outro",
  "nao_informado",
] as const;

export const formaPagamentoSchema = z
  .enum(FORMAS_PAGAMENTO)
  .describe(
    "Forma de pagamento. Use 'cartao' para crédito ou débito, 'outro' para " +
      "qualquer outra e 'nao_informado' quando o cliente não mencionar.",
  );

export const enderecoSchema = z
  .object({
    rua: z.string().nullable().default(null).describe("Logradouro, sem número."),
    numero: z
      .string()
      .nullable()
      .default(null)
      .describe("Número do imóvel, como texto (pode ser 's/n')."),
    complemento: z
      .string()
      .nullable()
      .default(null)
      .describe("Apto, bloco, casa, fundos etc."),
    bairro: z.string().nullable().default(null),
    cidade: z.string().nullable().default(null),
    referencia: z
      .string()
      .nullable()
      .default(null)
      .describe("Ponto de referência informado pelo cliente."),
  })
  .default({
    rua: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,
    referencia: null,
  })
  .describe("Endereço de entrega. Preencha só o que aparecer na mensagem.");

export const itemSchema = z
  .object({
    nome: z.string().min(1).describe("Nome do item, como o cliente escreveu."),
    quantidade: z
      .number()
      .int()
      .min(1)
      .default(1)
      .describe("Quantidade. Quando não for dita, use 1."),
    observacao: z
      .string()
      .nullable()
      .default(null)
      .describe("Observação específica do item (ex.: 'sem cebola')."),
  })
  .describe("Um item do pedido.");

export const pedidoSchema = z
  .object({
    cliente: z
      .string()
      .nullable()
      .default(null)
      .describe("Nome do cliente, se citado."),
    telefone: z
      .string()
      .nullable()
      .default(null)
      .describe("Telefone de contato, se citado."),
    endereco: enderecoSchema,
    itens: z.array(itemSchema).default([]).describe("Lista de itens do pedido."),
    formaPagamento: formaPagamentoSchema.default("nao_informado"),
    troco: z
      .number()
      .nullable()
      .default(null)
      .describe(
        "Valor para troco em reais (ex.: cliente paga com R$ 100, informe 100). " +
          "Null quando não se aplica ou não foi dito.",
      ),
    observacoes: z
      .string()
      .nullable()
      .default(null)
      .describe("Observações gerais do pedido, fora dos itens."),
  })
  .describe("Pedido estruturado extraído de uma mensagem em texto livre.");

export type Pedido = z.infer<typeof pedidoSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Endereco = z.infer<typeof enderecoSchema>;
export type FormaPagamento = z.infer<typeof formaPagamentoSchema>;
