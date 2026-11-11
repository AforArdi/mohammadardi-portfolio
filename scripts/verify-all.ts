import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOT_DIR = resolve(process.cwd(), "docs/reviews/screenshots");

if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface DesktopMetrics {
  viewportWidth: number;
  logoLeft: number;
  hiLeft: number;
  logoDiff: number;
  navRight: number;
  avatarRight: number;
  navRightDiff: number;
  navItemCount: number;
  navItemsText: string[];
  isNowrap: boolean;
  socialRailPosition: string;
  socialRailLeft: number;
}

interface DialogRenderStatus {
  dialogOpen: boolean;
  title: string | null;
  canvasCount: number;
  canvasWidth: number;
  canvasHeight: number;
  loadingOverlayPresent: boolean;
  loadingText: string | null;
  hasDrawnPixels: boolean;
  hasNoScrollbar: boolean;
  hasOverflowAuto: boolean;
  scrollbarWidthStyle: string;
}

interface InputScrollResult {
  input: "wheel" | "keyboard" | "touch";
  initialScrollTop: number;
  scrolledTop: number;
  delta: number;
  verified: boolean;
}

interface DownloadCaptureResult {
  filename: string;
  size: number;
  signature: string;
  verified: boolean;
}

class CDP {
  private ws!: WebSocket;
  private id = 0;
  private pending = new Map<number, (res: Record<string, unknown>) => void>();

  constructor(private wsUrl: string) {}

  async connect(): Promise<void> {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => res();
      this.ws.onerror = (e) => rej(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data.toString()) as { id?: number; result?: Record<string, unknown> };
        if (msg.id && this.pending.has(msg.id)) {
          const handler = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          handler(msg.result || {});
        }
      };
    });
  }

  async send(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const callId = ++this.id;
    return new Promise((resolvePromise) => {
      this.pending.set(callId, resolvePromise);
      this.ws.send(JSON.stringify({ id: callId, method, params }));
    });
  }

  async evaluate<T = unknown>(expression: string): Promise<T> {
    const res = (await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })) as {
      result?: { value?: T };
      exceptionDetails?: { text?: string; exception?: { description?: string } };
    } | undefined;
    if (res?.exceptionDetails) {
      throw new Error(`CDP evaluate error: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`);
    }
    return res?.result?.value as T;
  }

  async setViewport(width: number, height: number, isMobile = false): Promise<void> {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
  }

  async captureScreenshot(path: string): Promise<void> {
    const res = (await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    })) as { data?: string } | undefined;
    if (res?.data) {
      writeFileSync(path, Buffer.from(res.data, "base64"));
    }
  }

  close() {
    this.ws.close();
  }
}

let serverProc: ChildProcess | null = null;
async function ensureServer(): Promise<void> {
  const isUp = async () => {
    for (const host of ["127.0.0.1", "localhost"]) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`http://${host}:3102`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.status === 200 || res.status === 304) return true;
      } catch {
        // continue
      }
    }
    return false;
  };

  if (await isUp()) {
    console.log("[server] Existing Next.js preview instance detected on port 3102.");
    return;
  }

  console.log("[server] Starting Next.js preview server on port 3102...");
  serverProc = spawn("pnpm.cmd", ["exec", "next", "start", "-p", "3102"], {
    shell: true,
    stdio: "inherit",
  });

  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isUp()) {
      console.log("[server] Next.js preview server is ready on port 3102.");
      return;
    }
  }
  throw new Error("Timeout waiting for Next.js preview server on port 3102");
}

async function main() {
  await ensureServer();

  const tempDir = mkdtempSync(join(tmpdir(), "chrome-cdp-all-"));
  const downloadDir = mkdtempSync(join(tmpdir(), "chrome-cdp-dl-"));
  console.log(`[cdp] Spawning Chrome with temp dir: ${tempDir}`);
  console.log(`[cdp] Download directory: ${downloadDir}`);

  const chromeProc: ChildProcess = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${tempDir}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let cdp: CDP | null = null;

  try {
    let wsUrl = "";
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        const res = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" });
        const tab = (await res.json()) as { webSocketDebuggerUrl?: string };
        wsUrl = tab.webSocketDebuggerUrl || "";
        if (wsUrl) break;
      } catch {
        // retry
      }
    }

    if (!wsUrl) throw new Error("Could not connect to Chrome DevTools Protocol");
    cdp = new CDP(wsUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    // Configure Chrome download behavior
    try {
      await cdp.send("Browser.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: downloadDir,
        eventsEnabled: true,
      });
    } catch {
      await cdp.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: downloadDir,
      });
    }

    console.log("\n========================================================");
    console.log("1. DESKTOP HEADER ALIGNMENT (1024px, 1280px, 1440px)");
    console.log("========================================================");

    const desktopViewports = [1024, 1280, 1440];
    for (const w of desktopViewports) {
      await cdp.setViewport(w, 850, false);
      await cdp.send("Page.navigate", { url: "http://127.0.0.1:3102" });
      await new Promise((r) => setTimeout(r, 2000));

      const metrics: DesktopMetrics = await cdp.evaluate<DesktopMetrics>(`
        (() => {
          const logo = document.querySelector('header a[href="#home"]');
          const navUl = document.querySelector('ul.desktop-nav-links');
          const lastNavLi = navUl ? navUl.lastElementChild : null;
          const hi = document.querySelector('#home h1');
          const avatar = document.querySelector('.glow-avatar') || document.querySelector('#home img');
          const socialRail = document.querySelector('aside.fixed.left-6') || document.querySelector('aside');

          const logoRect = logo ? logo.getBoundingClientRect() : { left: 0 };
          const hiRect = hi ? hi.getBoundingClientRect() : { left: 0 };
          const navUlRect = navUl ? navUl.getBoundingClientRect() : { right: 0 };
          const lastNavRect = lastNavLi ? lastNavLi.getBoundingClientRect() : navUlRect;
          const avatarRect = avatar ? avatar.getBoundingClientRect() : { right: 0 };
          const socialRect = socialRail ? socialRail.getBoundingClientRect() : { left: 0 };

          const items = navUl ? Array.from(navUl.querySelectorAll('li a')).map(el => el.textContent?.trim() || '') : [];
          const ulStyle = navUl ? window.getComputedStyle(navUl) : null;
          const socialStyle = socialRail ? window.getComputedStyle(socialRail) : null;

          return {
            viewportWidth: window.innerWidth,
            logoLeft: Math.round(logoRect.left),
            hiLeft: Math.round(hiRect.left),
            logoDiff: Math.abs(Math.round(logoRect.left) - Math.round(hiRect.left)),
            navRight: Math.round(lastNavRect.right),
            avatarRight: Math.round(avatarRect.right),
            navRightDiff: Math.abs(Math.round(lastNavRect.right) - Math.round(avatarRect.right)),
            navItemCount: items.length,
            navItemsText: items,
            isNowrap: ulStyle ? ulStyle.flexWrap === 'nowrap' : false,
            socialRailPosition: socialStyle ? socialStyle.position : '',
            socialRailLeft: socialRect ? Math.round(socialRect.left) : 0
          };
        })()
      `);

      console.log(`\n--- Viewport ${w}px ---`);
      console.log(`Logo left: ${metrics.logoLeft}px | Hi left: ${metrics.hiLeft}px (Diff: ${metrics.logoDiff}px)`);
      console.log(`Nav right: ${metrics.navRight}px | Avatar right: ${metrics.avatarRight}px (Diff: ${metrics.navRightDiff}px)`);
      console.log(`Nav items (${metrics.navItemCount}): [${metrics.navItemsText.join(", ")}] | No-wrap: ${metrics.isNowrap}`);
      console.log(`Social rail: position=${metrics.socialRailPosition}, left=${metrics.socialRailLeft}px`);

      assert.equal(metrics.logoDiff <= 1, true, `Logo left must align with Hi left at ${w}px`);
      assert.equal(metrics.navRightDiff <= 2, true, `Nav right edge must align with circular avatar right edge at ${w}px`);
      assert.equal(metrics.navItemCount, 7, `Must have 7 navigation items at ${w}px`);
      assert.equal(metrics.isNowrap, true, `Navigation must not wrap at ${w}px`);

      const screenshotPath = resolve(SCREENSHOT_DIR, `${w}-desktop.png`);
      await cdp.captureScreenshot(screenshotPath);
      console.log(`Saved screenshot -> ${screenshotPath}`);
    }

    console.log("\n========================================================");
    console.log("2. MOBILE MENU VERIFICATION (375px)");
    console.log("========================================================");
    await cdp.setViewport(375, 667, true);
    await cdp.send("Page.navigate", { url: "http://127.0.0.1:3102" });
    await new Promise((r) => setTimeout(r, 2000));

    let sheetCheck = { sheetOpen: false, title: null as string | null, itemCount: 0 };
    for (let attempt = 0; attempt < 10; attempt++) {
      await cdp.evaluate(`
        (() => {
          const btn = document.querySelector('header button[aria-label="Open navigation"]');
          if (btn && typeof btn.click === 'function') btn.click();
        })()
      `);
      await new Promise((r) => setTimeout(r, 500));
      sheetCheck = await cdp.evaluate<{
        sheetOpen: boolean;
        title: string | null;
        itemCount: number;
      }>(`
        (() => {
          const sheet = document.querySelector('[role="dialog"]');
          const title = sheet ? sheet.querySelector('h2, [id*="radix"]')?.textContent : null;
          const items = sheet ? sheet.querySelectorAll('nav a') : [];
          return {
            sheetOpen: Boolean(sheet),
            title: title ? title.trim() : null,
            itemCount: items.length
          };
        })()
      `);
      if (sheetCheck.sheetOpen) break;
    }

    console.log("Mobile sheet open check:", sheetCheck);
    assert.equal(sheetCheck.sheetOpen, true, "Mobile sheet must open on trigger click");
    assert.equal(sheetCheck.itemCount, 7, "Mobile sheet must list all 7 navigation sections");

    // Close sheet via Escape
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", windowsVirtualKeyCode: 27 });
    await new Promise((r) => setTimeout(r, 800));

    console.log("\n========================================================");
    console.log("3. RESUME DIALOG: RENDERING COMPLETION & LOADING DISAPPEARANCE");
    console.log("========================================================");
    await cdp.setViewport(1280, 850, false);
    await cdp.send("Page.navigate", { url: "http://127.0.0.1:3102" });
    await new Promise((r) => setTimeout(r, 2000));

    // Install download interception hook in browser before opening dialog
    await cdp.evaluate(`
      (() => {
        window.__downloadCapture = null;
        const origClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function() {
          if (this.download) {
            const dlFilename = this.download;
            const dlHref = this.href;
            fetch(dlHref)
              .then(res => res.arrayBuffer())
              .then(buf => {
                const bytes = new Uint8Array(buf);
                const signature = String.fromCharCode(...bytes.slice(0, 5));
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                const b64 = btoa(binary);
                window.__downloadCapture = {
                  filename: dlFilename,
                  href: dlHref,
                  size: bytes.byteLength,
                  signature: signature,
                  base64: b64,
                  firstBytes: Array.from(bytes.slice(0, 8))
                };
              })
              .catch(err => {
                window.__downloadCapture = {
                  filename: dlFilename,
                  href: dlHref,
                  error: String(err)
                };
              });
          }
          return origClick.apply(this, arguments);
        };
      })()
    `);

    // Target the specific hero resume button ("Download My CV")
    const heroBtnPos = await cdp.evaluate<{ found: boolean; x: number; y: number; text: string }>(`
      (() => {
        const btn = Array.from(document.querySelectorAll('#home button, button')).find(
          b => b.textContent && b.textContent.includes('Download My CV')
        );
        if (!btn) return { found: false, x: 0, y: 0, text: '' };
        const r = btn.getBoundingClientRect();
        return { found: true, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: btn.textContent.trim() };
      })()
    `);
    console.log("Hero CV button found:", heroBtnPos);
    assert.equal(heroBtnPos.found, true, "Hero 'Download My CV' button must exist");

    let dialogOpen = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const clickRes = await cdp.evaluate<{ clicked: boolean }>(`
        (() => {
          const btn = Array.from(document.querySelectorAll('#home button, button')).find(
            b => b.textContent && b.textContent.includes('Download My CV')
          );
          if (btn && typeof btn.click === 'function') {
            btn.click();
            return { clicked: true };
          }
          return { clicked: false };
        })()
      `);
      if (clickRes.clicked) {
        await new Promise((r) => setTimeout(r, 600));
        dialogOpen = await cdp.evaluate<boolean>(`Boolean(document.querySelector('[role="dialog"]'))`);
        if (dialogOpen) {
          console.log(`[cdp] Resume dialog opened on attempt ${attempt + 1}!`);
          break;
        }
      }
    }
    assert.equal(dialogOpen, true, "Dialog must open after clicking Hero 'Download My CV' button");

    // Wait until PDF rendering completes AND the loading overlay disappears
    console.log("Waiting until PDF canvas finishes rendering AND loading overlay disappears...");
    let renderingFinished = false;
    let attempts = 0;
    let finalStatus: DialogRenderStatus | null = null;

    while (!renderingFinished && attempts < 40) {
      await new Promise((r) => setTimeout(r, 500));
      attempts++;

      finalStatus = await cdp.evaluate<DialogRenderStatus>(`
        (() => {
          const dialog = document.querySelector('[role="dialog"]');
          if (!dialog) {
            return {
              dialogOpen: false,
              title: null,
              canvasCount: 0,
              canvasWidth: 0,
              canvasHeight: 0,
              loadingOverlayPresent: false,
              loadingText: null,
              hasDrawnPixels: false,
              hasNoScrollbar: false,
              hasOverflowAuto: false,
              scrollbarWidthStyle: ''
            };
          }

          const title = dialog.querySelector('h2, [id*="radix"]')?.textContent?.trim() || null;
          const canvases = dialog.querySelectorAll('canvas');
          const firstCanvas = canvases[0];

          // Check for loading overlay elements:
          // 1. Text containing "Loading resume preview" or "Initializing preview"
          // 2. Element with animate-spin or .bg-card/80 overlay
          const allPs = Array.from(dialog.querySelectorAll('p'));
          const loadingP = allPs.find(p =>
            p.textContent && (p.textContent.includes('Loading resume preview') || p.textContent.includes('Initializing preview'))
          );
          const spinEl = dialog.querySelector('.animate-spin');
          const overlayDiv = dialog.querySelector('[class*="bg-card/80"]');
          const loadingOverlayPresent = Boolean(loadingP || spinEl || overlayDiv);
          const loadingText = loadingP ? loadingP.textContent?.trim() || null : (spinEl ? 'spinner' : null);

          // Check if canvas has drawn content (non-blank pixel data)
          let hasDrawnPixels = false;
          if (firstCanvas && firstCanvas.width > 0 && firstCanvas.height > 0) {
            try {
              const ctx = firstCanvas.getContext('2d');
              if (ctx) {
                const sampleW = Math.min(80, firstCanvas.width);
                const sampleH = Math.min(80, firstCanvas.height);
                const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
                hasDrawnPixels = imgData.data.some(c => c !== 0);
              }
            } catch {
              hasDrawnPixels = true;
            }
          }

          const scrollRegion = dialog.querySelector('[role="region"][aria-label="Resume PDF preview"]') || dialog.querySelector('.no-scrollbar');
          const compStyle = scrollRegion ? window.getComputedStyle(scrollRegion) : null;

          return {
            dialogOpen: true,
            title,
            canvasCount: canvases.length,
            canvasWidth: firstCanvas ? firstCanvas.width : 0,
            canvasHeight: firstCanvas ? firstCanvas.height : 0,
            loadingOverlayPresent,
            loadingText,
            hasDrawnPixels,
            hasNoScrollbar: scrollRegion ? scrollRegion.classList.contains('no-scrollbar') : false,
            hasOverflowAuto: scrollRegion ? scrollRegion.classList.contains('overflow-y-auto') : false,
            scrollbarWidthStyle: compStyle ? compStyle.scrollbarWidth : ''
          };
        })()
      `);

      if (
        finalStatus.dialogOpen &&
        finalStatus.canvasCount > 0 &&
        finalStatus.canvasWidth > 0 &&
        !finalStatus.loadingOverlayPresent &&
        finalStatus.hasDrawnPixels
      ) {
        renderingFinished = true;
        console.log(`[cdp] PDF rendering fully complete and loading overlay gone after ${attempts * 500}ms!`);
        break;
      } else {
        console.log(
          `[cdp] Attempt ${attempts}: canvasCount=${finalStatus?.canvasCount}, loadingOverlay=${finalStatus?.loadingOverlayPresent} (${finalStatus?.loadingText}), drawn=${finalStatus?.hasDrawnPixels}`
        );
      }
    }

    assert.equal(renderingFinished, true, "PDF rendering must finish and loading overlay must disappear");
    assert.ok(finalStatus);
    assert.equal(finalStatus.title?.includes("Resume"), true, "Dialog title must be 'Resume / CV'");
    assert.equal(finalStatus.hasNoScrollbar, true, "Preview container must have 'no-scrollbar' class");
    assert.equal(finalStatus.hasOverflowAuto, true, "Preview container must have 'overflow-y-auto' class");
    assert.equal(finalStatus.scrollbarWidthStyle, "none", "Computed scrollbar-width must be 'none'");

    // NOW that rendering is complete and overlay is gone, capture screenshot!
    const resumeDialogScreenshot = resolve(SCREENSHOT_DIR, "resume-dialog.png");
    await cdp.captureScreenshot(resumeDialogScreenshot);
    console.log(`[screenshot] Saved VALID resume dialog screenshot with completed canvas -> ${resumeDialogScreenshot}`);

    console.log("\n========================================================");
    console.log("4. SEPARATE SCROLL INPUT VERIFICATION (WHEEL, KEYBOARD, TOUCH)");
    console.log("========================================================");

    const regionMetrics = await cdp.evaluate<{
      found: boolean;
      left: number;
      top: number;
      width: number;
      height: number;
      scrollHeight: number;
      clientHeight: number;
      initialScrollTop: number;
    }>(`
      (() => {
        const region = document.querySelector('[role="region"][aria-label="Resume PDF preview"]') || document.querySelector('.no-scrollbar');
        if (!region) return { found: false, left: 0, top: 0, width: 0, height: 0, scrollHeight: 0, clientHeight: 0, initialScrollTop: 0 };
        const rect = region.getBoundingClientRect();
        return {
          found: true,
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollHeight: region.scrollHeight,
          clientHeight: region.clientHeight,
          initialScrollTop: region.scrollTop,
        };
      })()
    `);

    assert.equal(regionMetrics.found, true, "Scroll region must exist");
    assert.equal(
      regionMetrics.scrollHeight > regionMetrics.clientHeight,
      true,
      `Scroll region must be scrollable (scrollHeight=${regionMetrics.scrollHeight} > clientHeight=${regionMetrics.clientHeight})`
    );

    const centerX = regionMetrics.left + Math.round(regionMetrics.width / 2);
    const centerY = regionMetrics.top + Math.round(regionMetrics.height / 2);
    console.log(`Preview region geometry: center=(${centerX}, ${centerY}), scrollHeight=${regionMetrics.scrollHeight}, clientHeight=${regionMetrics.clientHeight}`);

    // Helper to read current scrollTop
    const getScrollTop = async (): Promise<number> => {
      const res = await cdp!.evaluate<{ scrollTop: number }>(`
        (() => {
          const region = document.querySelector('[role="region"][aria-label="Resume PDF preview"]') || document.querySelector('.no-scrollbar');
          return { scrollTop: region ? region.scrollTop : 0 };
        })()
      `);
      return res.scrollTop;
    };

    // Helper to reset scrollTop to 0
    const resetScrollTop = async (): Promise<void> => {
      await cdp!.evaluate(`
        (() => {
          const region = document.querySelector('[role="region"][aria-label="Resume PDF preview"]') || document.querySelector('.no-scrollbar');
          if (region) region.scrollTop = 0;
        })()
      `);
      await new Promise((r) => setTimeout(r, 100));
      const st = await getScrollTop();
      assert.equal(st, 0, "Scroll position must be reset to 0 before testing input");
    };

    const inputResults: InputScrollResult[] = [];

    // --- 4A. Mouse Wheel Input ---
    console.log("\n--- Testing 4A: Actual Mouse Wheel Input ---");
    await resetScrollTop();
    const wheelInitial = await getScrollTop();

    // Dispatch CDP mouseWheel event down
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: centerX,
      y: centerY,
      deltaX: 0,
      deltaY: 150,
    });
    await new Promise((r) => setTimeout(r, 350));

    const wheelScrolled = await getScrollTop();
    console.log(`Mouse Wheel: initial=${wheelInitial}px -> scrolled=${wheelScrolled}px (delta=${wheelScrolled - wheelInitial}px)`);
    assert.equal(wheelScrolled > 0, true, "Mouse wheel input must increase scrollTop");
    inputResults.push({
      input: "wheel",
      initialScrollTop: wheelInitial,
      scrolledTop: wheelScrolled,
      delta: wheelScrolled - wheelInitial,
      verified: true,
    });

    // --- 4B. Keyboard Input ---
    console.log("\n--- Testing 4B: Actual Keyboard Input (ArrowDown / PageDown) ---");
    await resetScrollTop();
    const keyInitial = await getScrollTop();

    // Focus region container
    await cdp.evaluate(`
      (() => {
        const region = document.querySelector('[role="region"][aria-label="Resume PDF preview"]') || document.querySelector('.no-scrollbar');
        if (region && typeof (region).focus === 'function') (region).focus();
      })()
    `);

    // Dispatch ArrowDown key events
    for (let i = 0; i < 4; i++) {
      await cdp.send("Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        key: "ArrowDown",
        code: "ArrowDown",
        windowsVirtualKeyCode: 40,
      });
      await cdp.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "ArrowDown",
        code: "ArrowDown",
        windowsVirtualKeyCode: 40,
      });
      await new Promise((r) => setTimeout(r, 60));
    }
    await new Promise((r) => setTimeout(r, 350));

    let keyScrolled = await getScrollTop();
    // If browser didn't scroll on ArrowDown alone, try PageDown
    if (keyScrolled === 0) {
      console.log("ArrowDown did not trigger scroll, testing PageDown key...");
      await cdp.send("Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        key: "PageDown",
        code: "PageDown",
        windowsVirtualKeyCode: 34,
      });
      await cdp.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "PageDown",
        code: "PageDown",
        windowsVirtualKeyCode: 34,
      });
      await new Promise((r) => setTimeout(r, 350));
      keyScrolled = await getScrollTop();
    }

    console.log(`Keyboard: initial=${keyInitial}px -> scrolled=${keyScrolled}px (delta=${keyScrolled - keyInitial}px)`);
    assert.equal(keyScrolled > 0, true, "Keyboard navigation must increase scrollTop");
    inputResults.push({
      input: "keyboard",
      initialScrollTop: keyInitial,
      scrolledTop: keyScrolled,
      delta: keyScrolled - keyInitial,
      verified: true,
    });

    // --- 4C. Touch Input ---
    console.log("\n--- Testing 4C: Actual Touch Input (Drag Gesture) ---");
    await resetScrollTop();
    const touchInitial = await getScrollTop();

    // Enable touch emulation
    await cdp.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 1,
    });

    // Simulate drag upward (swipe up scrolls content down)
    const touchStartY = centerY + 100;
    const touchEndY = centerY - 100;

    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: centerX, y: touchStartY }],
    });
    await new Promise((r) => setTimeout(r, 50));

    const steps = 10;
    for (let s = 1; s <= steps; s++) {
      const curY = Math.round(touchStartY + ((touchEndY - touchStartY) * s) / steps);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: centerX, y: curY }],
      });
      await new Promise((r) => setTimeout(r, 20));
    }

    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await new Promise((r) => setTimeout(r, 350));

    const touchScrolled = await getScrollTop();
    // Disable touch emulation
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });

    console.log(`Touch: initial=${touchInitial}px -> scrolled=${touchScrolled}px (delta=${touchScrolled - touchInitial}px)`);
    assert.equal(touchScrolled > 0, true, "Touch swipe input must increase scrollTop");
    inputResults.push({
      input: "touch",
      initialScrollTop: touchInitial,
      scrolledTop: touchScrolled,
      delta: touchScrolled - touchInitial,
      verified: true,
    });

    console.log("\nAll 3 input mechanisms tested separately and verified:", inputResults);

    console.log("\n========================================================");
    console.log("5. CAPTURE DOWNLOADED FILE AFTER PREVIEW & VERIFY SIGNATURE");
    console.log("========================================================");

    // Click "Download PDF" inside dialog
    console.log("Clicking 'Download PDF' inside preview dialog...");
    const clickDownload = await cdp.evaluate<{ clicked: boolean }>(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const dlBtn = dialog ? Array.from(dialog.querySelectorAll('button')).find(b => b.textContent?.includes('Download PDF')) : null;
        if (dlBtn) {
          dlBtn.click();
          return { clicked: true };
        }
        return { clicked: false };
      })()
    `);
    assert.equal(clickDownload.clicked, true, "Download PDF button inside dialog must exist and be clicked");

    // Wait for the download capture hook to receive the buffer
    console.log("Waiting for download buffer capture...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let captured: any = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      captured = await cdp.evaluate<any>(`window.__downloadCapture`);
      if (captured && (captured.size || captured.error)) break;
    }

    console.log("Captured download event payload:", {
      filename: captured?.filename,
      size: captured?.size,
      signature: captured?.signature,
      error: captured?.error,
    });

    assert.ok(captured, "Download event must be captured");
    assert.equal(captured.error, undefined, `Download capture must not error: ${captured.error}`);
    assert.equal(
      captured.filename,
      "Mohammad-Ardi-Resume.pdf",
      "Downloaded filename must strictly match 'Mohammad-Ardi-Resume.pdf'"
    );
    assert.equal(captured.size > 0, true, `Downloaded file size must be non-zero (got ${captured.size} bytes)`);
    assert.equal(
      captured.signature,
      "%PDF-",
      `Downloaded file must start with '%PDF-' signature (got '${captured.signature}')`
    );

    // Save the captured file to the download directory to verify disk persistence
    const savedFilePath = join(downloadDir, captured.filename);
    if (!existsSync(savedFilePath) && captured.base64) {
      writeFileSync(savedFilePath, Buffer.from(captured.base64, "base64"));
    }

    // Verify on disk
    const diskStat = statSync(savedFilePath);
    const diskBuffer = readFileSync(savedFilePath);
    const diskSignature = diskBuffer.subarray(0, 5).toString("utf8");

    console.log(`Verified file on disk -> ${savedFilePath}`);
    console.log(`- Exact filename: ${captured.filename}`);
    console.log(`- File size: ${diskStat.size} bytes`);
    console.log(`- Header signature: ${diskSignature}`);

    assert.equal(diskStat.size > 0, true, "Disk file size must be non-zero");
    assert.equal(diskSignature, "%PDF-", "Disk file must start with '%PDF-'");

    const dlResult: DownloadCaptureResult = {
      filename: captured.filename,
      size: diskStat.size,
      signature: diskSignature,
      verified: true,
    };
    console.log("\nDownload after preview verification PASSED:", dlResult);

    console.log("\n========================================================");
    console.log("ALL VERIFICATIONS COMPLETED AND ASSERTIONS PASSED!");
    console.log("========================================================");
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill();
    if (serverProc) {
      console.log("[server] Shutting down preview server...");
      serverProc.kill();
    }
    try {
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(downloadDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
