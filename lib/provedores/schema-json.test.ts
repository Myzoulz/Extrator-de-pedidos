import { describe, expect, it } from "vitest";
import { schemaDaTool, schemaDaToolGemini } from "./schema-json";

describe("schemaDaTool", () => {
  it("remove o $schema e mantém o objeto raiz", () => {
    const json = schemaDaTool();
    expect(json.$schema).toBeUndefined();
    expect(json.type).toBe("object");
    expect(json.properties).toBeDefined();
  });
});

describe("schemaDaToolGemini", () => {
  const json = schemaDaToolGemini();

  it("não usa união de tipos (vira nullable) e não tem $schema/default", () => {
    const texto = JSON.stringify(json);
    expect(json.$schema).toBeUndefined();
    expect(texto).not.toContain('"default"');
    expect(texto).not.toContain('["string","null"]');
  });

  it("não tem exclusiveMinimum booleano nem additionalProperties", () => {
    const texto = JSON.stringify(json);
    expect(texto).not.toContain('"exclusiveMinimum":true');
    expect(texto).not.toContain('"exclusiveMinimum":false');
    expect(texto).not.toContain("additionalProperties");
  });

  it("marca campos anuláveis com nullable: true", () => {
    const propriedades = json.properties as Record<string, { nullable?: boolean }>;
    expect(propriedades.cliente.nullable).toBe(true);
  });
});
