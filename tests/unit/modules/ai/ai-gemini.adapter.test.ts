import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiError,
  BlockedReason,
  FinishReason,
  type GenerateContentResponse,
} from "@google/genai";
import AppError from "../../../../src/app/shared/errors/AppError";
import {
  createGeminiAiProvider,
  createGeminiClientOptions,
  isVerifiedTransportFailure,
} from "../../../../src/app/module/ai/ai-gemini.adapter";

const response = (value: Partial<GenerateContentResponse>) =>
  value as GenerateContentResponse;

const invokeRejectedProvider = (error: unknown) => {
  const provider = createGeminiAiProvider({
    model: "test",
    generator: {
      async generateContent() {
        throw error;
      },
    },
  });
  return provider.generateStructured({
    systemInstruction: "s",
    userContent: "u",
    responseSchema: {},
    maxOutputTokens: 1,
  });
};

test("Gemini client configuration uses a 15-second timeout and no retries", () => {
  const options = createGeminiClientOptions("dummy-key");
  assert.equal(options.httpOptions?.timeout, 15_000);
  assert.equal(options.httpOptions?.retryOptions?.attempts, 1);
});

test("Gemini adapter sends structured configuration and parses JSON", async () => {
  let captured: Record<string, unknown> | undefined;
  const provider = createGeminiAiProvider({
    model: "test-model",
    generator: {
      async generateContent(input) {
        captured = input;
        return response({ text: '{"content":"ok"}' });
      },
    },
  });
  assert.deepEqual(
    await provider.generateStructured({
      systemInstruction: "system",
      userContent: "user",
      responseSchema: { type: "object" },
      maxOutputTokens: 99,
    }),
    { content: "ok" },
  );
  assert.equal(captured?.model, "test-model");
  assert.deepEqual(captured?.config, {
    systemInstruction: "system",
    responseMimeType: "application/json",
    responseJsonSchema: { type: "object" },
    maxOutputTokens: 99,
  });
});

test("Gemini adapter distinguishes policy blocks and malformed results", async () => {
  const blocked = createGeminiAiProvider({
    model: "test",
    generator: {
      async generateContent() {
        return response({
          promptFeedback: { blockReason: BlockedReason.BLOCKLIST },
        });
      },
    },
  });
  await assert.rejects(
    blocked.generateStructured({
      systemInstruction: "s",
      userContent: "u",
      responseSchema: {},
      maxOutputTokens: 1,
    }),
    (error) => error instanceof AppError && error.statusCode === 422,
  );

  for (const result of [
    response({ text: "not-json" }),
    response({ candidates: [{ finishReason: FinishReason.MAX_TOKENS }] }),
    response({}),
  ]) {
    const invalid = createGeminiAiProvider({
      model: "test",
      generator: { async generateContent() { return result; } },
    });
    await assert.rejects(
      invalid.generateStructured({
        systemInstruction: "s",
        userContent: "u",
        responseSchema: {},
        maxOutputTokens: 1,
      }),
      (error) => error instanceof AppError && error.statusCode === 502,
    );
  }
});

test("Gemini adapter sanitizes temporary and configuration SDK failures", async () => {
  for (const [providerStatus, expectedStatus] of [
    [408, 503],
    [429, 503],
    [500, 503],
    [502, 503],
    [503, 503],
    [504, 503],
    [401, 500],
    [404, 500],
    [409, 500],
  ] as const) {
    await assert.rejects(
      invokeRejectedProvider(
        new ApiError({ status: providerStatus, message: "raw-secret" }),
      ),
      (error) =>
        error instanceof AppError &&
        error.statusCode === expectedStatus &&
        !error.message.includes("raw-secret"),
    );
  }
});

test("Gemini transport detection uses structured direct, nested, and aggregate evidence", () => {
  for (const code of [
    "ECONNRESET",
    "ECONNREFUSED",
    "ENOTFOUND",
    "EAI_AGAIN",
    "ETIMEDOUT",
    "ESOCKETTIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT",
    "UND_ERR_SOCKET",
  ]) {
    assert.equal(
      isVerifiedTransportFailure(Object.assign(new Error("hidden"), { code })),
      true,
    );
  }

  assert.equal(
    isVerifiedTransportFailure(
      new TypeError("outer", {
        cause: Object.assign(new Error("inner"), { code: "ECONNRESET" }),
      }),
    ),
    true,
  );
  assert.equal(
    isVerifiedTransportFailure(
      new AggregateError(
        [
          new Error("ordinary"),
          Object.assign(new Error("dns"), { code: "ENOTFOUND" }),
        ],
        "aggregate",
      ),
    ),
    true,
  );
  assert.equal(isVerifiedTransportFailure(new TypeError("programming")), false);
  assert.equal(
    isVerifiedTransportFailure(
      new TypeError("outer", { cause: new Error("ordinary") }),
    ),
    false,
  );
});

test("Gemini transport detection terminates cyclic and excessive cause graphs", () => {
  const cyclic = new Error("cycle") as Error & { cause?: unknown };
  cyclic.cause = cyclic;
  assert.equal(isVerifiedTransportFailure(cyclic), false);

  let excessive: Error & { cause?: unknown } = Object.assign(
    new Error("transport"),
    { code: "ECONNRESET" },
  );
  for (let index = 0; index < 10; index += 1) {
    excessive = Object.assign(new Error(`level-${index}`), {
      cause: excessive,
    });
  }
  assert.equal(isVerifiedTransportFailure(excessive), false);
});

test("Gemini adapter sanitizes verified transport details and bare TypeErrors", async () => {
  const transport = new TypeError("secret provider detail", {
    cause: Object.assign(new Error("socket contains secret metadata"), {
      code: "ECONNRESET",
    }),
  });
  await assert.rejects(
    invokeRejectedProvider(transport),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 503 &&
      error.message === "AI service is temporarily unavailable" &&
      !error.message.includes("secret") &&
      !error.message.includes("socket"),
  );

  await assert.rejects(
    invokeRejectedProvider(new TypeError("internal secret")),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 500 &&
      error.message === "AI service configuration error" &&
      !error.message.includes("internal secret"),
  );

  for (const name of ["AbortError", "TimeoutError"]) {
    const error = new Error("hidden timeout");
    error.name = name;
    await assert.rejects(
      invokeRejectedProvider(error),
      (received) => received instanceof AppError && received.statusCode === 503,
    );
  }
});

test("Gemini ApiError status takes precedence over transport-looking causes", async () => {
  const error = Object.assign(
    new ApiError({ status: 409, message: "provider conflict" }),
    { cause: Object.assign(new Error("network"), { code: "ECONNRESET" }) },
  );
  await assert.rejects(
    invokeRejectedProvider(error),
    (received) =>
      received instanceof AppError &&
      received.statusCode === 500 &&
      received.message === "AI service configuration error",
  );
});
