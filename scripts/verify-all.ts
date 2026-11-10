import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
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
  hasNoScrollbar: boolean;
  hasOverflowAuto: boolean;
  scrollbarWidthStyle: string;
}

interface ScrollTestResult {
  scrollHeight: number;
  clientHeight: number;
  canScroll: boolean;
  scrolledTop: number;
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
    })) as { result?: { value?: T } } | undefined;
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

async function main() {
  const tempDir = mkdtempSync(join(tmpdir(), "chrome-cdp-all-"));
  console.log(`[cdp] Spawning Chrome with temp dir: ${tempDir}`);

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

    console.log("\n========================================================");
    console.log("1. DESKTOP HEADER ALIGNMENT (1024px, 1280px, 1440px)");
    console.log("========================================================");

    const desktopViewports = [1024, 1280, 1440];
    for (const w of desktopViewports) {
      await cdp.setViewport(w, 850, false);
      await cdp.send("Page.navigate", { url: "http://localhost:3102" });
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
    await cdp.send("Page.navigate", { url: "http://localhost:3102" });
    await new Promise((r) => setTimeout(r, 1500));

    const mobileBefore = await cdp.evaluate<{ hamburgerFound: boolean }>(`
      (() => {
        const btn = document.querySelector('header button[aria-label="Open navigation"]');
        return { hamburgerFound: Boolean(btn) };
      })()
    `);
    assert.equal(mobileBefore.hamburgerFound, true, "Hamburger button must be present at 375px");

    // Click hamburger button to open mobile sheet
    await cdp.evaluate(`
      (() => {
        const btn = document.querySelector('header button[aria-label="Open navigation"]');
        btn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 1000));

    const sheetCheck = await cdp.evaluate<{
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
    console.log("Mobile sheet open check:", sheetCheck);
    assert.equal(sheetCheck.sheetOpen, true, "Mobile sheet must open on trigger click");
    assert.equal(sheetCheck.itemCount, 7, "Mobile sheet must list all 7 navigation sections");

    // Close sheet via Escape
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", windowsVirtualKeyCode: 27 });
    await new Promise((r) => setTimeout(r, 800));

    console.log("\n========================================================");
    console.log("3. CORRECTED RESUME DIALOG & RENDERED PDF CANVAS");
    console.log("========================================================");
    await cdp.setViewport(1280, 850, false);
    await cdp.send("Page.navigate", { url: "http://localhost:3102" });
    await new Promise((r) => setTimeout(r, 2000));

    // Install download event listener in browser
    await cdp.evaluate(`
      (() => {
        window.__downloadEvents = [];
        const origClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function() {
          if (this.download) {
            window.__downloadEvents.push({
              download: this.download,
              href: this.href,
              time: Date.now()
            });
          }
          return origClick.apply(this, arguments);
        };
      })()
    `);

    // Target the specific hero resume button ("Download My CV")
    const clickTrigger = await cdp.evaluate<{ found: boolean; text: string }>(`
      (() => {
        const btn = Array.from(document.querySelectorAll('#home button, button')).find(
          b => b.textContent && b.textContent.includes('Download My CV')
        );
        if (btn) {
          btn.click();
          return { found: true, text: btn.textContent.trim() };
        }
        return { found: false, text: '' };
      })()
    `);
    console.log("Hero CV button click:", clickTrigger);
    assert.equal(clickTrigger.found, true, "Hero 'Download My CV' button must exist");

    // Wait for the Resume Dialog to open and PDF canvas to finish rendering
    console.log("Waiting for PDF canvas rendering in dialog...");
    let canvasReady = false;
    let attempts = 0;
    while (!canvasReady && attempts < 30) {
      await new Promise((r) => setTimeout(r, 500));
      attempts++;
      const status: DialogRenderStatus = await cdp.evaluate<DialogRenderStatus>(`
        (() => {
          const dialog = document.querySelector('[role="dialog"]');
          if (!dialog) return { dialogOpen: false, title: null, canvasCount: 0, canvasWidth: 0, canvasHeight: 0, hasNoScrollbar: false, hasOverflowAuto: false, scrollbarWidthStyle: '' };

          const title = dialog.querySelector('h2, [id*="radix"]')?.textContent?.trim() || null;
          const canvases = dialog.querySelectorAll('canvas');
          const firstCanvas = canvases[0];
          const scrollRegion = dialog.querySelector('[role="region"][aria-label="Resume PDF preview"]') || dialog.querySelector('.no-scrollbar');
          const compStyle = scrollRegion ? window.getComputedStyle(scrollRegion) : null;

          return {
            dialogOpen: true,
            title,
            canvasCount: canvases.length,
            canvasWidth: firstCanvas ? firstCanvas.width : 0,
            canvasHeight: firstCanvas ? firstCanvas.height : 0,
            hasNoScrollbar: scrollRegion ? scrollRegion.classList.contains('no-scrollbar') : false,
            hasOverflowAuto: scrollRegion ? scrollRegion.classList.contains('overflow-y-auto') : false,
            scrollbarWidthStyle: compStyle ? compStyle.scrollbarWidth : ''
          };
        })()
      `);

      if (status.canvasCount > 0 && status.canvasWidth > 0) {
        canvasReady = true;
        console.log(`PDF canvas rendered successfully after ${attempts * 500}ms!`);
        console.log("Dialog state:", status);
        assert.equal(status.title?.includes("Resume"), true, "Dialog title must be 'Resume / CV'");
        assert.equal(status.hasNoScrollbar, true, "Preview container must have 'no-scrollbar' class");
        assert.equal(status.hasOverflowAuto, true, "Preview container must have 'overflow-y-auto' class");
        assert.equal(status.scrollbarWidthStyle, "none", "Computed scrollbar-width must be 'none'");
      }
    }

    assert.equal(canvasReady, true, "PDF canvas must render in preview dialog");

    // Test scrolling (wheel / keyboard / touch):
    // verify scrollHeight > clientHeight and test scrolling behavior
    const scrollTest: ScrollTestResult = await cdp.evaluate<ScrollTestResult>(`
      (() => {
        const region = document.querySelector('[role="region"][aria-label="Resume PDF preview"]') || document.querySelector('.no-scrollbar');
        if (!region) return { scrollHeight: 0, clientHeight: 0, canScroll: false, scrolledTop: 0 };

        const initialScrollHeight = region.scrollHeight;
        const clientHeight = region.clientHeight;

        // Perform scroll action
        region.scrollTop = 150;
        const scrolledTop = region.scrollTop;

        // Reset scroll
        region.scrollTop = 0;

        return {
          scrollHeight: initialScrollHeight,
          clientHeight,
          canScroll: initialScrollHeight > clientHeight,
          scrolledTop
        };
      })()
    `);
    console.log("Preview scrollability test:", scrollTest);
    assert.equal(scrollTest.canScroll, true, "Preview container must have content exceeding clientHeight (scrollable)");
    assert.equal(scrollTest.scrolledTop > 0, true, "Container must respond to scroll updates");

    // Capture valid screenshot of open Resume Dialog with rendered canvas!
    const resumeDialogScreenshot = resolve(SCREENSHOT_DIR, "resume-dialog.png");
    await cdp.captureScreenshot(resumeDialogScreenshot);
    console.log(`Saved VALID resume dialog screenshot -> ${resumeDialogScreenshot}`);

    // Test download after preview: click "Download PDF" inside dialog
    console.log("Testing Download PDF action inside dialog...");
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

    await new Promise((r) => setTimeout(r, 1000));

    const downloadEvents = await cdp.evaluate<{
      events: Array<{ download: string; href: string }>;
    }>(`
      (() => {
        return { events: window.__downloadEvents || [] };
      })()
    `);

    console.log("Download event intercepted:", downloadEvents);
    assert.equal(downloadEvents.events.length > 0, true, "Download anchor click must be triggered");
    assert.equal(
      downloadEvents.events[0].download,
      "Mohammad-Ardi-Resume.pdf",
      "Downloaded filename must exactly be 'Mohammad-Ardi-Resume.pdf'"
    );

    console.log("\n========================================================");
    console.log("ALL VERIFICATIONS COMPLETED AND ASSERTIONS PASSED!");
    console.log("========================================================");
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
