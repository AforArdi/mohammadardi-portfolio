# Full-screen resume viewer — 2026-11-21

Implemented the owner's request to read the complete resume in the website without downloading it.

## Behavior

- The hero now says **View My CV** and opens a viewport-filling Radix dialog, not a new page. Other dialogs retain their original layout.
- Header controls remain available while the document scrolls: optional Download PDF and Close. Escape closes the viewer and restores focus to the hero trigger.
- Fit width and 50–250% zoom controls let visitors enlarge text. At high zoom, the document can be panned horizontally as well as scrolled vertically.
- All document pages are represented; the previous ten-page truncation is removed. Pages near the viewport are rendered on demand; distant canvas bitmaps are released.
- Canvas backing buffers are bounded to six million pixels / 8192 pixels per edge, independent of CSS display size. Render tasks own separate canvases so zoom changes cannot reuse an active bitmap. Pending document loading and rendering are cancelled on close.
- PDF.js remains dynamically loaded. Cached document bytes are copied before worker transfer, reused when reopening the viewer, and reused for the optional `Mohammad-Ardi-Resume.pdf` download. No backend, storage permissions, or authentication changes.
- Extracted page text is provided to assistive technology after a page is rendered. This is not a fully interactive PDF text/link layer.

## Verification

- `pnpm test`: 28/28 passed, including new zoom-boundary and bounded-render-resolution tests.
- ESLint, production build, and separate post-build `pnpm typecheck`: passed.
- Configured-private-value browser bundle scan: passed for 27 assets; values were not printed. This is not an exhaustive secret scan.
- Configured-private-value repository scan: passed for 202 current files and textual Git history; values were not printed.
- Actual development-browser checks through the supported computer-use interface: desktop CSS viewport 1440×900 produced dialog bounds x=0, y=0, width=1440, height=900. Keyboard scrolling reached the final page of the owner's two-page document. Zoom to 125% enlarged the page; Fit width restored 100%.
- Mobile CSS viewport 375×812: dialog filled the viewport, every header/control stayed within its width, zoom reached 200%, and keyboard horizontal panning/vertical scrolling produced positive scrollLeft/scrollTop. Physical touch gestures were not separately automated.
- Browser-triggered download after preview produced `Mohammad-Ardi-Resume.pdf` in Downloads. The actual file was 448,859 bytes and started with `%PDF-`.
- Escape returned focus to View My CV. Temporary viewport overrides were reset.

Screenshot exports were inspected and discarded because they omitted the canvas pixels that were visible during live browser inspection. They are not valid visual evidence. After the production restart, the browser automation connection refused the localhost page, although an independent HTTP request returned 200. A fresh production-browser screenshot is therefore not claimed; the functioning live interaction checks above were performed against the development preview. No alternate raw browser automation was used.

The production preview is running at http://localhost:3103. Changes are local and uncommitted; no deployment was made. Scripts locating the resume trigger were updated for the View My CV label and computed overflow behavior. Next dev's newly generated, otherwise empty AGENTS.md artifact was removed after verification to preserve the existing documentation organization.
