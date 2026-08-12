import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function generatePdfReport(elementId: string, fileName = "ECG_Report.pdf") {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#06110b",
      onclone: (clonedDoc) => {
        // Strip or replace unsupported color functions (lab, oklch) in cloned styles
        const styles = clonedDoc.querySelectorAll("style");
        styles.forEach((style) => {
          if (style.innerHTML) {
            style.innerHTML = style.innerHTML
              .replace(/lab\([^)]+\)/gi, "#10b981")
              .replace(/oklch\([^)]+\)/gi, "#10b981");
          }
        });
        // Also sanitize inline styles if present
        const allElements = clonedDoc.querySelectorAll("*");
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style) {
            const cssText = htmlEl.style.cssText;
            if (cssText.includes("lab(") || cssText.includes("oklch(")) {
              htmlEl.style.cssText = cssText
                .replace(/lab\([^)]+\)/gi, "#10b981")
                .replace(/oklch\([^)]+\)/gi, "#10b981");
            }
          }
        });
      },
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(fileName);
  } catch (err) {
    console.warn("html2canvas error, falling back to window.print():", err);
    window.print();
  }
}
