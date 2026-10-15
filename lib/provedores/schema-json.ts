import { z } from "zod";
import { pedidoSchema } from "@/schemas/pedido";

function semDefaults(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(semDefaults);
  if (valor && typeof valor === "object") {
    const entrada = valor as Record<string, unknown>;
    const saida: Record<string, unknown> = {};
    for (const [chave, v] of Object.entries(entrada)) {
      if (chave === "default") continue;
      saida[chave] = semDefaults(v);
    }
    return saida;
  }
  return valor;
}

/**
 * O target OpenAPI 3.0 do Zod gera limites exclusivos no formato booleano
 * (`exclusiveMinimum: true` + `minimum: 0`). O Gemini exige que
 * `exclusiveMinimum`/`exclusiveMaximum` sejam números, então convertemos.
 * Também removemos `additionalProperties`, que a API do Gemini não aceita.
 */
function normalizarParaGemini(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(normalizarParaGemini);
  if (valor && typeof valor === "object") {
    const obj = valor as Record<string, unknown>;

    if (typeof obj.exclusiveMinimum === "boolean") {
      if (obj.exclusiveMinimum && typeof obj.minimum === "number") {
        obj.exclusiveMinimum = obj.minimum;
        delete obj.minimum;
      } else {
        delete obj.exclusiveMinimum;
      }
    }
    if (typeof obj.exclusiveMaximum === "boolean") {
      if (obj.exclusiveMaximum && typeof obj.maximum === "number") {
        obj.exclusiveMaximum = obj.maximum;
        delete obj.maximum;
      } else {
        delete obj.exclusiveMaximum;
      }
    }
    delete obj.additionalProperties;

    for (const [chave, v] of Object.entries(obj)) {
      obj[chave] = normalizarParaGemini(v);
    }
    return obj;
  }
  return valor;
}

/** JSON Schema (Draft 2020-12) usado pela tool da Anthropic. */
export function schemaDaTool(): Record<string, unknown> {
  const json = z.toJSONSchema(pedidoSchema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/**
 * JSON Schema no formato OpenAPI 3.0 para as function declarations do Gemini:
 * `type: ["string","null"]` vira `nullable: true`, e os `default` são removidos
 * (os defaults já são tratados no parse do Zod).
 */
export function schemaDaToolGemini(): Record<string, unknown> {
  const json = z.toJSONSchema(pedidoSchema, {
    target: "openapi-3.0",
  }) as Record<string, unknown>;
  delete json.$schema;
  return normalizarParaGemini(semDefaults(json)) as Record<string, unknown>;
}
