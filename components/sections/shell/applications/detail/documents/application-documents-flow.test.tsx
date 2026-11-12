// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { ApplicationDocuments } from "./application-documents";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type Ref,
} from "react";
import type {
  ApplicationDocumentWithUser,
  DocumentConfig,
} from "@/lib/applications/document-types";
import messages from "@/messages/es/applications.json";
import common from "@/messages/es/common.json";
const pdfState = vi.hoisted(() => ({
  latest: {
    name: "Licencia",
    author: "Laura",
    sourceAttachmentId: "attachment",
    storageId: "completed",
    url: "https://files.example/submitted.pdf",
    fileName: "form.pdf",
    needsRestart: false,
  } as Record<string, unknown>,
}));
vi.mock("convex/react", () => ({ useQuery: () => pdfState.latest }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: async () => "token" }),
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function Viewer({
      src,
      readOnly = true,
      viewerRef,
      onReady,
      onChange,
    }: {
      src: string;
      readOnly?: boolean;
      viewerRef?: Ref<{
        exportPdf: () => Promise<Blob>;
        printPdf: () => Promise<void>;
      }>;
      onReady: () => void;
      onChange?: () => void;
    }) {
      const ready = useRef(onReady);
      const [value, setValue] = useState("");
      useEffect(() => ready.current(), []);
      useImperativeHandle(
        viewerRef,
        () => ({
          printPdf: async () => {},
          exportPdf: async () =>
            new Blob(["%PDF-test"], { type: "application/pdf" }),
        }),
        [],
      );
      return readOnly ? (
        <div data-testid="pdf-preview" data-src={src} />
      ) : (
        <input
          aria-label="Respuesta del PDF"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            onChange?.();
          }}
        />
      );
    },
}));
const role = vi.hoisted(() => ({ isAdmin: true }));
vi.mock("@/hooks/use-is-admin", () => ({ useIsAdmin: () => role }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const config: DocumentConfig = {
  _id: "config" as DocumentConfig["_id"],
  _creationTime: 1,
  applicationId: "application" as DocumentConfig["applicationId"],
  documentTypeId: "license",
  name: "Licencia",
  visibility: "optional",
  updatedAt: 1,
  updatedBy: "admin" as DocumentConfig["updatedBy"],
  attachment: {
    id: "attachment" as NonNullable<DocumentConfig["attachmentId"]>,
    fileName: "form.pdf",
    contentType: "application/pdf",
    fileSize: 10,
    url: "https://files.example/original.pdf",
  },
};
const upload: ApplicationDocumentWithUser = {
  _id: "submission" as ApplicationDocumentWithUser["_id"],
  _creationTime: 2,
  applicationId: config.applicationId,
  documentTypeId: config.documentTypeId,
  name: "Licencia",
  storageId: "completed" as ApplicationDocumentWithUser["storageId"],
  fileName: "form.pdf",
  contentType: "application/pdf",
  fileSize: 12,
  status: "pending",
  uploadedBy: config.updatedBy,
  uploadedAt: Date.UTC(2026, 10, 3),
  url: "https://files.example/submitted.pdf",
  uploadedByUser: {
    _id: config.updatedBy,
    firstName: "Laura",
    lastName: "Betancourt",
    email: "laura@example.com",
  },
};
function setup({
  isAdmin = true,
  submission = upload,
  requirement = config,
}: {
  isAdmin?: boolean;
  submission?: ApplicationDocumentWithUser | null;
  requirement?: DocumentConfig;
} = {}) {
  role.isAdmin = isAdmin;
  const props: ComponentProps<typeof ApplicationDocuments> = {
    applicationId: config.applicationId,
    documents: submission ? [submission] : [],
    documentConfigs: [requirement],
    onUpload: vi.fn(),
    onGenerateUploadUrl: vi.fn(),
    onUpdateStatus: vi.fn(),
    onRemove: vi.fn(),
    onCreateCustomDocumentType: vi.fn(),
    onDeleteCustomDocumentType: vi.fn(),
    onUploadAttachment: vi.fn(),
    onUpdateRequirement: vi.fn(),
    onUpdateVisibility: vi.fn(),
  };
  const view = render(
    <NextIntlClientProvider
      locale="es"
      timeZone="UTC"
      messages={{ Applications: messages, Common: common }}
    >
      <ApplicationDocuments {...props} />
    </NextIntlClientProvider>,
  );
  const refresh = () =>
    view.rerender(
      <NextIntlClientProvider
        locale="es"
        timeZone="UTC"
        messages={{ Applications: messages, Common: common }}
      >
        <ApplicationDocuments {...props} />
      </NextIntlClientProvider>,
    );
  return { ...view, props, refresh };
}
async function openDelivery() {
  fireEvent.click(screen.getByRole("link", { name: /Ver entrega:/ }));
  return await screen.findByRole("dialog");
}
async function moreActions() {
  if (!screen.queryByRole("dialog")) await openDelivery();
  fireEvent.pointerDown(
    screen.getByRole("button", { name: "Acciones del documento" }),
    { button: 0, ctrlKey: false },
  );
  return await screen.findByRole("menu");
}

test.each([false, true])(
  "parents see their submission and admins also see the separate school source (admin: %s)",
  (isAdmin) => {
    setup({ isAdmin });
    const original = screen.queryByRole("region", {
      name: "Archivo del colegio",
    });
    if (isAdmin)
      expect(
        within(original!)
          .getByRole("link", { name: "Ver archivo del colegio: form.pdf" })
          .getAttribute("href"),
      ).toBe(config.attachment!.url);
    else expect(original).toBeNull();
    const submission = screen.getByRole("region", {
      name: isAdmin ? "Entrega" : "Mi entrega",
    });
    expect(within(submission).getByText("form.pdf")).toBeTruthy();
    expect(
      within(submission)
        .getByRole("link", { name: "Ver entrega: form.pdf" })
        .getAttribute("href"),
    ).toBe(upload.url);
    expect(within(submission).getByRole("status").textContent).toBe(
      "Pendiente de revisión",
    );
    expect(
      within(submission).getByText(/3 nov 2026.*Laura Betancourt/),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Revisar entrega" }) !== null,
    ).toBe(false);
    expect(
      screen.queryByRole("button", { name: "Aprobar entrega" }),
    ).toBeNull();
    expect(screen.queryByText("Ver entrega")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Configuración del requisito" }) !==
        null,
    ).toBe(isAdmin);
    expect(
      screen.queryByRole("button", { name: "Subir otro archivo" }),
    ).toBeNull();
  },
);

test("the file picker remains mounted when replacing a submission from its menu", async () => {
  const { props } = setup({ isAdmin: false });
  await openDelivery();
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  const openPicker = vi.spyOn(input, "click");
  const menu = await moreActions();
  fireEvent.click(
    within(menu).getByRole("menuitem", { name: "Subir otro archivo" }),
  );
  expect(openPicker).toHaveBeenCalledOnce();
  expect(document.querySelector('input[type="file"]')).toBe(input);
  expect(props.onUpload).not.toHaveBeenCalled();
  expect(props.onUpdateStatus).not.toHaveBeenCalled();
});

test("deletion requires confirmation, keeps errors visible and retries only the selected submission", async () => {
  const { props } = setup({ isAdmin: false });
  vi.mocked(props.onRemove)
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce(null);
  const menu = await moreActions();
  fireEvent.click(
    within(menu).getByRole("menuitem", { name: "Eliminar entrega" }),
  );
  const dialog = await screen.findByRole("alertdialog");
  expect(props.onRemove).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
  });
  expect(await within(dialog).findByRole("alert")).toBeTruthy();
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
  });
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(props.onRemove).toHaveBeenNthCalledWith(1, { documentId: upload._id });
  expect(props.onRemove).toHaveBeenNthCalledWith(2, { documentId: upload._id });
  expect(props.onDeleteCustomDocumentType).not.toHaveBeenCalled();
});

test("rejection asks for a nonempty reason and preserves it after a failed save", async () => {
  const { props } = setup();
  vi.mocked(props.onUpdateStatus)
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce(null);
  await openDelivery();
  fireEvent.click(
    await screen.findByRole("button", { name: "Rechazar entrega" }),
  );
  const dialog = await screen.findByRole("dialog");
  const reason = within(dialog).getByRole("textbox", {
    name: "Motivo del rechazo",
  });
  const confirm = within(dialog).getByRole("button", {
    name: "Confirmar rechazo",
  });
  fireEvent.change(reason, { target: { value: "   " } });
  expect(confirm.hasAttribute("disabled")).toBe(true);
  expect(props.onUpdateStatus).not.toHaveBeenCalled();
  fireEvent.change(reason, {
    target: { value: "  Falta la firma del tutor.  " },
  });
  await act(async () => {
    fireEvent.click(confirm);
  });
  expect(await within(dialog).findByRole("alert")).toBeTruthy();
  expect((reason as HTMLTextAreaElement).value).toBe(
    "  Falta la firma del tutor.  ",
  );
  await act(async () => {
    fireEvent.click(confirm);
  });
  expect(props.onUpdateStatus).toHaveBeenNthCalledWith(2, {
    documentId: upload._id,
    status: "rejected",
    rejectionReason: "Falta la firma del tutor.",
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("approval disables repeated review actions while saving", async () => {
  const { props } = setup();
  let finish!: (value: null) => void;
  vi.mocked(props.onUpdateStatus).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  await openDelivery();
  const approve = await screen.findByRole("button", {
    name: "Aprobar entrega",
  });
  fireEvent.click(approve);
  fireEvent.click(approve);
  expect(props.onUpdateStatus).toHaveBeenCalledOnce();
  expect(props.onUpdateStatus).toHaveBeenCalledWith({
    documentId: upload._id,
    status: "approved",
  });
  expect(approve.hasAttribute("disabled")).toBe(true);
  expect(
    screen
      .getByRole("button", { name: "Acciones del documento" })
      .hasAttribute("disabled"),
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  await act(async () => finish(null));
});

test("empty and rejected submissions expose the next action without school review controls for applicants", () => {
  const empty = setup({ isAdmin: false, submission: null });
  expect(
    screen.getByText(messages.documents.submission.completeInstructions),
  ).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "Diligenciar documento" })
      .getAttribute("data-variant"),
  ).toBe("default");
  expect(
    screen
      .getByRole("button", { name: "Subir archivo" })
      .getAttribute("data-variant"),
  ).toBe("outline");
  empty.unmount();
  setup({
    isAdmin: false,
    submission: {
      ...upload,
      status: "rejected",
      rejectionReason: "Falta la firma.",
    },
  });
  const region = screen.getByRole("region", { name: "Mi entrega" });
  expect(
    within(region).queryByText(
      messages.documents.submission.completeInstructions,
    ),
  ).toBeNull();
  expect(within(region).getByText("Falta la firma.")).toBeTruthy();
  expect(
    within(region)
      .getByRole("button", { name: "Corregir entrega" })
      .getAttribute("data-variant"),
  ).toBe("default");
  expect(
    within(region).queryByRole("button", { name: "Acciones del documento" }),
  ).toBeNull();
  expect(screen.queryByRole("button", { name: "Revisar entrega" })).toBeNull();
});

test.each([undefined, "image/png"])(
  "a parent without a PDF template only gets upload guidance (%s)",
  (contentType) => {
    setup({
      isAdmin: false,
      submission: null,
      requirement: {
        ...config,
        attachment: contentType
          ? { ...config.attachment!, contentType, fileName: "template.png" }
          : undefined,
      },
    });
    expect(
      screen.getByText(messages.documents.submission.uploadInstructions),
    ).toBeTruthy();
    expect(
      screen.queryByText(messages.documents.submission.completeInstructions),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Diligenciar documento" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Subir archivo" })
        .getAttribute("data-variant"),
    ).toBe("default");
  },
);

test("admins open the original or delivery directly from their filenames", async () => {
  setup();
  fireEvent.click(
    screen.getByRole("link", { name: "Ver archivo del colegio: form.pdf" }),
  );
  let dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByTestId("pdf-preview").getAttribute("data-src"),
  ).toBe(config.attachment!.url);
  expect(
    within(dialog).queryByRole("button", { name: "Aprobar entrega" }),
  ).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(screen.getByRole("link", { name: "Ver entrega: form.pdf" }));
  dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByTestId("pdf-preview").getAttribute("data-src"),
  ).toBe(upload.url);
});

test("the admin opens one read-only viewer with review and contextual modification actions", async () => {
  setup();
  expect(screen.queryByRole("button", { name: "Revisar entrega" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Acciones del documento" }),
  ).toBeNull();
  const dialog = await openDelivery();
  const header = dialog.querySelector("header")!;
  const review = within(header).getByRole("group", { name: "Revisión" });
  expect(within(review).getByRole("status").textContent).toBe(
    "Pendiente de revisión",
  );
  expect(
    within(review).getByRole("button", { name: "Aprobar entrega" }),
  ).toBeTruthy();
  expect(
    within(review).getByRole("button", { name: "Rechazar entrega" }),
  ).toBeTruthy();
  expect(
    within(review).queryByRole("button", { name: "Acciones del documento" }),
  ).toBeNull();
  expect(
    within(header).getByRole("button", { name: "Acciones del documento" }),
  ).toBeTruthy();
  expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
  expect(
    within(dialog).getByTestId("pdf-preview").getAttribute("data-src"),
  ).toBe(upload.url);
  expect(
    within(dialog).getByRole("button", { name: "Acciones del documento" }),
  ).toBeTruthy();
  expect(
    within(dialog).getByRole("button", { name: "Aprobar entrega" }),
  ).toBeTruthy();
  expect(
    within(dialog).getByRole("button", { name: "Rechazar entrega" }),
  ).toBeTruthy();
  expect(
    within(dialog).queryByRole("textbox", { name: "Respuesta del PDF" }),
  ).toBeNull();
});

test("replacing a delivery while the editor is open preserves local work and reports a conflict", async () => {
  pdfState.latest = {
    name: "Licencia",
    author: "Laura",
    sourceAttachmentId: "attachment",
    storageId: "completed",
    url: "https://files.example/submitted.pdf",
    fileName: "form.pdf",
    needsRestart: false,
  };
  const { props, refresh } = setup();
  const dialog = await openDelivery();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Editar documento" }),
  );
  const input = await screen.findByRole("textbox", {
    name: "Respuesta del PDF",
  });
  fireEvent.change(input, { target: { value: "Trabajo en curso" } });
  props.documents = [
    {
      ...upload,
      _id: "new-submission" as typeof upload._id,
      storageId: "replacement" as typeof upload.storageId,
    },
  ];
  pdfState.latest = { ...pdfState.latest, storageId: "replacement" };
  refresh();
  expect(
    (
      screen.getByRole("textbox", {
        name: "Respuesta del PDF",
      }) as HTMLInputElement
    ).value,
  ).toBe("Trabajo en curso");
  expect(await screen.findByText(messages.documents.pdf.conflict)).toBeTruthy();
});

test("an already open delete confirmation never targets a newer replacement", async () => {
  const { props, refresh } = setup({ isAdmin: false });
  const menu = await moreActions();
  fireEvent.click(
    within(menu).getByRole("menuitem", { name: "Eliminar entrega" }),
  );
  await screen.findByRole("alertdialog");
  props.documents = [{ ...upload, _id: "replacement" as typeof upload._id }];
  refresh();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
  });
  expect(props.onRemove).toHaveBeenCalledWith({ documentId: upload._id });
});

test("review supports uploaded images as well as PDFs", async () => {
  setup({
    submission: {
      ...upload,
      fileName: "photo.jpg",
      contentType: "image/jpeg",
      url: "https://files.example/photo.jpg",
    },
  });
  await openDelivery();
  const dialog = await screen.findByRole("dialog");
  const image = within(dialog).getByRole("img", { name: "photo.jpg" });
  fireEvent.load(image);
  expect(
    within(dialog).getByRole("button", { name: "Aprobar entrega" }),
  ).toBeTruthy();
});

test("the first PDF delivery also survives a concurrent upload without losing local input", async () => {
  pdfState.latest = {
    name: "Licencia",
    author: "Laura",
    sourceAttachmentId: "attachment",
    storageId: null,
    url: config.attachment!.url,
    fileName: "form.pdf",
    needsRestart: false,
  };
  const { props, refresh } = setup({ submission: null, isAdmin: false });
  expect(
    screen.queryByRole("link", { name: /Ver archivo del colegio:/ }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Diligenciar documento" }),
  );
  const input = await screen.findByRole("textbox", {
    name: "Respuesta del PDF",
  });
  fireEvent.change(input, { target: { value: "Primera entrega en curso" } });
  props.documents = [upload];
  pdfState.latest = { ...pdfState.latest, storageId: upload.storageId };
  refresh();
  expect(
    (
      screen.getByRole("textbox", {
        name: "Respuesta del PDF",
      }) as HTMLInputElement
    ).value,
  ).toBe("Primera entrega en curso");
  expect(await screen.findByText(messages.documents.pdf.conflict)).toBeTruthy();
});

test("the applicant gets the same file entry with modification actions and no review controls", async () => {
  setup({ isAdmin: false });
  const dialog = await openDelivery();
  expect(
    within(dialog).getByRole("button", { name: "Acciones del documento" }),
  ).toBeTruthy();
  expect(
    within(dialog).queryByRole("button", { name: "Aprobar entrega" }),
  ).toBeNull();
  expect(
    within(dialog).queryByRole("button", { name: "Rechazar entrega" }),
  ).toBeNull();
  expect(
    within(dialog).getByRole("button", { name: "Editar documento" }),
  ).toBeTruthy();
  const menu = await moreActions();
  expect(
    within(menu).getByRole("menuitem", { name: "Subir otro archivo" }),
  ).toBeTruthy();
  expect(
    within(menu).getByRole("menuitem", { name: "Eliminar entrega" }),
  ).toBeTruthy();
});

test("an admin saves edits before returning to the updated preview and explicitly reviewing the new delivery", async () => {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://test.convex.cloud");
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response(JSON.stringify({ storageId: "edited-file" })),
    ),
  );
  pdfState.latest = {
    name: "Licencia",
    author: "Laura",
    sourceAttachmentId: "attachment",
    storageId: upload.storageId,
    url: upload.url,
    fileName: upload.fileName,
    needsRestart: false,
  };
  const { props, refresh } = setup({
    submission: { ...upload, status: "approved" },
  });
  const preview = await openDelivery();
  fireEvent.click(
    within(preview).getByRole("button", { name: "Editar documento" }),
  );
  const input = await screen.findByRole("textbox", {
    name: "Respuesta del PDF",
  });
  expect(screen.queryByRole("button", { name: "Aprobar entrega" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Editar documento" })).toBeNull();
  fireEvent.change(input, { target: { value: "Corregido por el colegio" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  });
  expect(await screen.findByText("Actualizando entrega…")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Aprobar entrega" })).toBeNull();
  expect(props.onUpdateStatus).not.toHaveBeenCalled();
  props.documents = [
    {
      ...upload,
      _id: "edited" as typeof upload._id,
      storageId: "edited-file" as typeof upload.storageId,
      url: "https://files.example/edited.pdf",
      status: "pending",
    },
  ];
  refresh();
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByTestId("pdf-preview").getAttribute("data-src"),
  ).toBe("https://files.example/edited.pdf");
  expect(within(dialog).getByRole("status")).toHaveProperty(
    "textContent",
    "Pendiente de revisión",
  );
  expect(props.onUpdateStatus).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Aprobar entrega" }),
    );
  });
  expect(props.onUpdateStatus).toHaveBeenCalledWith({
    documentId: "edited",
    status: "approved",
  });
});

test.each(["replacement-file", "newer-file"])(
  "replacing the file returns to the current pending preview without approving it (storage: %s)",
  async (storageId) => {
    const { props, refresh } = setup({
      submission: { ...upload, status: "approved" },
    });
    vi.mocked(props.onGenerateUploadUrl).mockResolvedValue(
      "https://files.example/upload",
    );
    vi.mocked(props.onUpload).mockResolvedValue(
      "replacement" as typeof upload._id,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ storageId: "replacement-file" })),
      ),
    );
    const menu = await moreActions();
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: "Subir otro archivo" }),
    );
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await act(async () => {
      fireEvent.change(input, {
        target: {
          files: [
            new File(["%PDF-test"], "replacement.pdf", {
              type: "application/pdf",
            }),
          ],
        },
      });
    });
    expect(await screen.findByText("Actualizando entrega…")).toBeTruthy();
    expect(props.onUpload).toHaveBeenCalledOnce();
    expect(props.onUpdateStatus).not.toHaveBeenCalled();
    props.documents = [
      {
        ...upload,
        _id: "replacement" as typeof upload._id,
        storageId: storageId as typeof upload.storageId,
        fileName: "replacement.pdf",
        url: "https://files.example/replacement.pdf",
        status: "pending",
      },
    ];
    refresh();
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByTestId("pdf-preview").getAttribute("data-src"),
    ).toBe("https://files.example/replacement.pdf");
    expect(
      within(dialog).getByRole("button", { name: "Aprobar entrega" }),
    ).toBeTruthy();
    expect(props.onUpdateStatus).not.toHaveBeenCalled();
  },
);

test("a missing preview URL does not hide the existing permission to replace or remove the delivery", async () => {
  setup({
    isAdmin: false,
    submission: { ...upload, url: null },
    requirement: { ...config, attachment: undefined },
  });
  const dialog = await openDelivery();
  expect(within(dialog).getByRole("alert").textContent).toBe(
    messages.documents.pdf.loadError,
  );
  const menu = await moreActions();
  expect(
    within(dialog).queryByRole("button", { name: "Editar documento" }),
  ).toBeNull();
  expect(
    within(menu).getByRole("menuitem", { name: "Subir otro archivo" }),
  ).toBeTruthy();
  expect(
    within(menu).getByRole("menuitem", { name: "Eliminar entrega" }),
  ).toBeTruthy();
});

test.each(["approved", "rejected"] as const)(
  "changing a %s decision requires an explicit selection and confirmation; cancel preserves it",
  async (status) => {
    const { props } = setup({
      submission: {
        ...upload,
        status,
        rejectionReason: status === "rejected" ? "Falta la firma." : undefined,
      },
    });
    const dialog = await openDelivery();
    const review = within(dialog).getByRole("group", { name: "Revisión" });
    const label = messages.documents.status[status];
    const nextStatus = status === "approved" ? "rejected" : "approved";
    expect(within(review).getByRole("status").textContent).toBe(label);
    expect(
      within(review).queryByRole("button", { name: "Aprobar entrega" }),
    ).toBeNull();
    expect(
      within(review).queryByRole("button", { name: "Rechazar entrega" }),
    ).toBeNull();
    fireEvent.click(
      within(review).getByRole("button", { name: "Cambiar decisión" }),
    );
    const confirm = within(review).getByRole("button", {
      name: "Confirmar cambio",
    });
    expect(confirm.hasAttribute("disabled")).toBe(true);
    expect(
      within(review)
        .getByRole("button", { name: label })
        .hasAttribute("disabled"),
    ).toBe(true);
    fireEvent.click(
      within(review).getByRole("button", {
        name: messages.documents.status[nextStatus],
      }),
    );
    if (nextStatus === "rejected") {
      expect(confirm.hasAttribute("disabled")).toBe(true);
      fireEvent.change(
        within(review).getByRole("textbox", { name: "Motivo del rechazo" }),
        { target: { value: "  Revisar los campos.  " } },
      );
    }
    expect(within(review).getByRole("status").textContent).toBe(label);
    expect(props.onUpdateStatus).not.toHaveBeenCalled();
    fireEvent.click(within(review).getByRole("button", { name: "Cancelar" }));
    expect(within(review).getByRole("status").textContent).toBe(label);
    expect(props.onUpdateStatus).not.toHaveBeenCalled();
    fireEvent.click(
      within(review).getByRole("button", { name: "Cambiar decisión" }),
    );
    fireEvent.click(
      within(review).getByRole("button", {
        name: messages.documents.status[nextStatus],
      }),
    );
    if (nextStatus === "rejected")
      fireEvent.change(
        within(review).getByRole("textbox", { name: "Motivo del rechazo" }),
        { target: { value: "  Revisar los campos.  " } },
      );
    await act(async () => {
      fireEvent.click(
        within(review).getByRole("button", { name: "Confirmar cambio" }),
      );
    });
    expect(props.onUpdateStatus).toHaveBeenCalledOnce();
    expect(props.onUpdateStatus).toHaveBeenCalledWith({
      documentId: upload._id,
      status: nextStatus,
      ...(nextStatus === "rejected"
        ? { rejectionReason: "Revisar los campos." }
        : {}),
    });
  },
);

test("a failed decision change preserves the selection and reason for retry", async () => {
  const { props } = setup({ submission: { ...upload, status: "approved" } });
  vi.mocked(props.onUpdateStatus)
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce(null);
  const dialog = await openDelivery();
  const review = within(dialog).getByRole("group", { name: "Revisión" });
  fireEvent.click(
    within(review).getByRole("button", { name: "Cambiar decisión" }),
  );
  fireEvent.click(
    within(review).getByRole("button", {
      name: messages.documents.status.rejected,
    }),
  );
  const reason = within(review).getByRole("textbox", {
    name: "Motivo del rechazo",
  });
  fireEvent.change(reason, { target: { value: "Falta la firma." } });
  const confirm = within(review).getByRole("button", {
    name: "Confirmar cambio",
  });
  await act(async () => {
    fireEvent.click(confirm);
  });
  expect(within(review).getByRole("alert")).toBeTruthy();
  expect((reason as HTMLTextAreaElement).value).toBe("Falta la firma.");
  expect(within(review).getByRole("status").textContent).toBe(
    messages.documents.status.approved,
  );
  await act(async () => {
    fireEvent.click(confirm);
  });
  expect(props.onUpdateStatus).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test.each(["approved", "rejected"] as const)(
  "applicants see the %s review as a result and cannot change the decision",
  async (status) => {
    setup({
      isAdmin: false,
      submission: {
        ...upload,
        status,
        rejectionReason: status === "rejected" ? "Falta la firma." : undefined,
      },
    });
    const dialog = await openDelivery();
    const review = within(dialog).getByRole("group", { name: "Revisión" });
    expect(within(review).getByRole("status").textContent).toBe(
      messages.documents.status[status],
    );
    expect(within(review).queryAllByRole("button")).toHaveLength(0);
    if (status === "rejected")
      expect(within(review).getByText(/Falta la firma/)).toBeTruthy();
  },
);

test("a decision changed in another session resets the staged decision instead of overwriting the new result", async () => {
  const { props, refresh } = setup({
    submission: { ...upload, status: "approved" },
  });
  const dialog = await openDelivery();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Cambiar decisión" }),
  );
  fireEvent.click(
    within(dialog).getByRole("button", {
      name: messages.documents.status.rejected,
    }),
  );
  props.documents = [
    { ...upload, status: "rejected", rejectionReason: "Corregir el archivo." },
  ];
  refresh();
  const review = within(dialog).getByRole("group", { name: "Revisión" });
  expect(within(review).getByRole("status").textContent).toBe(
    messages.documents.status.rejected,
  );
  expect(
    within(review).queryByRole("button", { name: "Confirmar cambio" }),
  ).toBeNull();
  expect(within(review).getByText(/Corregir el archivo/)).toBeTruthy();
  expect(props.onUpdateStatus).not.toHaveBeenCalled();
});
