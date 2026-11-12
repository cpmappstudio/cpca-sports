// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { optimizePhoto } from "./optimize-photo";

afterEach(() => vi.restoreAllMocks());

function fixture() {
  const source = document.createElement("canvas");
  const context = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  const encode = vi
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation((callback, type) =>
      callback(new Blob(["photo"], { type })),
    );
  return { source, context, encode };
}

test.each([
  [2048, 1024, 512, 512, 256],
  [1920, 1080, 1280, 1280, 720],
  [1080, 1920, 1280, 720, 1280],
  [320, 240, 512, 320, 240],
])(
  "resizes %sx%s to at most %s without enlarging or cropping",
  async (width, height, maxDimension, expectedWidth, expectedHeight) => {
    const f = fixture();
    const result = await optimizePhoto(f.source, {
      width,
      height,
      maxDimension,
    });
    expect(result?.type).toBe("image/webp");
    expect(f.context.drawImage).toHaveBeenCalledWith(
      f.source,
      0,
      0,
      expectedWidth,
      expectedHeight,
    );
    expect(f.context.fillStyle).toBe("#fff");
    expect(f.context.fillRect).toHaveBeenCalledWith(
      0,
      0,
      expectedWidth,
      expectedHeight,
    );
    expect(f.encode).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      "image/webp",
      0.82,
    );
  },
);

test.each(["unsupported", "null", "empty"])(
  "falls back to JPEG when WebP output is %s",
  async (failure) => {
    const f = fixture();
    f.encode.mockImplementationOnce((callback) =>
      callback(
        failure === "null"
          ? null
          : new Blob(failure === "empty" ? [] : ["photo"], {
              type: failure === "unsupported" ? "image/png" : "image/webp",
            }),
      ),
    );
    const result = await optimizePhoto(f.source, {
      width: 1920,
      height: 1080,
      maxDimension: 1280,
    });
    expect(result?.type).toBe("image/jpeg");
    expect(f.encode).toHaveBeenCalledTimes(2);
    expect(f.encode).toHaveBeenLastCalledWith(
      expect.any(Function),
      "image/jpeg",
      0.82,
    );
    expect(f.context.drawImage).toHaveBeenCalledOnce();
  },
);

test.each(["unsupported", "null", "empty"])(
  "does not return unusable output when both encoders return %s",
  async (failure) => {
    const f = fixture();
    f.encode.mockImplementation((callback, type) =>
      callback(
        failure === "null"
          ? null
          : new Blob(failure === "empty" ? [] : ["photo"], {
              type: failure === "unsupported" ? "image/png" : type,
            }),
      ),
    );
    expect(
      await optimizePhoto(f.source, {
        width: 1280,
        height: 960,
        maxDimension: 1280,
      }),
    ).toBeNull();
  },
);

test("does not encode when a canvas context is unavailable", async () => {
  const f = fixture();
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
  expect(
    await optimizePhoto(f.source, {
      width: 1280,
      height: 960,
      maxDimension: 1280,
    }),
  ).toBeNull();
  expect(f.encode).not.toHaveBeenCalled();
});
