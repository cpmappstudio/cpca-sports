// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ActivityCamera } from "./camera";

beforeEach(() => vi.stubGlobal("isSecureContext", true));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function fixture(
  options: {
    media?: Partial<MediaDevices>;
    video?: Partial<HTMLVideoElement>;
  } = {},
) {
  const track = new EventTarget() as MediaStreamTrack;
  Object.defineProperty(track, "readyState", {
    value: "live",
    configurable: true,
  });
  track.stop = vi.fn(() =>
    Object.defineProperty(track, "readyState", {
      value: "ended",
      configurable: true,
    }),
  );
  track.getSettings = () => ({ deviceId: "back" });
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as MediaStream;
  const media = {
    getUserMedia: vi.fn(async () => stream),
    enumerateDevices: vi.fn(
      async () =>
        [
          { kind: "videoinput", deviceId: "back" },
          { kind: "audioinput" },
        ] as MediaDeviceInfo[],
    ),
    ...options.media,
  };
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: media,
  });
  const video = {
    srcObject: null,
    readyState: 2,
    videoWidth: 1920,
    videoHeight: 1080,
    play: vi.fn(async () => {}),
    ...options.video,
  } as unknown as HTMLVideoElement;
  const canvas = document.createElement("canvas");
  vi.spyOn(document, "createElement").mockReturnValue(canvas);
  vi.spyOn(canvas, "getContext").mockReturnValue({
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(canvas, "toBlob").mockImplementation((callback, type) =>
    callback(new Blob(["photo"], { type })),
  );
  const state = vi.fn();
  const camera = new ActivityCamera(video, state);
  return { camera, video, canvas, stream, track, media, state };
}

test("capture requests only video, limits the longest dimension and releases all tracks", async () => {
  const f = fixture();
  await f.camera.start();
  expect(f.media.getUserMedia).toHaveBeenCalledWith({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 960 },
    },
  });
  expect((await f.camera.capture())?.type).toBe("image/webp");
  expect(f.canvas.toBlob).toHaveBeenCalledOnce();
  expect(f.canvas.toBlob).toHaveBeenCalledWith(
    expect.any(Function),
    "image/webp",
    0.82,
  );
  expect(f.canvas.width).toBe(1280);
  expect(f.canvas.height).toBe(720);
  expect(f.track.stop).toHaveBeenCalledOnce();
  expect(f.video.srcObject).toBeNull();
  expect(f.camera.state).toBe("captured");
});
test("cancelling pending permission releases a stream granted later", async () => {
  let grant!: (stream: MediaStream) => void;
  const pending = new Promise<MediaStream>((resolve) => {
    grant = resolve;
  });
  const f = fixture({ media: { getUserMedia: vi.fn(() => pending) } });
  const starting = f.camera.start();
  f.camera.stop();
  grant(f.stream);
  await starting;
  expect(f.track.stop).toHaveBeenCalledOnce();
  expect(f.video.srcObject).toBeNull();
  expect(f.camera.state).toBe("idle");
});
test("denied permission produces a recoverable error", async () => {
  const f = fixture({
    media: {
      getUserMedia: vi.fn(async () => {
        throw new DOMException("denied", "NotAllowedError");
      }),
    },
  });
  await f.camera.start();
  expect(f.state).toHaveBeenLastCalledWith("error", "NotAllowedError");
});
test("unsupported preferences fall back to an available camera", async () => {
  const f = fixture();
  vi.mocked(f.media.getUserMedia).mockRejectedValueOnce(
    new DOMException("unsupported", "OverconstrainedError"),
  );
  await f.camera.start();
  expect(f.media.getUserMedia).toHaveBeenLastCalledWith({
    audio: false,
    video: true,
  });
  expect(f.camera.state).toBe("live");
  f.camera.stop();
});
test("cancelling during photo encoding does not return a stale capture", async () => {
  const f = fixture();
  let finish!: BlobCallback;
  vi.mocked(f.canvas.toBlob).mockImplementation((callback) => {
    finish = callback;
  });
  await f.camera.start();
  const capturing = f.camera.capture();
  f.camera.stop();
  finish(new Blob(["photo"], { type: "image/webp" }));
  expect(await capturing).toBeNull();
});
test("a system interruption releases the stream and reports a useful state", async () => {
  const f = fixture();
  await f.camera.start();
  f.track.dispatchEvent(new Event("mute"));
  expect(f.track.stop).toHaveBeenCalledOnce();
  expect(f.state).toHaveBeenLastCalledWith("error", "interrupted");
});
test("an insecure page cannot request camera permission", async () => {
  const f = fixture();
  vi.stubGlobal("isSecureContext", false);
  await f.camera.start();
  expect(f.media.getUserMedia).not.toHaveBeenCalled();
  expect(f.state).toHaveBeenLastCalledWith("error", "insecure");
});
test("capture requires a live camera", async () => {
  const f = fixture();
  expect(await f.camera.capture()).toBeNull();
});
test("camera switching and enumeration work without audio", async () => {
  const f = fixture();
  await f.camera.start("back");
  expect(f.media.getUserMedia).toHaveBeenCalledWith({
    audio: false,
    video: { deviceId: { exact: "back" } },
  });
  expect(await f.camera.devices()).toHaveLength(1);
  expect(f.camera.deviceId).toBe("back");
  f.camera.stop();
});
test("failed playback releases a previously granted camera", async () => {
  const f = fixture({
    video: {
      play: vi.fn(async () => {
        throw new DOMException("interrupted", "AbortError");
      }),
    },
  });
  await f.camera.start();
  expect(f.track.stop).toHaveBeenCalledOnce();
  expect(f.camera.state).toBe("error");
});
test("cancelling while waiting for the first frame cancels timers and releases the camera", async () => {
  vi.useFakeTimers();
  const f = fixture({
    video: { readyState: 0, videoWidth: 0, videoHeight: 0 },
  });
  const starting = f.camera.start();
  await Promise.resolve();
  await Promise.resolve();
  f.camera.stop();
  await starting;
  expect(vi.getTimerCount()).toBe(0);
  expect(f.track.stop).toHaveBeenCalledOnce();
});
test("an empty camera feed times out with a retryable error", async () => {
  vi.useFakeTimers();
  const f = fixture({
    video: { readyState: 0, videoWidth: 0, videoHeight: 0 },
  });
  const starting = f.camera.start();
  await vi.advanceTimersByTimeAsync(10100);
  await starting;
  expect(f.state).toHaveBeenLastCalledWith("error", "frame");
  expect(f.track.stop).toHaveBeenCalledOnce();
});

test("losing frame dimensions before capture reports an error instead of saving a one-pixel photo", async () => {
  const f = fixture();
  await f.camera.start();
  Object.defineProperty(f.video, "videoWidth", { value: 0 });
  await expect(f.camera.capture()).rejects.toThrow("frame");
  expect(f.state).toHaveBeenLastCalledWith("error", "frame");
  expect(f.track.stop).toHaveBeenCalledOnce();
});
test("a silently ended camera reports a recoverable capture error", async () => {
  const f = fixture();
  await f.camera.start();
  Object.defineProperty(f.track, "readyState", { value: "ended" });
  await expect(f.camera.capture()).rejects.toThrow("frame");
  expect(f.state).toHaveBeenLastCalledWith("error", "frame");
});

test("a repeated capture while encoding cannot interrupt the first capture", async () => {
  const f = fixture();
  let finish!: BlobCallback;
  vi.mocked(f.canvas.toBlob).mockImplementation((callback) => {
    finish = callback;
  });
  await f.camera.start();
  const first = f.camera.capture();
  expect(await f.camera.capture()).toBeNull();
  expect(f.track.stop).not.toHaveBeenCalled();
  finish(new Blob(["photo"], { type: "image/webp" }));
  expect(await first).toBeInstanceOf(Blob);
  expect(f.track.stop).toHaveBeenCalledOnce();
});

test("capture falls back to JPEG when the browser cannot encode WebP", async () => {
  const f = fixture();
  vi.mocked(f.canvas.toBlob).mockImplementation((callback, type) =>
    callback(
      new Blob(["photo"], {
        type: type === "image/webp" ? "image/png" : type,
      }),
    ),
  );
  await f.camera.start();
  expect((await f.camera.capture())?.type).toBe("image/jpeg");
  expect(f.canvas.toBlob).toHaveBeenCalledTimes(2);
  expect(f.track.stop).toHaveBeenCalledOnce();
});

test("failed optimization releases the camera and reports a recoverable encoding error", async () => {
  const f = fixture();
  vi.mocked(f.canvas.toBlob).mockImplementation((callback) => callback(null));
  await f.camera.start();
  await expect(f.camera.capture()).rejects.toThrow("encode");
  expect(f.state).toHaveBeenLastCalledWith("error", "encode");
  expect(f.track.stop).toHaveBeenCalledOnce();
});
