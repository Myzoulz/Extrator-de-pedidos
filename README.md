# Extrator de pedidos com LLM

O usuário cola uma mensagem de pedido em texto livre (ex.: *"2 x-burger, rua das Flores 123 apto 4, pago no pix, obs: sem cebola"*) e recebe os dados estruturados em um **formulário editável**: cliente, telefone, endereço, itens (nome + quantidade + observação), forma de pagamento, troco e observações gerais.

A extração é feita com **tool use forçado**: o modelo sempre chama uma única ferramenta `registrar_pedido` cujo *input* é o **schema Zod** do pedido (`schemas/pedido.ts` — fonte única da verdade). A saída é revalidada pelo mesmo schema antes de chegar ao cliente; se for inválida, a API responde `422`.

## Provedores

Dá para usar **Google Gemini (grátis)** ou **Anthropic**, escolhido por `LLM_PROVIDER` no `.env.local`. O schema Zod é convertido no formato de cada um automaticamente:

- **Gemini** (`@google/genai`): `parametersJsonSchema` no formato OpenAPI 3.0 + `toolConfig.functionCallingConfig.mode = ANY` com `allowedFunctionNames: ["registrar_pedido"]`.
- **Anthropic** (`@anthropic-ai/sdk`): `tools` + `tool_choice: { type: "tool", name: "registrar_pedido" }`.

## Stack

- Next.js (App Router, TypeScript) + Tailwind v4
- `zod` (v4), `@google/genai`, `@anthropic-ai/sdk`, `vitest`
- Chaves em `.env.local`, usadas **só no servidor**

## Como rodar

```bash
npm install
```

1. Copie `.env.local.example` para `.env.local`.
2. Escolha o provedor e cole a chave:

   **Gemini (grátis, sem cartão):**
   - Crie a chave em https://aistudio.google.com/apikey (login Google).
   - No `.env.local`: `LLM_PROVIDER=gemini` e `GEMINI_API_KEY=...`

   **Anthropic (paga):**
   - Crie a chave em https://console.anthropic.com/settings/keys.
   - No `.env.local`: `LLM_PROVIDER=anthropic` e `ANTHROPIC_API_KEY=...`

3. Suba o app:

```bash
npm run dev
```

Abra http://localhost:3000, cole uma mensagem e clique em **Extrair**.

> Nota LGPD: os free tiers (Gemini/Groq) podem usar os prompts para treino. Os casos de avaliação já são anonimizados, mas evite colar dados reais de clientes.

## API

`POST /api/extract`

```json
{ "texto": "2 x-burger, rua das Flores 123, pago no pix" }
```

Resposta `200`:

```json
{ "pedido": { "cliente": null, "itens": [...], ... }, "tentativas": 1, "uso": { "entrada": 512, "saida": 96 } }
```

| Status | Quando |
| ------ | ------ |
| `400`  | corpo/JSON inválido ou mensagem vazia |
| `422`  | a LLM respondeu, mas a saída não bate com o schema |
| `500`  | chave do provedor ausente (`GEMINI_API_KEY`/`ANTHROPIC_API_KEY`) |
| `502`  | falha do provedor (rede, 429, 5xx) após 1 retry |

Cada chamada tem timeout de 20s e **no máximo 1 retry** em falhas transitórias
(no Gemini, `429` de limite diário não é repetido — ver "Cota do free tier").

## Avaliação

A suíte (`evals/casos.json`) contém ~24 mensagens anonimizadas (LGPD) com o resultado esperado, incluindo casos difíceis: abreviações (`2x xtudo`), itens sem quantidade, endereço incompleto, quantidade por extenso e mensagens sem forma de pagamento.

```bash
npm run eval      # roda a suíte de avaliação (chama a API; precisa de chave)
npm test          # suíte unitária — não chama API nenhuma
```

> `evals/eval.test.ts` é separado do `npm test` de propósito: rodar os testes
> não deve consumir cota da API.

O relatório traz o **acerto geral campo a campo**, o **acerto por campo** e a
lista de **casos com divergência**.

**Resultado do eval** (`GEMINI_MODEL=gemini-flash-lite-latest`, 24 casos):

- **Acerto geral (campo a campo): 95.5%**
- **Casos 100% corretos: 19/24 (79.2%)**
- Por campo: `cliente` 100%, `endereco.*` 100%, `formaPagamento` 100%,
  `telefone` 100%, `troco` 100%, `itens` **79.2% (19/24)**

Os 5 casos que ainda divergem falham só em `itens` e por rigidez do comparador
(exigência de nome idêntico, ex.: esperava `fritas`/`refrigerante` e o modelo
escreveu `porção de fritas`/`refrigerantes`) — não é extração quebrada.

### Cota do free tier

O Gemini free tier dá **~20 requisições/dia por modelo**. Com isso a suíte de
24 casos não cabe num único dia no modelo padrão — por isso o padrão é
`gemini-flash-lite-latest`, que tem cota suficiente. O provedor só repete
requisição quando o próprio Google devolve um `retryDelay` curto, para não
queimar cota com retry inútil de limite diário.

## Estrutura

```
schemas/pedido.ts          schema Zod do pedido (fonte única da verdade)
lib/erros.ts               erros compartilhados
lib/provedores/            adaptadores (anthropic, gemini) + seleção por env
lib/extrair-pedido.ts      valida a entrada, delega ao provedor, retry
app/api/extract/route.ts   rota POST /api/extract
app/components/            UI (textarea + formulário editável)
evals/                     casos + runner de avaliação
```
