import { describe, expect, test } from "bun:test";
import { useGenerateEditorOperations } from "./frontend/src/lib/useGenerateEditorOperations";
import type { SectionBlock } from "./frontend/src/lib/generate-sections";

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    setTimeout(callback: () => void) {
      callback();
      return 0;
    },
    requestAnimationFrame(callback: () => void) {
      callback();
      return 0;
    }
  }
});

function createEditorHarness(overrides: Partial<Parameters<typeof useGenerateEditorOperations>[0]> = {}) {
  let content = "Pembuka\nIsi pembuka\n\nPenutup\nIsi penutup";
  let message = "";
  let messageTone: "neutral" | "success" | "error" = "neutral";
  let cursorPosition = 0;
  const editorState = {
    selectionStart: 0,
    scrollTop: 0,
    scrollHeight: 1000,
    clientHeight: 200,
    focus() {},
    setSelectionRange(start: number) {
      this.selectionStart = start;
    }
  };
  const previewState = {
    scrollTop: 0,
    scrollHeight: 800,
    clientHeight: 200
  };
  const sectionBlocks: SectionBlock[] = [
    { label: "Pembuka", line: 0, preview: "Isi pembuka", start: 0, end: 19, text: "Pembuka\nIsi pembuka" },
    { label: "Penutup", line: 3, preview: "Isi penutup", start: 21, end: content.length, text: "Penutup\nIsi penutup" }
  ];

  const ops = useGenerateEditorOperations({
    jenis: "ceramah",
    setJenis() {},
    setParameters() {},
    content,
    setContent(value) {
      content = typeof value === "function" ? value(content) : value;
    },
    setQuality() {},
    setTitle() {},
    setSavedNaskahId() {},
    setExportUrl() {},
    setManualEditDirty() {},
    setManualDraftStatus() {},
    setLastQuickFixDiff() {},
    setMobileParametersCollapsed() {},
    setFocusMode() {},
    setMessage(value) {
      message = value;
    },
    messageTone,
    setMessageTone(value) {
      messageTone = value;
    },
    editorRef: { current: editorState },
    previewViewportRef: { current: previewState },
    syncingScrollRef: { current: "" },
    focusMode: false,
    setCursorPosition(value) {
      cursorPosition = value;
    },
    cursorPosition,
    activeSection: sectionBlocks[0],
    activeSectionIndex: 0,
    sectionBlocks,
    ...overrides
  });

  return {
    ops,
    getContent: () => content,
    getMessage: () => message,
    getMessageTone: () => messageTone,
    getCursorPosition: () => cursorPosition,
    editorState,
    previewState
  };
}

describe("generate editor operations", () => {
  test("duplicateSection duplicates active block content", () => {
    const harness = createEditorHarness();
    harness.ops.duplicateSection();
    expect(harness.getContent()).toContain("Pembuka\nIsi pembuka\n\nPembuka\nIsi pembuka");
  });

  test("cleanupSpacing trims excessive blank lines and trailing spaces", () => {
    const harness = createEditorHarness({
      content: "Pembuka\nIsi pembuka   \n\n\nPenutup\nIsi penutup   \n",
      activeSection: null,
      activeSectionIndex: -1,
      sectionBlocks: []
    });
    harness.ops.cleanupSpacing();
    expect(harness.getContent()).toBe("Pembuka\nIsi pembuka\n\nPenutup\nIsi penutup");
  });

  test("copySection writes section text and success message", async () => {
    const clipboardWrites: string[] = [];
    (globalThis.navigator as Navigator & { clipboard: { writeText: (text: string) => Promise<void> } }).clipboard = {
      writeText: async (text: string) => {
        clipboardWrites.push(text);
      }
    };
    const harness = createEditorHarness();
    await harness.ops.copySection();
    expect(clipboardWrites[0]).toBe("Pembuka\nIsi pembuka");
    expect(harness.getMessageTone()).toBe("success");
    expect(harness.getMessage()).toContain('Section "Pembuka" berhasil disalin.');
  });

  test("jumpToSection updates cursor and syncs preview scroll", () => {
    const harness = createEditorHarness();
    harness.ops.jumpToSection(3);
    expect(harness.editorState.selectionStart).toBeGreaterThan(0);
    expect(harness.getCursorPosition()).toBe(harness.editorState.selectionStart);
    expect(harness.previewState.scrollTop).toBeGreaterThanOrEqual(0);
  });
});
