export type DeclarationFileType = "pdf" | "docx";

export const DECLARATION_ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const MAX_DECLARATION_BYTES = 20 * 1024 * 1024;
export const DECLARATION_BUCKET = "training-documents";
/** A4 portrait at 96 CSS px per inch. */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

export const declarationFileType = (name: string): DeclarationFileType | null => {
  const ext = name.trim().toLowerCase().split(".").pop();
  return ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : null;
};

export const validateDeclarationFile = (file: { name: string; size: number }): string | null => {
  if (/\.doc$/i.test(file.name.trim())) return "Old Word (.doc) files cannot be shown. Save it as Word (.docx) or PDF and upload again.";
  if (!declarationFileType(file.name)) return "Only PDF or Word (.docx) files can be uploaded.";
  if (file.size <= 0) return "The file is empty.";
  if (file.size > MAX_DECLARATION_BYTES) return "The file is larger than 20 MB.";
  return null;
};

export const canSubmitDeclaration = ({ agreed, signature }: { agreed: boolean; signature: string | null }) =>
  agreed === true && !!signature && signature.startsWith("data:image/png;base64,");

/** Signed/not-signed status for the drivers that appear in the training register. */
export const summarizeSignatures = (acks: { driver_id: string }[], driverIds: string[]) => {
  const signers = new Set(acks.map((a) => a.driver_id.trim()));
  const trained = [...new Set(driverIds.map((d) => d.trim()).filter(Boolean))];
  const notSigned = trained.filter((d) => !signers.has(d)).sort();
  return { total: trained.length, signed: trained.length - notSigned.length, notSigned };
};

export const fitScale = (containerWidth: number) => (containerWidth > 0 ? Math.min(1, containerWidth / A4_WIDTH_PX) : 1);
