import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function nowMs() {
  return Date.now();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function step(title, fn) {
  const start = nowMs();
  process.stdout.write(`\n[STEP] ${title}\n`);
  await fn();
  process.stdout.write(`[OK]   ${title} (${nowMs() - start}ms)\n`);
}

function parseArgs(argv) {
  const args = new Set(argv);
  const getValue = (key, fallback = undefined) => {
    const idx = argv.findIndex((a) => a === key);
    if (idx === -1) return fallback;
    return argv[idx + 1] ?? fallback;
  };
  const platformsRaw = getValue('--platforms', '');
  const platforms = platformsRaw
    ? platformsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  return {
    debug: args.has('--debug'),
    suite: getValue('--suite', 'full'),
    maxCases: Number(getValue('--maxCases', '0')) || 0,
    toggleMatrixSingle: getValue('--toggleMatrixSingle', 'each'),
    toggleMatrixMulti: getValue('--toggleMatrixMulti', 'offAllOn'),
    continueOnError: args.has('--continueOnError'),
    // mode:
    // - real (default): 真正打开各平台网站并尝试发送（需要你提前在 userDataDir 登录）
    // - mock: 不访问外网，发送流程用 storage 模拟完成（更稳定，适合 CI）
    mode: getValue('--mode', 'real'),
    platforms,
    userDataDir: getValue('--userDataDir', ''),
    extensionPath: getValue('--extensionPath', path.resolve(__dirname, '..')),
    slowMo: Number(getValue('--slowMo', '0')) || 0
  };
}

async function storageGet(page, keys) {
  return await page.evaluate((keys) => {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => resolve(result));
    });
  }, keys);
}

async function storageSet(page, obj) {
  return await page.evaluate((obj) => {
    return new Promise((resolve) => {
      chrome.storage.local.set(obj, () => resolve(true));
    });
  }, obj);
}

async function storageClear(page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => resolve(true));
    });
  });
}

async function ensureSettingsPage(page) {
  const isSettingsActive = await page.evaluate(() => {
    const settingsPage = document.getElementById('settings-page');
    return !!settingsPage && settingsPage.classList.contains('active');
  });
  if (isSettingsActive) return;

  const settingsBtn = page.locator('#settings-btn');
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
  } else {
    // 如果按钮不可见（例如当前不在主页面），尝试直接切回主页面再进入设置页
    await ensureMainPage(page);
    await page.locator('#settings-btn').click();
  }
  await page.waitForFunction(() => {
    const settingsPage = document.getElementById('settings-page');
    return settingsPage && settingsPage.classList.contains('active');
  });
}

async function ensureMainPage(page) {
  const isMainActive = await page.evaluate(() => {
    const mainPage = document.getElementById('main-page');
    return !!mainPage && mainPage.classList.contains('active');
  });
  if (isMainActive) return;

  const backBtn = page.locator('#back-btn');
  if (await backBtn.isVisible()) {
    await backBtn.click();
  }
  await page.waitForFunction(() => {
    const mainPage = document.getElementById('main-page');
    return mainPage && mainPage.classList.contains('active');
  });
}

async function getVisiblePlatformOrder(page) {
  return await page.$$eval('.platforms-grid .platform-btn', (els) => {
    return els
      .filter((el) => el.style.display !== 'none')
      .map((el) => el.dataset.platform);
  });
}

async function isPlatformActive(page, platform) {
  return await page.$eval(
    `.platform-btn[data-platform="${platform}"]`,
    (el) => el.classList.contains('active')
  );
}

async function platformDisplay(page, platform) {
  return await page.$eval(
    `.platform-btn[data-platform="${platform}"]`,
    (el) => el.style.display
  );
}

async function clickPlatform(page, platform) {
  await page.click(`.platform-btn[data-platform="${platform}"]`);
}

async function dragTogglePlatforms(page, fromPlatform, toPlatform) {
  const from = page.locator(`.platform-btn[data-platform="${fromPlatform}"]`);
  const to = page.locator(`.platform-btn[data-platform="${toPlatform}"]`);
  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();
  assert(fromBox, `Cannot find platform button: ${fromPlatform}`);
  assert(toBox, `Cannot find platform button: ${toPlatform}`);

  const fromX = fromBox.x + fromBox.width / 2;
  const fromY = fromBox.y + fromBox.height / 2;
  const toX = toBox.x + toBox.width / 2;
  const toY = toBox.y + toBox.height / 2;

  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  // Drag-select mode starts after >200ms (or movementX/Y > 5px). We ensure time passes.
  await sleep(260);
  await page.mouse.move(toX, toY, { steps: 6 });
  await page.mouse.up();
}

async function patchSendToAllAIsNoop(page) {
  await page.evaluate(() => {
    if (window.__e2ePatchedSendMessage) return;
    try {
      const original = chrome.runtime.sendMessage.bind(chrome.runtime);
      chrome.runtime.sendMessage = (message, callback) => {
        if (message && message.action === 'sendToAllAIs') {
          if (typeof callback === 'function') {
            callback({ success: true, count: (message.platforms || []).length });
          }
          return;
        }
        return original(message, callback);
      };
      window.__e2ePatchedSendMessage = true;
    } catch {
      // If patching fails, we keep the original behavior.
      window.__e2ePatchedSendMessage = false;
    }
  });
}

async function simulateProgressCompleteForActiveVisiblePlatforms(page) {
  await page.evaluate(async () => {
    const visibleActive = Array.from(document.querySelectorAll('.platform-btn'))
      .filter((btn) => btn.style.display !== 'none')
      .filter((btn) => btn.classList.contains('active'))
      .map((btn) => btn.dataset.platform);

    const statuses = {};
    for (const p of visibleActive) statuses[p] = 'completed';

    const total = visibleActive.length;
    const progress = {
      total,
      opened: total,
      loading: 0,
      completed: total,
      currentAction: '',
      statuses
    };

    await new Promise((resolve) => chrome.storage.local.set({
      progressUpdate: progress,
      progressUpdateTime: Date.now()
    }, resolve));

    // Mirror background behavior: progressComplete is set slightly later.
    await new Promise((resolve) => setTimeout(resolve, 100));
    await new Promise((resolve) => chrome.storage.local.set({ progressComplete: true }, resolve));
  });
}

function normalizePlatformsInput(platformsArg, allPlatforms) {
  if (!platformsArg || platformsArg.length === 0) return allPlatforms;
  if (platformsArg.length === 1) {
    const v = String(platformsArg[0]).toLowerCase();
    if (v === 'all' || v === '*' || v === 'all-platforms') return allPlatforms;
  }
  return platformsArg;
}

function buildToggleMatrix(kind) {
  const off = { startNewChat: false, deepThink: false, webSearch: false, genImage: false };
  const allOn = { startNewChat: true, deepThink: true, webSearch: true, genImage: true };

  if (kind === 'off') return [off];
  if (kind === 'offAllOn') return [off, allOn];
  if (kind === 'each') {
    return [
      off,
      { ...off, startNewChat: true },
      { ...off, deepThink: true },
      { ...off, webSearch: true },
      { ...off, genImage: true },
      allOn
    ];
  }
  if (kind === 'all') {
    const keys = ['startNewChat', 'deepThink', 'webSearch', 'genImage'];
    const matrix = [];
    for (let mask = 0; mask < (1 << keys.length); mask += 1) {
      const t = {};
      for (let i = 0; i < keys.length; i += 1) {
        t[keys[i]] = (mask & (1 << i)) !== 0;
      }
      matrix.push(t);
    }
    return matrix;
  }
  throw new Error(`Unknown toggle matrix: ${kind}. Use one of: off | each | all | offAllOn`);
}

function stringifyToggles(t) {
  const onOff = (v) => (v ? '1' : '0');
  return `N${onOff(t.startNewChat)}-D${onOff(t.deepThink)}-W${onOff(t.webSearch)}-G${onOff(t.genImage)}`;
}

function uniqPlatformSets(sets) {
  const seen = new Set();
  const out = [];
  for (const s of sets) {
    const key = s.join('||');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function buildPlatformSets(basePlatforms, suite) {
  const singles = basePlatforms.map((p) => [p]);

  if (suite === 'smoke') {
    const smokeSingles = singles.slice(0, 1);
    const smokePairs = basePlatforms.length >= 2 ? [[basePlatforms[0], basePlatforms[1]]] : [];
    return {
      singleSets: smokeSingles,
      multiSets: smokePairs
    };
  }

  if (suite === 'allPairs' || suite === 'pairs') {
    const pairs = [];
    for (let i = 0; i < basePlatforms.length; i += 1) {
      for (let j = i + 1; j < basePlatforms.length; j += 1) {
        pairs.push([basePlatforms[i], basePlatforms[j]]);
      }
    }
    const allSet = basePlatforms.length >= 2 ? [basePlatforms] : [];
    return {
      singleSets: singles,
      multiSets: uniqPlatformSets([...pairs, ...allSet])
    };
  }

  // full: 单平台全覆盖 + 代表性组合覆盖（相邻两两组合 + 全量组合）
  const adjacentPairs = [];
  for (let i = 0; i < basePlatforms.length - 1; i += 1) {
    adjacentPairs.push([basePlatforms[i], basePlatforms[i + 1]]);
  }

  // 代表性“不同种组合”（仅在这些平台存在时加入）
  const recommendedCombos = [
    ['ChatGPT', 'Claude'],
    ['ChatGPT', 'Gemini'],
    ['Gemini', 'Grok'],
    ['千问', '豆包'],
    ['DeepSeek', 'Kimi'],
    ['ChatGPT', 'Claude', 'Gemini']
  ].filter((set) => set.every((p) => basePlatforms.includes(p)));

  const allSet = basePlatforms.length >= 2 ? [basePlatforms] : [];
  const multiSets = uniqPlatformSets([...adjacentPairs, ...recommendedCombos, ...allSet]);

  return {
    singleSets: singles,
    multiSets
  };
}

function buildSendCases({ basePlatforms, suite, toggleMatrixSingle, toggleMatrixMulti, maxCases }) {
  const { singleSets, multiSets } = buildPlatformSets(basePlatforms, suite);
  const togglesSingle = buildToggleMatrix(toggleMatrixSingle);
  const togglesMulti = buildToggleMatrix(toggleMatrixMulti);

  const cases = [];

  for (const set of singleSets) {
    for (const t of togglesSingle) {
      cases.push({ platforms: set, toggles: t });
    }
  }

  for (const set of multiSets) {
    for (const t of togglesMulti) {
      cases.push({ platforms: set, toggles: t });
    }
  }

  if (maxCases && maxCases > 0) {
    return cases.slice(0, maxCases);
  }
  return cases;
}

function parseMultiAIFlagLog(text) {
  // Example: "[MultiAI] ChatGPT - deepThink: false"
  const m = text.match(/^\[MultiAI\]\s+(.+?)\s+-\s+(startNewChat|deepThink|webSearch|genImage):\s+(true|false)\b/i);
  if (!m) return null;
  return {
    platform: m[1],
    key: m[2],
    value: m[3].toLowerCase() === 'true'
  };
}

function parseMultiAISentLog(text) {
  // Example: "[MultiAI] ChatGPT sent ✓" or "[MultiAI] DeepSeek sent via Enter ✓"
  const m = text.match(/^\[MultiAI\]\s+(.+?)\s+sent\b/i);
  if (!m) return null;
  return { platform: m[1] };
}

async function applySendCaseConfig(page, platformsToSend, toggles) {
  await page.evaluate(async ({ platformsToSend, toggles }) => {
    const getSettings = () => new Promise((resolve) => chrome.storage.local.get(['settings'], resolve));
    const setSettings = (settings) => new Promise((resolve) => chrome.storage.local.set({ settings }, resolve));
    const setSelected = (selectedPlatforms) => new Promise((resolve) => chrome.storage.local.set({ selectedPlatforms }, resolve));
    const setToggleState = (obj) => new Promise((resolve) => chrome.storage.local.set(obj, resolve));
    const clearProgress = () => new Promise((resolve) => chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete'], resolve));

    await clearProgress();

    const result = await getSettings();
    const settings = result.settings || {};
    settings.visiblePlatforms = platformsToSend;
    settings.platformOrder = platformsToSend;
    await setSettings(settings);
    await setSelected(platformsToSend);

    // 写入 toggle 状态（sendQuery 会以 DOM 状态为准，这里保持 storage 同步）
    await setToggleState({
      startNewChatEnabled: !!toggles.startNewChat,
      deepThinkEnabled: !!toggles.deepThink,
      webSearchEnabled: !!toggles.webSearch,
      genImageEnabled: !!toggles.genImage
    });

    if (typeof loadAndApplySettings === 'function') {
      await loadAndApplySettings();
    }
    if (typeof initPlatformButtons === 'function') {
      await initPlatformButtons();
    }

    // 同步 toggle UI
    const setActive = (id, enabled) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (enabled) el.classList.add('active');
      else el.classList.remove('active');
    };

    setActive('new-chat-toggle', !!toggles.startNewChat);
    setActive('deep-think-toggle', !!toggles.deepThink);
    setActive('web-search-toggle', !!toggles.webSearch);
    setActive('gen-image-toggle', !!toggles.genImage);
  }, { platformsToSend, toggles });
}

async function waitForPopupSuccess(page, timeoutMs) {
  const start = nowMs();
  while (nowMs() - start < timeoutMs) {
    const state = await page.evaluate(() => {
      const status = document.getElementById('status');
      const ok = !!status && status.classList.contains('success');
      const err = !!status && status.classList.contains('error');
      const msg = status?.textContent?.trim() || '';
      const inputDisabled = document.getElementById('query-input')?.disabled === true;
      return { ok, err, msg, inputDisabled };
    });
    if (state.ok) return state;
    if (state.err) {
      throw new Error(`Popup shows error status: ${state.msg}`);
    }
    await sleep(200);
  }
  throw new Error(`Timeout waiting for popup success (>${timeoutMs}ms)`);
}

async function waitForConsoleExpectations(consoleEvents, caseStartMs, platformsToSend, expectedToggles, timeoutMs) {
  const expectedPlatforms = new Set(platformsToSend);
  const expectedKeys = ['startNewChat', 'deepThink', 'webSearch', 'genImage'];

  const done = () => {
    const flags = {};
    const sent = {};
    for (const p of expectedPlatforms) {
      flags[p] = {};
      sent[p] = false;
    }

    for (const e of consoleEvents) {
      if (e.time < caseStartMs) continue;
      if (!e.text || !e.text.startsWith('[MultiAI]')) continue;

      const flag = parseMultiAIFlagLog(e.text);
      if (flag && expectedPlatforms.has(flag.platform)) {
        flags[flag.platform][flag.key] = flag.value;
      }
      const s = parseMultiAISentLog(e.text);
      if (s && expectedPlatforms.has(s.platform)) {
        sent[s.platform] = true;
      }
    }

    for (const p of expectedPlatforms) {
      for (const k of expectedKeys) {
        if (typeof flags[p][k] !== 'boolean') return { ok: false, flags, sent };
        if (flags[p][k] !== expectedToggles[k]) return { ok: false, flags, sent };
      }
      if (!sent[p]) return { ok: false, flags, sent };
    }

    return { ok: true, flags, sent };
  };

  const start = nowMs();
  while (nowMs() - start < timeoutMs) {
    const result = done();
    if (result.ok) return result;
    await sleep(500);
  }

  const last = done();
  throw new Error(
    `Missing expected console signals for platforms: ${platformsToSend.join(', ')}\n` +
      `Expected toggles: ${JSON.stringify(expectedToggles)}\n` +
      `Last parsed flags: ${JSON.stringify(last.flags, null, 2)}\n` +
      `Last parsed sent: ${JSON.stringify(last.sent, null, 2)}\n` +
      `Hint: 若为 real 模式，请确认 --userDataDir 对应 profile 中已登录这些平台，且页面未被风控/二次验证拦截。`
  );
}

async function main() {
  const { debug, suite, maxCases, toggleMatrixSingle, toggleMatrixMulti, continueOnError, mode, platforms, userDataDir, extensionPath, slowMo } =
    parseArgs(process.argv.slice(2));

  assert(fs.existsSync(extensionPath), `Extension path not found: ${extensionPath}`);
  assert(fs.existsSync(path.join(extensionPath, 'manifest.json')), `manifest.json not found in: ${extensionPath}`);

  const persistentUserDataDir = userDataDir
    ? path.resolve(userDataDir)
    : fs.mkdtempSync(path.join(os.tmpdir(), 'askllms-e2e-'));

  if (userDataDir && !fs.existsSync(persistentUserDataDir)) {
    fs.mkdirSync(persistentUserDataDir, { recursive: true });
  }

  let context;

  try {
    await step('Launch Chromium with unpacked extension', async () => {
      context = await chromium.launchPersistentContext(persistentUserDataDir, {
        headless: false, // Chrome extensions are only supported in headed mode
        slowMo,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-features=TranslateUI'
        ]
      });
    });

    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    assert(extensionId, 'Failed to resolve extensionId from service worker url');

    const page = await context.newPage();
    // Collect console logs from all pages opened during the run (including AI tabs created by background).
    const consoleEvents = [];
    const attachConsole = (p) => {
      try {
        p.on('console', (msg) => {
          consoleEvents.push({
            time: Date.now(),
            url: p.url(),
            text: msg.text()
          });
        });
      } catch {
        // ignore
      }
    };
    for (const p of context.pages()) attachConsole(p);
    context.on('page', attachConsole);

    page.on('dialog', async (dialog) => {
      // Settings page uses confirm() + alert() for history clearing.
      await dialog.accept();
    });

    // Prevent the popup logic from closing the window during progress completion.
    await page.addInitScript(() => {
      // eslint-disable-next-line no-global-assign
      window.close = () => {};
    });

    await step('Open popup.html and wait for initialization', async () => {
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      await page.waitForSelector('#query-input');
      await page.waitForFunction(() => window._platformData && window._platformData.success === true);
    });

    await step('Reset storage to a clean state', async () => {
      await storageClear(page);
      // Reload to re-initialize with clean storage.
      await page.reload();
      await page.waitForSelector('#query-input');
      await page.waitForFunction(() => window._platformData && window._platformData.success === true);
    });

    await step('Platform data is loaded and platform buttons exist', async () => {
      const platforms = await page.$$eval('.platform-btn', (els) => els.map((e) => e.dataset.platform));
      assert(platforms.length >= 10, `Expected >=10 platform buttons, got ${platforms.length}`);

      const pd = await page.evaluate(() => window._platformData);
      assert(pd.platformNames && pd.platformNames.length >= 10, 'platformNames missing/too small');
      assert(pd.platformIcons && Object.keys(pd.platformIcons).length >= 10, 'platformIcons missing/too small');
      assert(pd.modelCapabilities && typeof pd.modelCapabilities === 'object', 'modelCapabilities missing');
    });

    await step('Settings: language switch updates i18n texts', async () => {
      await ensureSettingsPage(page);

      // Switch to Chinese
      await page.click('#lang-zh');
      await page.waitForFunction(() => document.getElementById('send-btn')?.textContent?.trim() === '发送');

      // Switch to English
      await page.click('#lang-en');
      await page.waitForFunction(() => document.getElementById('send-btn')?.textContent?.trim() === 'Send');
    });

    await step('Settings: theme switch toggles body class', async () => {
      // Still on settings page
      await page.click('#theme-dark');
      await page.waitForFunction(() => document.body.classList.contains('dark-theme'));
      await page.click('#theme-light');
      await page.waitForFunction(() => document.body.classList.contains('light-theme'));
    });

    await step('Settings: tab group title and color settings persist to storage', async () => {
      // Title input uses debounce (500ms).
      await page.fill('#tab-group-title', 'E2E-Group');
      await sleep(700);

      // Set fixed color mode and pick red.
      await page.click('#color-fixed');
      await page.click('input[name="color"][value="red"]');
      await sleep(200);

      const { settings } = await storageGet(page, ['settings']);
      assert(settings, 'settings not saved');
      assert(settings.tabGroupTitle === 'E2E-Group', `tabGroupTitle not saved: ${settings.tabGroupTitle}`);
      assert(settings.colorMode === 'fixed', `colorMode not saved: ${settings.colorMode}`);
      assert(settings.fixedColor === 'red', `fixedColor not saved: ${settings.fixedColor}`);
    });

    await step('Background: createTabGroup applies title/color from settings (no external sites)', async () => {
      const result = await worker.evaluate(async () => {
        const createTab = (url) => new Promise((resolve) => {
          chrome.tabs.create({ url, active: false }, (tab) => resolve(tab));
        });

        const removeTabs = (tabIds) => new Promise((resolve) => {
          chrome.tabs.remove(tabIds, () => resolve(true));
        });

        const t1 = await createTab('about:blank');
        const t2 = await createTab('about:blank');

        // Use the extension's real implementation.
        await createTabGroup([t1.id, t2.id]);

        // Allow retries in updateGroupTitleAndColor() to finish.
        await new Promise((r) => setTimeout(r, 2500));

        const tab1 = await chrome.tabs.get(t1.id);
        const groupId = tab1.groupId;
        const group = groupId >= 0 ? await chrome.tabGroups.get(groupId) : null;

        // Cleanup
        await removeTabs([t1.id, t2.id]);

        return { groupId, group };
      });

      assert(result.groupId >= 0, `Expected a valid groupId, got: ${result.groupId}`);
      assert(result.group, 'Expected group info');
      assert(result.group.title === 'E2E-Group', `Expected group title "E2E-Group", got: ${result.group.title}`);
      assert(result.group.color === 'red', `Expected group color "red", got: ${result.group.color}`);
    });

    await step('Settings: toggle visible platforms hides/shows buttons on main page', async () => {
      // Wait for dynamic checkboxes.
      await page.waitForSelector('#platform-checkboxes input[type="checkbox"]');

      const targetPlatform = 'ChatGPT';
      const checkboxSelector = `#platform-checkboxes input[type="checkbox"][data-platform="${targetPlatform}"]`;
      await page.waitForSelector(checkboxSelector);

      // Uncheck
      await page.click(checkboxSelector);
      await sleep(200);

      await ensureMainPage(page);
      assert((await platformDisplay(page, targetPlatform)) === 'none', 'Expected ChatGPT button hidden');

      // Re-check
      await ensureSettingsPage(page);
      await page.click(checkboxSelector);
      await sleep(200);
      await ensureMainPage(page);
      assert((await platformDisplay(page, targetPlatform)) !== 'none', 'Expected ChatGPT button visible again');
    });

    await step('Platform order: updating settings.platformOrder reorders buttons', async () => {
      await ensureMainPage(page);
      const before = await getVisiblePlatformOrder(page);
      assert(before.length >= 5, 'Not enough visible platforms for reorder test');

      const rotated = [...before.slice(1), before[0]];
      await page.evaluate(async (rotated) => {
        const result = await new Promise((resolve) => chrome.storage.local.get(['settings'], resolve));
        const settings = result.settings || {};
        settings.platformOrder = rotated;
        await new Promise((resolve) => chrome.storage.local.set({ settings }, resolve));
        if (typeof loadAndApplySettings === 'function') {
          await loadAndApplySettings();
        }
      }, rotated);

      // allow DOM update
      await sleep(200);
      const after = await getVisiblePlatformOrder(page);
      assert(after.join('|') === rotated.join('|'), `Platform order not applied.\nBefore: ${before}\nAfter:  ${after}\nWant:   ${rotated}`);
    });

    await step('Platform selection: click toggles active state and persists selectedPlatforms', async () => {
      await ensureMainPage(page);

      const platform = 'Claude';
      const before = await isPlatformActive(page, platform);
      await clickPlatform(page, platform);
      await sleep(100);
      const after = await isPlatformActive(page, platform);
      assert(after === !before, `Expected ${platform} active to toggle`);

      const { selectedPlatforms } = await storageGet(page, ['selectedPlatforms']);
      assert(Array.isArray(selectedPlatforms), 'selectedPlatforms not saved as array');
      assert(selectedPlatforms.includes(platform) === after, 'selectedPlatforms not matching DOM active state');
    });

    await step('Platform selection: drag-select toggles multiple buttons', async () => {
      await ensureMainPage(page);
      const fromPlatform = 'Gemini';
      const toPlatform = 'Grok';

      const fromBefore = await isPlatformActive(page, fromPlatform);
      const toBefore = await isPlatformActive(page, toPlatform);

      await dragTogglePlatforms(page, fromPlatform, toPlatform);
      await sleep(150);

      const fromAfter = await isPlatformActive(page, fromPlatform);
      const toAfter = await isPlatformActive(page, toPlatform);

      assert(fromAfter === !fromBefore, `${fromPlatform} should be toggled by drag-select`);
      assert(toAfter === !toBefore, `${toPlatform} should be toggled by drag-select`);
    });

    await step('Toggles: new chat / deep think / web search / gen image persist to storage', async () => {
      await ensureMainPage(page);

      const cases = [
        { id: 'new-chat-toggle', key: 'startNewChatEnabled' },
        { id: 'deep-think-toggle', key: 'deepThinkEnabled' },
        { id: 'web-search-toggle', key: 'webSearchEnabled' },
        { id: 'gen-image-toggle', key: 'genImageEnabled' }
      ];

      for (const c of cases) {
        const locator = page.locator(`#${c.id}`);
        await locator.click();
        await sleep(100);
        const stored = await storageGet(page, [c.key]);
        assert(typeof stored[c.key] === 'boolean', `${c.key} not saved as boolean`);
      }
    });

    await step('History: add entry, show dropdown, clear history from settings', async () => {
      await ensureMainPage(page);

      // Add history entries via popup script function (no need to send to background).
      await page.evaluate(async () => {
        await saveQueryHistory('E2E history item 1');
        await saveQueryHistory('E2E history item 2');
      });

      await page.click('#history-btn');
      await page.waitForFunction(() => document.getElementById('history-dropdown')?.classList.contains('show') === true);
      const itemsBefore = await page.$$eval('#history-dropdown .history-item', (els) => els.map((e) => e.dataset.query));
      assert(itemsBefore.length >= 2, `Expected >=2 history items, got ${itemsBefore.length}`);

      // Clear history via settings button (confirm+alert are auto-accepted via dialog handler).
      await ensureSettingsPage(page);
      await page.click('#clear-history-btn');
      await sleep(300);

      await ensureMainPage(page);
      await page.click('#history-btn');
      await page.waitForFunction(() => document.getElementById('history-dropdown')?.classList.contains('show') === true);
      const itemsAfter = await page.$$eval('#history-dropdown .history-item', (els) => els.map((e) => e.dataset.query));
      assert(itemsAfter.length === 0, `Expected history cleared, got ${itemsAfter.length} items`);
    });

    await step(
      `Send flow matrix (${mode}, suite=${suite}, singleToggles=${toggleMatrixSingle}, multiToggles=${toggleMatrixMulti})`,
      async () => {
        await ensureMainPage(page);

        // Ensure we have English text for stable assertions in this step.
        await ensureSettingsPage(page);
        await page.click('#lang-en');
        await page.waitForFunction(() => document.getElementById('send-btn')?.textContent?.trim() === 'Send');
        await ensureMainPage(page);

        const allPlatformNames = await page.evaluate(() => window._platformData?.platformNames || []);
        assert(allPlatformNames.length >= 1, 'No platformNames found in _platformData');

        const basePlatforms = normalizePlatformsInput(platforms, allPlatformNames);
        const unknown = basePlatforms.filter((p) => !allPlatformNames.includes(p));
        assert(unknown.length === 0, `Unknown platform(s): ${unknown.join(', ')}`);

        const sendCases = buildSendCases({
          basePlatforms,
          suite,
          toggleMatrixSingle,
          toggleMatrixMulti,
          maxCases
        });

        process.stdout.write(`[INFO] Total send cases: ${sendCases.length}\n`);

        // Mock mode: patch once (must be BEFORE clicking Send)
        if (mode === 'mock') {
          await patchSendToAllAIsNoop(page);
        }

        const results = [];
        for (let i = 0; i < sendCases.length; i += 1) {
          const c = sendCases[i];
          const label = `${i + 1}/${sendCases.length} [${c.platforms.join(', ')}] ${stringifyToggles(c.toggles)}`;
          process.stdout.write(`\n[CASE] ${label}\n`);

          try {
            await ensureMainPage(page);

            // Apply selection + toggles
            await applySendCaseConfig(page, c.platforms, c.toggles);

            // Sanity check: only these platforms are visible and in expected order
            const visibleOrder = await getVisiblePlatformOrder(page);
            assert(
              visibleOrder.join('|') === c.platforms.join('|'),
              `Visible platforms mismatch.\nVisible: ${visibleOrder}\nWant:    ${c.platforms}`
            );
            for (const p of c.platforms) {
              assert(await isPlatformActive(page, p), `Expected platform active: ${p}`);
            }

            // Clear console buffer for this case
            consoleEvents.length = 0;
            const caseStart = nowMs();

            const query = `E2E REAL SEND ${new Date().toISOString()} :: ${c.platforms.join(',')} :: ${stringifyToggles(c.toggles)}`;
            await page.fill('#query-input', query);

            await page.click('#send-btn');
            await page.waitForFunction(() => document.getElementById('query-input')?.disabled === true);
            await page.waitForFunction(() => document.getElementById('progress-container')?.classList.contains('active') === true);

            if (mode === 'mock') {
              await simulateProgressCompleteForActiveVisiblePlatforms(page);
            }

            // Completion signal: popup shows success and re-enables input.
            await waitForPopupSuccess(page, mode === 'mock' ? 15000 : 240000);
            await page.waitForFunction(() => document.getElementById('query-input')?.disabled === false);

            // Real verification: validate per-platform flags + sent logs from page console.
            if (mode === 'real') {
              await waitForConsoleExpectations(consoleEvents, caseStart, c.platforms, c.toggles, 120000);
            }

            results.push({ label, ok: true });
          } catch (err) {
            const msg = String(err?.message || err);
            results.push({ label, ok: false, error: msg });
            process.stdout.write(`[FAIL] ${label}\n${msg}\n`);
            if (!continueOnError) {
              throw err;
            }
          }
        }

        if (continueOnError) {
          const failed = results.filter((r) => !r.ok);
          if (failed.length) {
            throw new Error(
              `Some send cases failed (${failed.length}/${results.length}):\n` +
                failed.map((f) => `- ${f.label}: ${f.error}`).join('\n')
            );
          }
        }
      }
    );

    if (debug) {
      process.stdout.write('\n[DEBUG] Keeping browser open for 20 seconds...\n');
      await sleep(20000);
    }

    process.stdout.write('\nAll E2E checks passed.\n');
    await context.close();
    context = null;
  } finally {
    if (context) {
      await context.close();
    }
    // Best-effort cleanup of the temporary profile directory.
    try {
      if (!userDataDir) {
        fs.rmSync(persistentUserDataDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('\nE2E tests failed:\n', err);
  process.exit(1);
});


