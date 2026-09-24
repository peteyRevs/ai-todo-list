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

async function expectAIError(status: number) {
  const error = await generateSteps("Plan a trip").catch((e) => e);
  expect(error).toBeInstanceOf(AIError);
  expect(error.status).toBe(status);
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

  it("reports 503 when no API key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expectAIError(503);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("reports 422 when the response is blocked for safety", async () => {
    generateContent.mockResolvedValue(
      reply(undefined, { candidates: [{ finishReason: FinishReason.SAFETY }] }),
    );
    await expectAIError(422);
  });

  it.each([["not json"], [JSON.stringify({ steps: [] })], [undefined]])(
    "reports 502 for an unusable response (%s)",
    async (text) => {
      generateContent.mockResolvedValue(reply(text));
      await expectAIError(502);
    },
  );

  it.each([
    [429, 429],
    [400, 502],
    [500, 502],
  ])("maps provider status %i to %i", async (providerStatus, status) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateContent.mockRejectedValue(new ApiError({ message: "boom", status: providerStatus }));
    await expectAIError(status);
  });
});
