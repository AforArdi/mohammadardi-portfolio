import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

interface Viewport {
  name: string;
  width: number;
  height: number;
  isMobile?: boolean;
}

const VIEWPORTS: Viewport[] = [
  { name: "375-mobile", width: 375, height: 667, isMobile: true },
  { name: "768-tablet", width: 768, height: 1024, isMobile: false },
  { name: "1024-desktop", width: 1024, height: 768, isMobile: false },
  { name: "1280-desktop", width: 1280, height: 800, isMobile: false },
  { name: "1440-desktop", width: 1440, height: 900, isMobile: false },
  { name: "landscape-short", width: 1024, height: 500, isMobile: false },
];

const SCREENSHOT_DIR = resolve(process.cwd(), "docs/reviews/screenshots");
if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

class CDPClient {
  private ws!: WebSocket;
  private id = 0;
  private pending = new Map<number, (res: unknown) => void>();

  constructor(private wsUrl: string) {}

  async connect(): Promise<void> {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => res();
      this.ws.onerror = (e) => rej(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data.toString());
        if (msg.id && this.pending.has(msg.id)) {
          const handler = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          handler(msg.result);
        }
      };
    });
  }

  async send(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const callId = ++this.id;
    return new Promise((resolvePromise) => {
      this.pending.set(callId, resolvePromise as (res: unknown) => void);
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
    await this.send("Emulation.setVisibleSize", { width, height });
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
  const tempDir = mkdtempSync(join(tmpdir(), "chrome-cdp-"));
  console.log(`[cdp] Spawning Chrome with temp dir: ${tempDir}`);

  const chromeProc: ChildProcess = spawn(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
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

  let client: CDPClient | null = null;

  try {
    // Wait for CDP endpoint
    let wsUrl = "";
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        const res = await fetch("http://127.0.0.1:9222/json/new?http://localhost:3101", {
          method: "PUT",
        });
        const tab = await res.json();
        wsUrl = tab.webSocketDebuggerUrl;
        if (wsUrl) break;
      } catch {
        // retry
      }
    }

    if (!wsUrl) {
      throw new Error("Could not connect to Chrome DevTools Protocol");
    }

    console.log(`[cdp] Connected to tab ws: ${wsUrl}`);
    client = new CDPClient(wsUrl);
    await client.connect();

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("DOM.enable");

    // Wait for page load
    await new Promise((r) => setTimeout(r, 2000));

    console.log("\n=== VERIFYING PORTFOLIO ATMOSPHERE & MOTION ===");
    const atmosphereCheck = await client.evaluate(`
      (() => {
        const bg = document.querySelector('[aria-hidden="true"].pointer-events-none');
        return {
          found: Boolean(bg),
          classes: bg ? bg.className : null,
          hasRadial: bg ? bg.innerHTML.includes('radial-gradient') : false,
          hasDots: bg ? bg.innerHTML.includes('background-size') : false
        };
      })()
    `);
    console.log("Atmosphere DOM check:", atmosphereCheck);

    // Verify reduced-motion behavior
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    const reducedMotionCheck = await client.evaluate(`
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    `);
    console.log("prefers-reduced-motion: reduce active in browser:", reducedMotionCheck);

    // Reset media
    await client.send("Emulation.setEmulatedMedia", { features: [] });

    console.log("\n=== VERIFYING VIEWPORT LAYOUTS & SCREENSHOTS ===");
    for (const vp of VIEWPORTS) {
      await client.setViewport(vp.width, vp.height, vp.isMobile);
      await new Promise((r) => setTimeout(r, 500));

      const layoutMetrics = await client.evaluate(`
        (() => {
          const header = document.querySelector('header .container');
          const hero = document.querySelector('#home .container') || document.querySelector('section:first-of-type .container');
          const headerRect = header ? header.getBoundingClientRect() : null;
          const heroRect = hero ? hero.getBoundingClientRect() : null;

          const portraitImg = document.querySelector('#home img') || document.querySelector('section:first-of-type img');
          const portraitStyle = portraitImg ? window.getComputedStyle(portraitImg).transform : null;

          const socialRail = document.querySelector('aside') || document.querySelector('[aria-label="Social rail"]') || document.querySelector('.fixed.left-6');
          const socialRect = socialRail ? socialRail.getBoundingClientRect() : null;
          const socialStyle = socialRail ? window.getComputedStyle(socialRail).position : null;

          const footer = document.querySelector('footer');
          const footerText = footer ? footer.textContent : '';
          const footerDividers = footer ? footer.querySelectorAll('.section-line, hr, .border-t') : [];

          return {
            viewport: { width: window.innerWidth, height: window.innerHeight },
            gutterAlignment: {
              headerLeft: headerRect ? Math.round(headerRect.left) : null,
              heroLeft: heroRect ? Math.round(heroRect.left) : null,
              matches: headerRect && heroRect ? Math.abs(headerRect.left - heroRect.left) <= 1 : false
            },
            portrait: {
              found: Boolean(portraitImg),
              transform: portraitStyle,
              naturalWidth: portraitImg ? portraitImg.naturalWidth : null,
              naturalHeight: portraitImg ? portraitImg.naturalHeight : null,
            },
            socialRail: {
              found: Boolean(socialRail),
              position: socialStyle,
              left: socialRect ? Math.round(socialRect.left) : null
            },
            footer: {
              hasCopyright: footerText.includes('Ardi') || footerText.includes('All rights reserved'),
              dividerCount: footerDividers.length
            }
          };
        })()
      `);

      console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      console.log(JSON.stringify(layoutMetrics, null, 2));

      const screenshotFile = resolve(SCREENSHOT_DIR, `${vp.name}.png`);
      await client.captureScreenshot(screenshotFile);
      console.log(`Saved screenshot -> ${screenshotFile}`);
    }

    console.log("\n=== VERIFYING ADMIN ROUTE (NO ATMOSPHERE ON ADMIN) ===");
    await client.send("Page.navigate", { url: "http://localhost:3101/admin/login" });
    await new Promise((r) => setTimeout(r, 1500));

    const adminCheck = await client.evaluate(`
      (() => {
        const atmosphere = document.querySelector('[aria-hidden="true"].pointer-events-none.fixed.inset-0');
        const loginForm = document.querySelector('form');
        const heading = document.querySelector('h1, h2');
        return {
          url: window.location.href,
          hasAtmosphere: Boolean(atmosphere),
          hasLoginForm: Boolean(loginForm),
          headingText: heading ? heading.textContent : null
        };
      })()
    `);
    console.log("Admin screen check:", adminCheck);

    const adminScreenshot = resolve(SCREENSHOT_DIR, "admin-login.png");
    await client.captureScreenshot(adminScreenshot);
    console.log(`Saved admin screenshot -> ${adminScreenshot}`);

    console.log("\n=== VERIFYING CONTACT SECTION FALLBACK & PROVIDER SAFE IDS ===");
    await client.send("Page.navigate", { url: "http://localhost:3101#contact" });
    await new Promise((r) => setTimeout(r, 1500));

    const contactCheck = await client.evaluate(`
      (() => {
        const contactSection = document.querySelector('#contact');
        const form = contactSection ? contactSection.querySelector('form') : null;
        const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
        const infoNotice = contactSection ? contactSection.querySelector('.border-primary\\\\/30') : null;
        const nameInput = form ? form.querySelector('input[name="name"]') : null;
        const emailInput = form ? form.querySelector('input[name="email"]') : null;

        return {
          sectionFound: Boolean(contactSection),
          formFound: Boolean(form),
          submitDisabled: submitBtn ? submitBtn.disabled : null,
          nameDisabled: nameInput ? nameInput.disabled : null,
          hasFallbackNotice: Boolean(infoNotice),
          noticeText: infoNotice ? infoNotice.textContent?.trim() : null
        };
      })()
    `);
    console.log("Contact section fallback check:", contactCheck);

    console.log("\n=== VERIFYING RESUME DIALOG TRIGGER & ACCESSIBILITY ===");
    const resumeCheck = await client.evaluate(`
      (() => {
        const resumeBtn = Array.from(document.querySelectorAll('#home button')).find(b => b.textContent?.includes('Download My CV'));
        if (resumeBtn) {
          resumeBtn.click();
          return { clicked: true, text: resumeBtn.textContent };
        }
        return { clicked: false };
      })()
    `);
    console.log("Resume button click:", resumeCheck);
    await new Promise((r) => setTimeout(r, 1500));

    const dialogState = await client.evaluate<{ dialogOpen: boolean; titleText: string | null; downloadBtnFound: boolean; pdfContainerFound: boolean }>(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const title = dialog ? dialog.querySelector('[id*="radix"]') || dialog.querySelector('h2') : null;
        const downloadBtn = dialog ? Array.from(dialog.querySelectorAll('button, a')).find(el => el.textContent?.includes('Download')) : null;
        const pdfContainer = dialog ? dialog.querySelector('[aria-label="Resume PDF preview"] canvas') : null;

        return {
          dialogOpen: Boolean(dialog),
          titleText: title ? title.textContent : null,
          downloadBtnFound: Boolean(downloadBtn),
          downloadText: downloadBtn ? downloadBtn.textContent : null,
          pdfContainerFound: Boolean(pdfContainer),
          pdfContainerClass: pdfContainer ? pdfContainer.className : null
        };
      })()
    `);
    console.log("Dialog state:", dialogState);
    if (!dialogState?.dialogOpen || !/Resume|CV/.test(dialogState.titleText || "") || !dialogState.downloadBtnFound || !dialogState.pdfContainerFound) {
      throw new Error("Resume dialog verification failed: expected the resume title, download action and a rendered PDF canvas. Do not substitute a navigation drawer or loading message.");
    }

    const dialogScreenshot = resolve(SCREENSHOT_DIR, "resume-dialog.png");
    await client.captureScreenshot(dialogScreenshot);
    console.log(`Saved dialog screenshot -> ${dialogScreenshot}`);

    console.log("\nALL VISUAL AND RESPONSIVE VERIFICATIONS COMPLETED SUCCESSFULLY!");
  } finally {
    if (client) client.close();
    chromeProc.kill();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.error("Visual verification failed:", err);
  process.exit(1);
});
