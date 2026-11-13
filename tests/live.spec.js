import { test, expect, seed, act, tab, base4, URL_UNDER_TEST } from './helpers.js';

// Ersatz für Supabase: zeichnet gesendete Daten auf und spielt eingehende ein.
const fake = () => {
  window.__liveLog = [];
  window.__liveFake = (code, key, onPeers, onStatus) => {
    window.__livePeers = onPeers;
    window.__liveInfo = { code, key };
    setTimeout(() => onStatus('on'), 0);
    return { track: p => window.__liveLog.push(p), close: () => { window.__liveClosed = true; } };
  };
};
const peers = (page, list) => page.evaluate(l => window.__livePeers(l), list);
const lastSent = page => page.evaluate(() => window.__liveLog.at(-1));
const player = (o = {}) => ({ key: 'p1', role: 'player', name: 'Mirelle', klass: 'Wizard', level: 5, hp: 20, hpMax: 32, tmp: 0, ac: 13, exh: 0, conc: '', cond: [], death: { s: 0, f: 0 }, ...o });
const openDm = async page => {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(s => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'live' })); }, base4({ tab: 'dm' }));
  await page.reload();
  await page.locator('#app header').waitFor();
};

test.describe('Live-Tisch @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('ohne Beitritt keine Verbindung', async ({ page }) => {
    await seed(page, base4({}));
    expect(await page.evaluate(() => window.__liveInfo)).toBeUndefined();
  });

  test('Spieler tritt bei und sendet nur die vereinbarten Werte', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', notes: 'geheim', hp: 15 }));
    await page.locator('#live-code').fill('abc234');
    await act(page, 'livejoin').click();
    await expect(page.locator('.live-state')).toHaveClass(/on/);
    expect((await page.evaluate(() => window.__liveInfo)).code).toBe('ABC234');
    const p = await lastSent(page);
    expect(p.hp).toBe(15);
    expect(Object.keys(p).sort()).toEqual(['ac', 'conc', 'cond', 'death', 'exh', 'hp', 'hpMax', 'insp', 'klass', 'level', 'name', 'role', 'tmp']);
  });

  test('Änderungen gehen automatisch hinaus', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', hp: 15 }));
    await page.locator('#live-code').fill('ABC234');
    await act(page, 'livejoin').click();
    await tab(page, 'main');
    await act(page, 'hp', '[data-d="-1"]').first().click();
    await expect.poll(async () => (await lastSent(page)).hp).toBe(14);
    await act(page, 'condopen').click();
    await act(page, 'cond', '[data-c="Prone"]').click();
    await expect.poll(async () => (await lastSent(page)).cond).toEqual(['Prone']);
  });

  test('ungültiger Code verbindet nicht', async ({ page }) => {
    await seed(page, base4({ tab: 'setup' }));
    await page.locator('#live-code').fill('A1');
    await act(page, 'livejoin').click();
    await expect(page.locator('#toast')).toBeVisible();
    expect(await page.evaluate(() => window.__liveInfo)).toBeUndefined();
  });

  test('nach dem Neuladen wieder im Raum, Verlassen trennt', async ({ page }) => {
    await seed(page, base4({ tab: 'setup' }));
    await page.locator('#live-code').fill('ABC234');
    await act(page, 'livejoin').click();
    await page.reload();
    await expect(page.locator('.live-state')).toHaveClass(/on/);
    await act(page, 'liveoff').click();
    await expect(page.locator('#live-code')).toBeVisible();
    await page.reload();
    expect(await page.evaluate(() => window.__liveInfo)).toBeUndefined();
  });

  test('DM eröffnet Raum und sieht Spieler live', async ({ page }) => {
    await openDm(page);
    await act(page, 'livecreate').click();
    await expect(page.locator('.live-code b')).toHaveText(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(await lastSent(page)).toEqual({ role: 'dm', lock: false, turn: null });
    await peers(page, [player({ cond: ['Poisoned'] })]);
    await expect(page.locator('.dm-row')).toContainText('Mirelle');
    await expect(page.locator('.dm-row')).toContainText('20');
    await expect(page.locator('.dm-row .chip')).toHaveText('Poisoned');
    await peers(page, [player({ hp: 5 })]);
    await expect(page.locator('.dm-hpv b')).toHaveText('5');
  });

  test('Fremde Daten werden entschärft und begrenzt', async ({ page }) => {
    await openDm(page);
    await act(page, 'livecreate').click();
    await peers(page, [player({ name: '<img src=x onerror="window.__xss=1">', hp: 'viel', cond: ['Poisoned', '<b>böse</b>'], extra: 'x' })]);
    await expect(page.locator('.dm-row')).toContainText('<img');
    await expect(page.locator('.dm-row img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expect(page.locator('.dm-row .chip')).toHaveCount(1);
  });

  test('Spieler in den Kampf: TP folgen automatisch', async ({ page }) => {
    await openDm(page);
    await act(page, 'livecreate').click();
    await peers(page, [player()]);
    await act(page, 'liveadd').click();
    await peers(page, [player({ hp: 3, cond: ['Prone'] })]);
    const d = await page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')));
    expect(d.combat.list[0]).toMatchObject({ name: 'Mirelle', hp: 3, cond: { Prone: true } });
  });

  test('Eingabe beim Tippen geht bei Updates nicht verloren', async ({ page }) => {
    await openDm(page);
    await act(page, 'livecreate').click();
    await peers(page, [player()]);
    await page.locator('[data-a="tab"][data-t="dmcombat"]').click();
    await page.locator('#dm-mn').fill('Wache');
    await peers(page, [player({ hp: 2 })]);
    await page.waitForTimeout(100);
    await expect(page.locator('#dm-mn')).toHaveValue('Wache');
    await expect(page.locator('#dm-mn')).toBeFocused();
  });
});

test.describe('Live-Tisch gegen das echte Projekt @new @real', () => {
  test('zwei Geräte aus der Einzeldatei finden sich', async ({ browser }) => {
    const openAs = async (s, dm) => {
      const c = await browser.newContext();
      const p = await c.newPage();
      await p.goto(URL_UNDER_TEST);
      await p.evaluate(([x, d]) => { localStorage.setItem('charbogen-v4', JSON.stringify(x)); if (d) localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'live' })); }, [s, dm]);
      await p.reload();
      await p.locator('#app header').waitFor();
      return p;
    };
    const host = await openAs(base4({ tab: 'dm' }), true);
    await host.locator('[data-a="livecreate"]').click();
    await expect(host.locator('.live-state')).toHaveClass(/on/, { timeout: 15000 });
    const code = await host.locator('.live-code b').textContent();
    const guest = await openAs(base4({ name: 'Gast', hp: 11, hpMax: 20, tab: 'setup' }), false);
    await guest.locator('#live-code').fill(code);
    await guest.locator('[data-a="livejoin"]').click();
    await expect(guest.locator('.live-state')).toHaveClass(/on/, { timeout: 15000 });
    await expect(guest.locator('.dm-bar .lbl')).toHaveText(/DM is online/, { timeout: 15000 });
    await expect(host.locator('.dm-row')).toContainText('Gast', { timeout: 15000 });
    await expect(host.locator('.dm-hpv b')).toHaveText('11');
    await guest.locator('[data-a="tab"][data-t="main"]').click();
    await guest.locator('[data-a="hp"][data-d="-1"]').first().click();
    await expect(host.locator('.dm-hpv b')).toHaveText('10', { timeout: 15000 });
    const key = await host.locator('[data-a="livesend"][data-t="dmg"]').getAttribute('data-k');
    await host.locator('[id="lv-a-' + key + '"]').fill('4');
    await host.locator('[data-a="livesend"][data-t="dmg"]').click();
    await guest.locator('[data-a="liveyes"]').click({ timeout: 15000 });
    await expect(host.locator('.dm-hpv b')).toHaveText('6', { timeout: 15000 });
    await host.locator('#ho-t').fill('Brief');
    await host.locator('[data-a="hosend"]').click();
    await expect(guest.locator('.dlg')).toContainText('Brief', { timeout: 15000 });
    await guest.locator('[data-a="hoclose"]').click();
    await guest.context().close();
    await expect(host.locator('.dm-row')).toHaveCount(0, { timeout: 45000 });
    await host.context().close();
  });
});
