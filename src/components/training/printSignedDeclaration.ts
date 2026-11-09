const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export interface SignedDeclarationInfo {
  title: string;
  driverId: string;
  driverName: string | null;
  signedAt: string;
  signature: string;
}

export const formatSignedAt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Dubai" }) + " (Dubai)";

/** Opens a print window with the A4 template pages followed by the driver's signed declaration. Call directly from a click. */
export const printSignedDeclaration = (content: HTMLElement | null, info: SignedDeclarationInfo) => {
  const win = window.open("", "_blank");
  if (!win) return false;
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map((n) => n.outerHTML).join("");
  const pages = content ? content.innerHTML : "";
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(info.title)} - ${escapeHtml(info.driverId)}</title>${styles}
<style>
@page { size: A4 portrait; margin: 0; }
html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
.a4-document { width: 794px; margin: 0 auto; }
.a4-document .a4-page, .a4-document .a4-docx section.docx { box-shadow: none !important; margin: 0 auto !important; page-break-after: always; break-after: page; }
.sign-page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 72px; box-sizing: border-box; font-family: Arial, sans-serif; color: #000; background: #fff; }
.sign-page h1 { font-size: 20px; margin: 0 0 24px; }
.sign-page table { border-collapse: collapse; width: 100%; font-size: 14px; }
.sign-page td { border: 1px solid #999; padding: 10px; vertical-align: top; }
.sign-page td:first-child { width: 32%; font-weight: bold; background: #f3f3f3; }
.sign-page img { max-width: 100%; max-height: 180px; display: block; }
</style></head><body>
<div class="a4-document">${pages}</div>
<div class="sign-page">
<h1>Acknowledgment and Declaration – Signed Copy</h1>
<table>
<tr><td>Declaration</td><td>${escapeHtml(info.title)}</td></tr>
<tr><td>Driver ID</td><td>${escapeHtml(info.driverId)}</td></tr>
<tr><td>Driver Name</td><td>${escapeHtml(info.driverName || "-")}</td></tr>
<tr><td>I agree (Yes)</td><td>&#9745; Yes</td></tr>
<tr><td>Date &amp; time signed</td><td>${escapeHtml(formatSignedAt(info.signedAt))}</td></tr>
<tr><td>Signature</td><td><img src="${info.signature}" alt="Driver signature"></td></tr>
</table>
</div>
<script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`);
  win.document.close();
  return true;
};
