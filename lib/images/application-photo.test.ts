// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { prepareApplicationPhoto } from "./application-photo";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("activities can optimize images over 5 MB while other photo uploads keep their default limit", async () => {
  const image = new File([new Uint8Array(7 * 1024 * 1024)], "activity.jpg", {
    type: "image/jpeg",
  });
  await expect(prepareApplicationPhoto(image)).rejects.toMatchObject({
    code: "maxSize",
  });
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:activity",
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 2048;
      naturalHeight = 1024;
      onload: (() => void) | null = null;
      set src(value: string) {
        if (value) this.onload?.();
      }
    },
  );
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback, type) => {
      callback(new Blob(["optimized"], { type }));
    },
  );
  const result = await prepareApplicationPhoto(image, Infinity);
  expect(result.type).toBe("image/webp");
  expect(result.name).toBe("activity.webp");
  expect(drawImage.mock.calls[0].slice(1)).toEqual([0, 0, 512, 256]);
});

test("removing the activity size limit still rejects unsupported file formats", async () => {
  const file = new File(["not an image"], "activity.pdf", {
    type: "application/pdf",
  });
  await expect(prepareApplicationPhoto(file, Infinity)).rejects.toMatchObject({
    code: "invalidType",
  });
});
