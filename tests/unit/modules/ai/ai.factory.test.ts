import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import AppError from "../../../../src/app/shared/errors/AppError";
import { createAiService } from "../../../../src/app/module/ai/ai.factory";
import type { TAiProvider } from "../../../../src/app/module/ai/ai.interface";

test("AI service derives provider schema and keeps user data out of system instructions", async () => {
  let captured: Parameters<TAiProvider["generateStructured"]>[0] | undefined;
  const service = createAiService({
    async generateStructured(input) {
      captured = input;
      return { content: " Improved content " };
    },
  });

  assert.deepEqual(
    await service.improvePost({
      content: "  private draft  ",
    }),
    { content: "Improved content" },
  );
  assert.equal(captured?.systemInstruction.includes("private draft"), false);
  assert.equal(captured?.userContent, JSON.stringify({ content: "private draft" }));
  assert.equal(captured?.systemInstruction.includes("IMPROVE"), true);
  assert.equal(captured?.systemInstruction.includes("NEUTRAL"), true);
  assert.equal(captured?.responseSchema.type, "object");
  assert.deepEqual(captured?.responseSchema.required, ["content"]);
});

test("every AI service operation normalizes defaults before provider invocation", async () => {
  const calls: Array<Parameters<TAiProvider["generateStructured"]>[0]> = [];
  const service = createAiService({
    async generateStructured(input) {
      calls.push(input);
      return "hashtags" in
        (input.responseSchema.properties as Record<string, unknown>)
        ? { hashtags: ["typescript"] }
        : { content: "result" };
    },
  });

  await service.improvePost({ content: "  post draft  " });
  await service.generatePost({
    topic: "  TypeScript  ",
    keyPoints: [" First ", "Second"],
  });
  await service.generateHashtags({ content: "  hashtag draft  " });
  await service.improveComment({ content: "  comment draft  " });
  await service.improveProfile({ field: "HEADLINE", content: "  headline  " });

  assert.deepEqual(JSON.parse(calls[0].userContent), { content: "post draft" });
  assert.equal(calls[0].systemInstruction.includes("IMPROVE"), true);
  assert.equal(calls[0].systemInstruction.includes("NEUTRAL"), true);
  assert.deepEqual(JSON.parse(calls[1].userContent), {
    topic: "TypeScript",
    keyPoints: ["First", "Second"],
  });
  assert.equal(calls[1].systemInstruction.includes("SHORT"), true);
  assert.equal(calls[1].systemInstruction.includes("NEUTRAL"), true);
  assert.deepEqual(JSON.parse(calls[2].userContent), {
    content: "hashtag draft",
  });
  assert.equal(calls[2].systemInstruction.includes("1 and 5"), true);
  assert.deepEqual(JSON.parse(calls[3].userContent), {
    content: "comment draft",
  });
  assert.deepEqual(JSON.parse(calls[4].userContent), { content: "headline" });
  assert.equal(calls[4].systemInstruction.includes("IMPROVE"), true);
  assert.equal(calls[4].systemInstruction.includes("NEUTRAL"), true);
});

test("every AI service operation validates before provider invocation", async () => {
  let providerCalls = 0;
  const service = createAiService({
    async generateStructured() {
      providerCalls += 1;
      return { content: "unexpected" };
    },
  });

  const invalidCalls: Array<() => Promise<unknown>> = [
    () => service.improvePost({ content: "draft", unknown: true } as never),
    () => service.improvePost({ content: "draft", action: "INVALID" } as never),
    () => service.improvePost({ content: "x".repeat(5001) }),
    () =>
      service.generatePost({
        topic: "topic",
        keyPoints: [" Same ", "same"],
      }),
    () => service.generatePost({ topic: "topic", keyPoints: [" "] }),
    () => service.generatePost({ topic: "topic", unknown: true } as never),
    () => service.generateHashtags({ content: "draft", limit: 0 }),
    () => service.generateHashtags({ content: "draft", unknown: true } as never),
    () => service.improveComment({ content: "x".repeat(1001) }),
    () =>
      service.improveProfile({
        field: "HEADLINE",
        content: "x".repeat(161),
      }),
    () =>
      service.improveProfile({ field: "BIO", content: "x".repeat(501) }),
    () => service.improveProfile({ field: "INVALID", content: "draft" } as never),
  ];

  for (const invoke of invalidCalls) {
    await assert.rejects(invoke, (error) => error instanceof ZodError);
    assert.equal(providerCalls, 0);
  }
});

test("AI Hashtag output is strict, normalized, and first-seen deduplicated", async () => {
  const service = createAiService({
    async generateStructured() {
      return { hashtags: [" #TypeScript ", "typescript", "#Node_JS"] };
    },
  });
  assert.deepEqual(
    await service.generateHashtags({ content: "content", limit: 3 }),
    { hashtags: ["typescript", "node_js"] },
  );

  for (const hashtags of [["bad-tag"], ["x".repeat(51)], []]) {
    const invalidService = createAiService({
      async generateStructured() {
        return { hashtags };
      },
    });
    await assert.rejects(
      invalidService.generateHashtags({ content: "content", limit: 3 }),
      (error) => error instanceof AppError && error.statusCode === 502,
    );
  }
});

test("AI service rejects malformed and oversized provider output without truncation", async () => {
  for (const value of [{ content: " " }, { content: "x".repeat(1001) }, {}]) {
    const service = createAiService({
      async generateStructured() {
        return value;
      },
    });
    await assert.rejects(
      service.improveComment({
        content: "draft",
        action: "IMPROVE",
        tone: "NEUTRAL",
      }),
      (error) => error instanceof AppError && error.statusCode === 502,
    );
  }
});

test("AI service preserves injected collaborator error identity", async () => {
  const sentinel = new Error("sentinel");
  const service = createAiService({
    async generateStructured() {
      throw sentinel;
    },
  });
  await assert.rejects(
    service.improvePost({
      content: "draft",
      action: "IMPROVE",
      tone: "NEUTRAL",
    }),
    (error) => error === sentinel,
  );
});
