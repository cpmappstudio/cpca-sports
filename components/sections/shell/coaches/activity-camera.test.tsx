// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import messages from "@/messages/en/coaches.json";
import { ActivityCameraCapture } from "./activity-camera";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
let streams: MediaStream[];
let getUserMedia: ReturnType<typeof vi.fn>;
let capture: ReturnType<typeof vi.fn<(photo: Blob | null) => void>>;
function makeStream() {
  const track = new EventTarget() as MediaStreamTrack;
  Object.defineProperty(track, "readyState", {
    configurable: true,
    value: "live",
  });
  track.stop = vi.fn(() =>
    Object.defineProperty(track, "readyState", {
      configurable: true,
      value: "ended",
    }),
  );
  track.getSettings = () => ({ deviceId: "back" });
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as MediaStream;
  streams.push(stream);
  return stream;
}
function Harness() {
  const [photo, setPhoto] = useState<Blob | null>(null);
  return (
    <NextIntlClientProvider
      locale="en"
      timeZone="America/New_York"
      messages={{ Coaches: messages }}
    >
      <ActivityCameraCapture
        photo={photo}
        onCapture={(value) => {
          capture(value);
          setPhoto(value);
        }}
      />
    </NextIntlClientProvider>
  );
}
beforeEach(() => {
  streams = [];
  capture = vi.fn<(photo: Blob | null) => void>();
  getUserMedia = vi.fn(async () => makeStream());
  vi.stubGlobal("isSecureContext", true);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia,
      enumerateDevices: vi.fn(async () => [
        { kind: "videoinput", deviceId: "back", label: "Back" },
        { kind: "videoinput", deviceId: "front", label: "Front" },
      ]),
    },
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(2);
  vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(
    1280,
  );
  vi.spyOn(HTMLVideoElement.prototype, "videoHeight", "get").mockReturnValue(
    960,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback, type) => callback(new Blob(["photo"], { type })),
  );
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:captured"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("camera starts only on request, takes a photo and releases the device", async () => {
  const result = render(<Harness />);
  expect(getUserMedia).not.toHaveBeenCalled();
  expect(result.container.querySelector('input[type="file"]')).toBeNull();
  expect(
    result
      .getByRole("group", { name: "Take your photo here" })
      .contains(result.getByRole("button", { name: "Activate camera" })),
  ).toBe(true);
  fireEvent.click(result.getByRole("button", { name: "Activate camera" }));
  await waitFor(() =>
    expect(result.getByRole("button", { name: "Take photo" })).toBeTruthy(),
  );
  expect(getUserMedia.mock.calls[0][0].audio).toBe(false);
  const video = result.getByLabelText(
    "Live camera preview",
  ) as HTMLVideoElement;
  expect(video.playsInline).toBe(true);
  expect(video.muted).toBe(true);
  fireEvent.click(result.getByRole("button", { name: "Take photo" }));
  await waitFor(() =>
    expect(
      result.getByRole("img", { name: "Photo you just took" }),
    ).toBeTruthy(),
  );
  expect(streams[0].getTracks()[0].stop).toHaveBeenCalledOnce();
  expect(capture.mock.calls.at(-1)?.[0]).toBeInstanceOf(Blob);
  expect(capture.mock.calls.at(-1)?.[0]?.type).toBe("image/webp");
  fireEvent.click(result.getByRole("button", { name: "Retake photo" }));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
  expect(capture.mock.calls.at(-1)?.[0]).toBeNull();
  result.unmount();
  expect(streams[1].getTracks()[0].stop).toHaveBeenCalledOnce();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:captured");
});
test("unmounting during the permission prompt stops a subsequently granted stream", async () => {
  let grant!: (stream: MediaStream) => void;
  getUserMedia.mockReturnValueOnce(
    new Promise((resolve) => {
      grant = resolve;
    }),
  );
  const result = render(<Harness />);
  fireEvent.click(result.getByRole("button", { name: "Activate camera" }));
  result.unmount();
  const stream = makeStream();
  await act(async () => grant(stream));
  expect(stream.getTracks()[0].stop).toHaveBeenCalledOnce();
  expect(capture).not.toHaveBeenCalledWith(expect.any(Blob));
});
test("permission denial shows recovery instructions and allows retry", async () => {
  getUserMedia.mockRejectedValueOnce(
    new DOMException("denied", "NotAllowedError"),
  );
  const result = render(<Harness />);
  fireEvent.click(result.getByRole("button", { name: "Activate camera" }));
  await waitFor(() =>
    expect(result.getByRole("status").textContent).toContain(
      "Check the site and device settings",
    ),
  );
  fireEvent.click(result.getByRole("button", { name: "Activate camera" }));
  await waitFor(() =>
    expect(result.getByRole("button", { name: "Take photo" })).toBeTruthy(),
  );
});
test("switching cameras closes the previous stream and requests the selected device", async () => {
  const result = render(<Harness />);
  fireEvent.click(result.getByRole("button", { name: "Activate camera" }));
  await waitFor(() => expect(result.getByRole("combobox")).toBeTruthy());
  fireEvent.change(result.getByRole("combobox"), {
    target: { value: "front" },
  });
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
  expect(streams[0].getTracks()[0].stop).toHaveBeenCalledOnce();
  expect(getUserMedia).toHaveBeenLastCalledWith({
    audio: false,
    video: { deviceId: { exact: "front" } },
  });
});
test("leaving the page pauses the camera and prompts reactivation", async () => {
  const result = render(<Harness />);
  fireEvent.click(result.getByRole("button", { name: "Activate camera" }));
  await waitFor(() =>
    expect(result.getByRole("button", { name: "Take photo" })).toBeTruthy(),
  );
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(streams[0].getTracks()[0].stop).toHaveBeenCalledOnce();
  expect(result.getByRole("status").textContent).toContain("camera was paused");
  expect(result.getByRole("button", { name: "Activate camera" })).toBeTruthy();
});

test("turning off the camera releases it and restores activation inside the card", async () => {
  const result = render(<Harness />);
  fireEvent.click(result.getByRole("button", { name: "Activate camera" }));
  await waitFor(() =>
    expect(
      result.getByRole("button", { name: "Turn off camera" }),
    ).toBeTruthy(),
  );
  fireEvent.click(result.getByRole("button", { name: "Turn off camera" }));
  expect(streams[0].getTracks()[0].stop).toHaveBeenCalledOnce();
  expect(result.queryByRole("button", { name: "Take photo" })).toBeNull();
  expect(
    result
      .getByRole("group", { name: "Take your photo here" })
      .contains(result.getByRole("button", { name: "Activate camera" })),
  ).toBe(true);
});
