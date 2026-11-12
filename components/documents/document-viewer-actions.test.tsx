// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Pencil, Save } from "lucide-react";
import { afterEach, expect, test, vi } from "vitest";
import en from "@/messages/en/common.json";
import es from "@/messages/es/common.json";
import { DocumentViewerActions } from "./document-viewer-actions";
import type { ComponentProps } from "react";
const state = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: state.error } }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function view(
  props: ComponentProps<typeof DocumentViewerActions>,
  locale = "es",
) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={{ Common: locale === "es" ? es : en }}
    >
      <DocumentViewerActions {...props} />
    </NextIntlClientProvider>
  );
}
async function menu(name = "Acciones del documento") {
  fireEvent.pointerDown(screen.getByRole("button", { name }), {
    button: 0,
    ctrlKey: false,
  });
  return await screen.findByRole("menu");
}

test("a read-only viewer offers download and print, with no edit action", async () => {
  const download = vi.fn(async () => {});
  const print = vi.fn(async () => {});
  render(view({ onDownload: download, onPrint: print }));
  fireEvent.click(screen.getByRole("button", { name: "Descargar" }));
  await waitFor(() => expect(download).toHaveBeenCalledOnce());
  await menu();
  fireEvent.click(screen.getByRole("menuitem", { name: "Imprimir" }));
  await waitFor(() => expect(print).toHaveBeenCalledOnce());
  expect(screen.queryByRole("button", { name: /Editar/ })).toBeNull();
});

test("Edit is the primary action; saving remains separate from downloading and printing", async () => {
  const edit = vi.fn();
  const save = vi.fn();
  const download = vi.fn(async () => {});
  const print = vi.fn(async () => {});
  const result = render(
    view(
      {
        primary: { label: "Edit", icon: Pencil, onClick: edit },
        onDownload: download,
        onPrint: print,
      },
      "en",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(edit).toHaveBeenCalledOnce();
  result.rerender(
    view(
      {
        primary: {
          label: "Save changes",
          icon: Save,
          onClick: save,
          disabled: true,
        },
        onDownload: download,
        onPrint: print,
      },
      "en",
    ),
  );
  expect(
    screen
      .getByRole("button", { name: "Save changes" })
      .hasAttribute("disabled"),
  ).toBe(true);
  await menu("Document actions");
  fireEvent.click(screen.getByRole("menuitem", { name: "Download" }));
  await waitFor(() => expect(download).toHaveBeenCalledOnce());
  await menu("Document actions");
  fireEvent.click(screen.getByRole("menuitem", { name: "Print" }));
  await waitFor(() => expect(print).toHaveBeenCalledOnce());
  expect(save).not.toHaveBeenCalled();
});

test("saving or a pending review disables the complete action group", () => {
  const props = {
    primary: { label: "Save", icon: Save, onClick: vi.fn(), pending: true },
    onDownload: vi.fn(),
    onPrint: vi.fn(),
  };
  const result = render(view(props));
  expect(
    screen
      .getAllByRole("button")
      .every((button) => button.hasAttribute("disabled")),
  ).toBe(true);
  result.rerender(
    view({
      ...props,
      primary: { ...props.primary, pending: false },
      disabled: true,
    }),
  );
  expect(
    screen
      .getAllByRole("button")
      .every((button) => button.hasAttribute("disabled")),
  ).toBe(true);
});

test("failed output is reported and consecutive clicks cannot start duplicate operations", async () => {
  let finish!: () => void;
  const download = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const print = vi.fn(async () => {
    throw new Error("printing unavailable");
  });
  render(view({ onDownload: download, onPrint: print }));
  const trigger = screen.getByRole("button", { name: "Descargar" });
  fireEvent.click(trigger);
  fireEvent.click(trigger);
  expect(download).toHaveBeenCalledOnce();
  expect(
    screen
      .getByRole("button", { name: "Acciones del documento" })
      .hasAttribute("disabled"),
  ).toBe(true);
  await act(async () => finish());
  await menu();
  fireEvent.click(screen.getByRole("menuitem", { name: "Imprimir" }));
  await waitFor(() =>
    expect(state.error).toHaveBeenCalledWith(es.documentViewer.printError),
  );
  expect(trigger.hasAttribute("disabled")).toBe(false);
});

test("print remains disabled until the viewer is ready, even when downloading is available", async () => {
  render(view({ onDownload: vi.fn(), onPrint: vi.fn(), printDisabled: true }));
  expect(
    screen.getByRole("button", { name: "Descargar" }).hasAttribute("disabled"),
  ).toBe(false);
  await menu();
  expect(
    screen
      .getByRole("menuitem", { name: "Imprimir" })
      .getAttribute("data-disabled"),
  ).not.toBeNull();
});
