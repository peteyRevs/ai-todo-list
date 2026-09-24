import { ApiError, FinishReason } from "@google/genai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIError, generateSteps } from "@/lib/ai";

const generateContent = vi.fn();

vi.mock("@google/genai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@google/genai")>()),
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const reply = (text: string | undefined, extra: object = {}) => ({ text, ...extra });

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  generateContent.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function expectAIError(message: RegExp) {
  const error = await generateSteps("Plan a trip").catch((e) => e);
  expect(error).toBeInstanceOf(AIError);
  expect(error.message).toMatch(message);
}

describe("generateSteps", () => {
  it("returns trimmed steps from the structured JSON response", async () => {
    generateContent.mockResolvedValue(reply(JSON.stringify({ steps: [" Pick dates ", "", "Book flights"] })));

    await expect(generateSteps("Plan a trip")).resolves.toEqual(["Pick dates", "Book flights"]);

    const request = generateContent.mock.calls[0][0];
    expect(request.contents).toContain("Plan a trip");
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.config.responseJsonSchema).toMatchObject({ type: "object" });
  });

  it("reports a missing API key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expectAIError(/not configured/);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("reports a response blocked for safety", async () => {
    generateContent.mockResolvedValue(
      reply(undefined, { candidates: [{ finishReason: FinishReason.SAFETY }] }),
    );
    await expectAIError(/declined/);
  });

  it.each([["not json"], [JSON.stringify({ steps: [] })], [undefined]])(
    "reports an unusable response (%s)",
    async (text) => {
      generateContent.mockResolvedValue(reply(text));
      await expectAIError(/unexpected response/);
    },
  );

  it.each([
    [429, /rate limiting/],
    [400, /Check GEMINI_API_KEY/],
    [500, /returned an error/],
  ])("maps provider status %i to a friendly message", async (providerStatus, message) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateContent.mockRejectedValue(new ApiError({ message: "boom", status: providerStatus }));
    await expectAIError(message);
  });
});
