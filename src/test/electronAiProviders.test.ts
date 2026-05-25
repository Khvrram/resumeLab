import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { generateTailoringProposal } = require("../../electron/aiProviders.cjs") as {
  generateTailoringProposal: (
    input: unknown,
    getSecret: (providerId: string) => string | null,
  ) => Promise<{
    outputText: string;
    providerRequestId: string | null;
    usage: {
      inputTokens: number | null;
      outputTokens: number | null;
      totalTokens: number | null;
    };
  }>;
};

describe("electron ai provider adapters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls OpenAI-compatible providers without exposing the secret", async () => {
    const fetcher = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "{\"revisedResumeText\":\"SUMMARY\\nReact engineer\"}",
              },
            },
          ],
          id: "chatcmpl_test",
          usage: {
            completion_tokens: 7,
            prompt_tokens: 11,
            total_tokens: 18,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetcher);

    const result = await generateTailoringProposal(
      {
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-test",
        provider: "openai",
        providerId: "provider_openai",
        systemPrompt: "System",
        userPrompt: "User",
      },
      () => "sk-test-secret",
    );
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;

    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(headers.Authorization).toBe("Bearer sk-test-secret");
    expect(JSON.stringify(result)).not.toContain("sk-test-secret");
    expect(result.outputText).toContain("React engineer");
    expect(result.usage.totalTokens).toBe(18);
  });

  it("returns provider errors clearly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { message: "invalid key" } }), {
          status: 401,
        }),
      ),
    );

    await expect(
      generateTailoringProposal(
        {
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-test",
          provider: "openai",
          providerId: "provider_openai",
          systemPrompt: "System",
          userPrompt: "User",
        },
        () => "sk-test-secret",
      ),
    ).rejects.toThrow("invalid key");
  });
});
