import { buildActivityReport } from "./activity-report";
import type {
  CoachActivityReportSnapshot,
  CoachActivityReportTranslate,
} from "./types";

export async function generateActivityReportPdf(
  snapshot: CoachActivityReportSnapshot,
  t: CoachActivityReportTranslate,
) {
  const [pdfMake, fonts, response] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
    fetch("/cpca-logo.png"),
  ]);
  if (!response.ok) throw new Error("REPORT_LOGO_UNAVAILABLE");
  const blob = await response.blob();
  const logo = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  pdfMake.default.addVirtualFileSystem(fonts.default);
  return pdfMake.default
    .createPdf(buildActivityReport(snapshot, t, logo))
    .getBlob();
}
