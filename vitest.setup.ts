import { config } from "dotenv";

// Carrega ANTHROPIC_API_KEY (e outras variáveis) do .env.local para os testes,
// inclusive a suíte de avaliação.
config({ path: ".env.local", quiet: true });
