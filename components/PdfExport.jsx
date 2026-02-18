"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_LEFT = 40;
const MARGIN_RIGHT = 40;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 50;
const USABLE_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;
const ROW_H = 18;
const TITLE_SIZE = 18;
const SUBTITLE_SIZE = 10;
const HEADER_SIZE = 10;
const DATA_SIZE = 9;
const FOOTER_TEXT = "Adaptive by Design \u2014 Command Center";

const COLOR_GREEN = rgb(0.13, 0.55, 0.13);
const COLOR_BLUE = rgb(0.1, 0.3, 0.7);
const COLOR_GRAY = rgb(0.45, 0.45, 0.45);
const COLOR_BLACK = rgb(0, 0, 0);
const ROW_BG_ALT = rgb(0.96, 0.96, 0.96); // #f5f5f5
const ROW_BG_WHITE = rgb(1, 1, 1);
const HEADER_BG = rgb(0.85, 0.85, 0.85);

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Truncate text so it fits within `maxWidth` at the given font/size. */
function truncate(text, font, size, maxWidth) {
  const str = String(text ?? "");
  if (str === "") return "";
  try {
    if (font.widthOfTextAtSize(str, size) <= maxWidth) return str;
  } catch {
    return str.slice(0, 40);
  }
  let lo = 0;
  let hi = str.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = str.slice(0, mid) + "\u2026";
    try {
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    } catch {
      hi = mid - 1;
    }
  }
  return lo === 0 ? "\u2026" : str.slice(0, lo) + "\u2026";
}

/** Format a date value to a readable string. */
function fmtDate(v) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(v);
  }
}

/** Return today's date as a formatted string. */
function todayString() {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Map status text to a color. */
function statusColor(status) {
  const s = String(status ?? "").toLowerCase().trim();
  if (s === "complete" || s === "done") return COLOR_GREEN;
  if (s === "in progress") return COLOR_BLUE;
  return COLOR_GRAY; // Not Started or anything else
}

/** Resolve column widths from fractional weights to absolute pixel values. */
function resolveWidths(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => (w / total) * USABLE_W);
}

/* ------------------------------------------------------------------ */
/*  Core PDF scaffolding                                              */
/* ------------------------------------------------------------------ */

/**
 * Creates a new PDFDocument with embedded Helvetica fonts and returns
 * an object with helpers for drawing titles, headers, rows, and
 * finalising the document.
 */
async function createPdfContext(title, subtitle) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let pages = [];
  let page = null;
  let y = 0;
  let pageIndex = 0;

  /** Add a new page and reset y cursor. */
  function addPage() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    pageIndex = pages.length;
    y = PAGE_H - MARGIN_TOP;
    return page;
  }

  /** Ensure there is enough room for at least one row; if not, paginate. */
  function ensureRoom(needed = ROW_H) {
    if (y - needed < MARGIN_BOTTOM) {
      addPage();
    }
  }

  // --- Start first page and draw title block ---
  addPage();

  page.drawText(title, {
    x: MARGIN_LEFT,
    y,
    size: TITLE_SIZE,
    font: fontBold,
    color: COLOR_BLACK,
  });
  y -= TITLE_SIZE + 6;

  if (subtitle) {
    page.drawText(subtitle, {
      x: MARGIN_LEFT,
      y,
      size: SUBTITLE_SIZE,
      font,
      color: COLOR_GRAY,
    });
    y -= SUBTITLE_SIZE + 12;
  } else {
    y -= 12;
  }

  /* ---- Table drawing helpers ---- */

  /** Draw the header row for a table. `columns` is [{ label, width }]. */
  function drawHeaderRow(columns) {
    ensureRoom(ROW_H);
    // Background
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: y - ROW_H + 4,
      width: USABLE_W,
      height: ROW_H,
      color: HEADER_BG,
    });
    let x = MARGIN_LEFT + 4;
    for (const col of columns) {
      const text = truncate(col.label, fontBold, HEADER_SIZE, col.width - 8);
      page.drawText(text, {
        x,
        y: y - HEADER_SIZE + 2,
        size: HEADER_SIZE,
        font: fontBold,
        color: COLOR_BLACK,
      });
      x += col.width;
    }
    y -= ROW_H;
  }

  /**
   * Draw a data row.
   * `cells` is [{ text, color?, bold? }] matching `columns` order.
   * `rowIdx` is used for alternating backgrounds.
   */
  function drawDataRow(columns, cells, rowIdx) {
    ensureRoom(ROW_H);
    // Alternating background
    const bg = rowIdx % 2 === 0 ? ROW_BG_WHITE : ROW_BG_ALT;
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: y - ROW_H + 4,
      width: USABLE_W,
      height: ROW_H,
      color: bg,
    });
    let x = MARGIN_LEFT + 4;
    for (let i = 0; i < columns.length; i++) {
      const cell = cells[i] || {};
      const useBold = cell.bold || false;
      const useFont = useBold ? fontBold : font;
      const useColor = cell.color || COLOR_BLACK;
      const text = truncate(
        cell.text ?? "",
        useFont,
        DATA_SIZE,
        columns[i].width - 8
      );
      if (text) {
        page.drawText(text, {
          x,
          y: y - DATA_SIZE + 2,
          size: DATA_SIZE,
          font: useFont,
          color: useColor,
        });
      }
      x += columns[i].width;
    }
    y -= ROW_H;
  }

  /** Write page numbers and footer on every page, then save and open. */
  async function finalise() {
    const totalPages = pages.length;
    for (let i = 0; i < totalPages; i++) {
      const p = pages[i];
      // Page number — bottom right
      const pageNumText = `Page ${i + 1} of ${totalPages}`;
      const pnWidth = font.widthOfTextAtSize(pageNumText, 8);
      p.drawText(pageNumText, {
        x: PAGE_W - MARGIN_RIGHT - pnWidth,
        y: MARGIN_BOTTOM - 20,
        size: 8,
        font,
        color: COLOR_GRAY,
      });
      // Footer — bottom left
      p.drawText(FOOTER_TEXT, {
        x: MARGIN_LEFT,
        y: MARGIN_BOTTOM - 20,
        size: 8,
        font,
        color: COLOR_GRAY,
      });
    }

    const pdfBytes = await doc.save();
    const url = URL.createObjectURL(
      new Blob([pdfBytes], { type: "application/pdf" })
    );
    window.open(url, "_blank");
    return url;
  }

  return {
    doc,
    font,
    fontBold,
    page: () => page,
    y: () => y,
    setY: (val) => {
      y = val;
    },
    addPage,
    ensureRoom,
    drawHeaderRow,
    drawDataRow,
    finalise,
  };
}

/* ------------------------------------------------------------------ */
/*  1. exportWorkbackPdf                                              */
/* ------------------------------------------------------------------ */

export async function exportWorkbackPdf(project, workback) {
  const projectName = project?.name || project?.title || "Project";
  const title = `${projectName} \u2014 Workback Schedule`;
  const subtitle = `Generated ${todayString()}`;

  const ctx = await createPdfContext(title, subtitle);

  // Column layout weights: Task(3), Date(1.5), Owner(1.5), Status(1.2)
  const widths = resolveWidths([3, 1.5, 1.5, 1.2]);
  const columns = [
    { label: "Task", width: widths[0] },
    { label: "Date", width: widths[1] },
    { label: "Owner", width: widths[2] },
    { label: "Status", width: widths[3] },
  ];

  ctx.drawHeaderRow(columns);

  const rows = Array.isArray(workback) ? workback : [];
  rows.forEach((row, idx) => {
    const isBold = !!row.isEvent;
    const sColor = statusColor(row.status);
    ctx.drawDataRow(
      columns,
      [
        { text: row.task, bold: isBold },
        { text: fmtDate(row.date), bold: isBold },
        { text: row.owner, bold: isBold },
        { text: row.status, color: sColor, bold: isBold },
      ],
      idx
    );
  });

  return ctx.finalise();
}

/* ------------------------------------------------------------------ */
/*  2. exportProgressPdf                                              */
/* ------------------------------------------------------------------ */

export async function exportProgressPdf(project, progressRows) {
  const projectName = project?.name || project?.title || "Project";
  const title = `${projectName} \u2014 Progress Report`;
  const subtitle = `Generated ${todayString()}`;

  const ctx = await createPdfContext(title, subtitle);

  const widths = resolveWidths([2.5, 1.2, 3]);
  const columns = [
    { label: "Task", width: widths[0] },
    { label: "Status", width: widths[1] },
    { label: "Notes", width: widths[2] },
  ];

  ctx.drawHeaderRow(columns);

  const rows = Array.isArray(progressRows) ? progressRows : [];
  rows.forEach((row, idx) => {
    const sColor = statusColor(row.status);
    ctx.drawDataRow(
      columns,
      [
        { text: row.task },
        { text: row.status, color: sColor },
        { text: row.notes },
      ],
      idx
    );
  });

  return ctx.finalise();
}

/* ------------------------------------------------------------------ */
/*  3. exportROSPdf                                                   */
/* ------------------------------------------------------------------ */

export async function exportROSPdf(project, rosRows, rosDayDates) {
  const projectName = project?.name || project?.title || "Project";
  const title = `${projectName} \u2014 Run of Show`;

  let subtitle = `Generated ${todayString()}`;
  if (rosDayDates && Array.isArray(rosDayDates) && rosDayDates.length > 0) {
    const formatted = rosDayDates.map((d) => fmtDate(d)).join(", ");
    subtitle = `Event Dates: ${formatted}  |  ${subtitle}`;
  } else if (rosDayDates && typeof rosDayDates === "string") {
    subtitle = `Event Dates: ${rosDayDates}  |  ${subtitle}`;
  }

  const ctx = await createPdfContext(title, subtitle);

  const widths = resolveWidths([1.2, 2.5, 1.5, 1.2, 2]);
  const columns = [
    { label: "Time", width: widths[0] },
    { label: "Item", width: widths[1] },
    { label: "Owner/Who", width: widths[2] },
    { label: "Location", width: widths[3] },
    { label: "Notes", width: widths[4] },
  ];

  ctx.drawHeaderRow(columns);

  const rows = Array.isArray(rosRows) ? rosRows : [];
  rows.forEach((row, idx) => {
    ctx.drawDataRow(
      columns,
      [
        { text: row.time },
        { text: row.item },
        { text: row.who },
        { text: row.location },
        { text: row.notes },
      ],
      idx
    );
  });

  return ctx.finalise();
}

/* ------------------------------------------------------------------ */
/*  4. exportContactsPdf                                              */
/* ------------------------------------------------------------------ */

export async function exportContactsPdf(project, people) {
  const projectName = project?.name || project?.title || "Project";
  const title = `${projectName} \u2014 Event Contacts`;
  const subtitle = `Generated ${todayString()}`;

  const ctx = await createPdfContext(title, subtitle);

  const widths = resolveWidths([0.5, 2, 1.5, 1.5, 1.3, 2]);
  const columns = [
    { label: "#", width: widths[0] },
    { label: "Name", width: widths[1] },
    { label: "Role", width: widths[2] },
    { label: "Department", width: widths[3] },
    { label: "Phone", width: widths[4] },
    { label: "Email", width: widths[5] },
  ];

  ctx.drawHeaderRow(columns);

  const rows = Array.isArray(people) ? people : [];
  rows.forEach((row, idx) => {
    ctx.drawDataRow(
      columns,
      [
        { text: String(idx + 1) },
        { text: row.name },
        { text: row.role },
        { text: row.dept },
        { text: row.phone },
        { text: row.email },
      ],
      idx
    );
  });

  return ctx.finalise();
}
