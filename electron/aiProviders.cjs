const defaultBaseUrls = {
  anthropic: "https://api.anthropic.com",
  google: "https://generativelanguage.googleapis.com/v1beta",
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

const providerKinds = new Set(["openai", "anthropic", "google", "openrouter"]);

async function generateTailoringProposal(input, getSecret) {
  const request = validateProviderRequest(input);
  const apiKey = getSecret(request.providerId);

  if (!apiKey) {
    throw new Error("No provider key is saved for this provider.");
  }

  if (request.provider === "anthropic") {
    return callAnthropic(request, apiKey);
  }

  if (request.provider === "google") {
    return callGoogle(request, apiKey);
  }

  return callOpenAiCompatible(request, apiKey);
}

async function callOpenAiCompatible(request, apiKey) {
  const baseUrl = normalizeBaseUrl(
    request.baseUrl || defaultBaseUrls[request.provider],
  );
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(request.provider === "openrouter"
        ? {
            "HTTP-Referer": "https://github.com/Khvrram/resumeLab",
            "X-Title": "ResumeLab",
          }
        : {}),
    },
    body: JSON.stringify({
      max_tokens: 1800,
      messages: [
        { content: request.systemPrompt, role: "system" },
        { content: request.userPrompt, role: "user" },
      ],
      model: request.model,
      temperature: 0.2,
    }),
  });
  const json = await parseProviderJson(response);

  return {
    outputText: extractOpenAiCompatibleText(json),
    providerRequestId: getString(json.id),
    usage: {
      inputTokens: getNumber(json.usage?.prompt_tokens),
      outputTokens: getNumber(json.usage?.completion_tokens),
      totalTokens: getNumber(json.usage?.total_tokens),
    },
  };
}

async function callAnthropic(request, apiKey) {
  const baseUrl = normalizeBaseUrl(request.baseUrl || defaultBaseUrls.anthropic);
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      max_tokens: 1800,
      messages: [{ content: request.userPrompt, role: "user" }],
      model: request.model,
      system: request.systemPrompt,
      temperature: 0.2,
    }),
  });
  const json = await parseProviderJson(response);

  return {
    outputText: extractAnthropicText(json),
    providerRequestId: getString(json.id),
    usage: {
      inputTokens: getNumber(json.usage?.input_tokens),
      outputTokens: getNumber(json.usage?.output_tokens),
      totalTokens:
        getNumber(json.usage?.input_tokens) !== null &&
        getNumber(json.usage?.output_tokens) !== null
          ? getNumber(json.usage.input_tokens) + getNumber(json.usage.output_tokens)
          : null,
    },
  };
}

async function callGoogle(request, apiKey) {
  const baseUrl = normalizeBaseUrl(request.baseUrl || defaultBaseUrls.google);
  const model = encodeURIComponent(request.model);
  const response = await fetch(
    `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${request.systemPrompt}\n\n${request.userPrompt}`,
              },
            ],
            role: "user",
          },
        ],
        generationConfig: {
          maxOutputTokens: 1800,
          temperature: 0.2,
        },
      }),
    },
  );
  const json = await parseProviderJson(response);

  return {
    outputText: extractGoogleText(json),
    providerRequestId: getString(json.responseId),
    usage: {
      inputTokens: getNumber(json.usageMetadata?.promptTokenCount),
      outputTokens: getNumber(json.usageMetadata?.candidatesTokenCount),
      totalTokens: getNumber(json.usageMetadata?.totalTokenCount),
    },
  };
}

async function parseProviderJson(response) {
  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const message =
      json?.error?.message ||
      json?.error?.details ||
      json?.raw ||
      `Provider returned HTTP ${response.status}.`;
    const error = new Error(String(message));
    error.status = response.status;
    throw error;
  }

  return json;
}

function extractOpenAiCompatibleText(json) {
  const text = json?.choices?.[0]?.message?.content;

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Provider response did not include assistant text.");
  }

  return text;
}

function extractAnthropicText(json) {
  const text = json?.content
    ?.map((part) => (part?.type === "text" ? part.text : ""))
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic response did not include text content.");
  }

  return text;
}

function extractGoogleText(json) {
  const text = json?.candidates?.[0]?.content?.parts
    ?.map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Google response did not include text content.");
  }

  return text;
}

function validateProviderRequest(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Provider request is required.");
  }

  const provider = input.provider;

  if (!providerKinds.has(provider)) {
    throw new Error("Unsupported provider.");
  }

  return {
    baseUrl: optionalString(input.baseUrl),
    model: requiredString(input.model, "model"),
    provider,
    providerId: requiredString(input.providerId, "providerId"),
    systemPrompt: requiredString(input.systemPrompt, "systemPrompt"),
    userPrompt: requiredString(input.userPrompt, "userPrompt"),
  };
}

function normalizeBaseUrl(value) {
  return requiredString(value, "baseUrl").replace(/\/+$/, "");
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}

function optionalString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getString(value) {
  return typeof value === "string" ? value : null;
}

function getNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

module.exports = {
  generateTailoringProposal,
};
