import { test, expect, seed, read, act, tab, base4, item, URL_UNDER_TEST } from './helpers.js';

const bagOf = (...its) => { const bag = Array(24).fill(null); its.forEach((x, i) => { bag[i] = x; }); return bag; };
const fake = () => {
  window.__sent = [];
  window.__liveFake = (code, key, onPeers, onStatus, onMsg) => {
    window.__livePeers = onPeers; window.__liveMsg = onMsg;
    setTimeout(() => onStatus('on'), 0);
    return { track: p => { window.__tracked = p; }, send: m => window.__sent.push(m), close: () => {} };
  };
};

test.describe('Inventar-Korrekturen @new', () => {
  test('Amulett kommt an den Hals, auch bei alten Bögen', async ({ page }) => {
    await seed(page, base4({ tab: 'inv', bag: bagOf(item('a', 'Amulet', { ref: 'item:amulet', slot: 'hand', p: 'x' })) }));
    await page.locator('[data-drag="bag:0"]').click();
    await act(page, 'equip').click();
    const s = await read(page);
    expect(s.eq.neck?.ref).toBe('item:amulet');
    expect(s.eq.main).toBeUndefined();
  });

  test('zwei Dolche: Ausrüsten nimmt einen, der zweite bleibt und geht in die Nebenhand', async ({ page }) => {
    const daggers = item('d', 'Dagger', { ref: 'item:dagger', slot: 'hand', q: 2, p: 'Simple · 1d4 piercing · Finesse, Light, Thrown (20/60 ft.) · 2 gp' });
    await seed(page, base4({ tab: 'inv', bag: bagOf(daggers) }));
    await page.locator('[data-drag="bag:0"]').click();
    await act(page, 'equip').click();
    let s = await read(page);
    expect(s.eq.main.q).toBe(1);
    expect(s.bag[0].q).toBe(1);
    await act(page, 'equip').click();
    s = await read(page);
    expect([s.eq.main?.q, s.eq.off?.q]).toEqual([1, 1]);
    expect(s.bag.filter(Boolean)).toHaveLength(0);
  });

  test('Stapel lässt sich aufteilen', async ({ page }) => {
    await seed(page, base4({ tab: 'inv', bag: bagOf(item('d', 'Dagger', { ref: 'item:dagger', slot: 'hand', q: 3, p: 'x' })) }));
    await page.locator('[data-drag="bag:0"]').click();
    await act(page, 'split').click();
    const s = await read(page);
    expect(s.bag.filter(Boolean).map(x => x.q).sort()).toEqual([1, 2]);
  });

  test('Figurbild im Inventar wählen', async ({ page }) => {
    await seed(page, base4({ tab: 'inv' }));
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEUlEQVR42mP8z8DwnwEIGGEAAB0nA/6g2fwvAAAAAElFTkSuQmCC', 'base64');
    await page.locator('#fig-in').setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: png });
    await expect.poll(async () => (await read(page)).fig).toMatch(/^data:image\/jpeg/);
    await expect(page.locator('label.fig img')).toHaveCount(1);
  });
});

test.describe('Beute über die Spielleitung @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });
  const join = async page => {
    await seed(page, base4({ tab: 'setup', id: 'me1', gold: { pp: 0, gp: 3, ep: 0, sp: 0, cp: 0 } }));
    await page.locator('#live-code').fill('ABC234');
    await act(page, 'livejoin').click();
    await expect(page.locator('.live-state')).toHaveClass(/on/);
  };

  test('Gegenstand und Münzen nach Annehmen im Inventar', async ({ page }) => {
    await join(page);
    await page.evaluate(() => { window.__liveMsg({ id: 'i', type: 'item', to: 'me1', key: 'magic:bag-of-holding', q: 1 }); window.__liveMsg({ id: 'g', type: 'gold', to: 'all', coins: { gp: 25, sp: 4 } }); });
    await expect(page.locator('.inbox .row')).toHaveCount(2);
    await act(page, 'liveyes').first().click();
    await act(page, 'liveyes').first().click();
    const s = await read(page);
    expect(s.bag.filter(Boolean).map(x => x.ref)).toContain('magic:bag-of-holding');
    expect(s.gold).toMatchObject({ gp: 28, sp: 4 });
  });

  test('unbekannte Katalogschlüssel und leere Münzen werden verworfen', async ({ page }) => {
    await join(page);
    await page.evaluate(() => { window.__liveMsg({ id: 'i', type: 'item', to: 'me1', key: 'magic:gibts-nicht' }); window.__liveMsg({ id: 'g', type: 'gold', to: 'me1', coins: { gp: 0 } }); });
    await page.waitForTimeout(50);
    await expect(page.locator('.inbox')).toHaveCount(0);
  });

  test('Sperre der Spielleitung blendet das Hinzufügen aus', async ({ page }) => {
    await join(page);
    await tab(page, 'inv');
    await expect(page.locator('#inv-sel')).toBeVisible();
    await page.evaluate(() => window.__livePeers([{ key: 'dm-x', role: 'dm', lock: true }]));
    await expect(page.locator('#inv-sel')).toBeHidden();
    await expect(page.locator('.card .note', { hasText: /Spielleitung|DM/ })).toBeVisible();
    await act(page, 'liveoff').count();
  });

  test('Spielleitung verteilt an einen Spieler und stellt die Sperre', async ({ page }) => {
    await page.goto(URL_UNDER_TEST);
    await page.evaluate(s => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'live' })); }, base4({ tab: 'dm' }));
    await page.reload();
    await act(page, 'livecreate').click();
    await page.evaluate(() => window.__livePeers([{ key: 'p1', role: 'player', name: 'Mirelle', hp: 5, hpMax: 9, cond: [], death: { s: 0, f: 0 } }]));
    await page.locator('[data-a="tab"][data-t="dmloot"]').click();
    await page.locator('#dm-lto').selectOption('p1');
    await page.locator('#dm-lock').check();
    await expect.poll(() => page.evaluate(() => window.__tracked?.lock)).toBe(true);
    await page.locator('#dm-lq').fill('Bag of Holding');
    await act(page, 'lootsend').first().click();
    await page.locator('#lc-gp').fill('12');
    await act(page, 'lootgold').click();
    const s = await page.evaluate(() => window.__sent);
    expect(s[0]).toMatchObject({ type: 'item', to: 'p1', key: 'magic:bag-of-holding', q: 1 });
    expect(s[1]).toMatchObject({ type: 'gold', to: 'p1', coins: { gp: 12 } });
  });
});

test.describe('Spickzettel übersichtlich @new', () => {
  const open = async (page, l) => {
    await page.goto(URL_UNDER_TEST);
    await page.evaluate(([s, l]) => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'cheat' })); localStorage.setItem('charbogen-lang', l); }, [base4({ tab: 'dm' }), l]);
    await page.reload();
    await page.locator('#app header').waitFor();
  };

  test('Kurzfassung als Zeilen, auch auf Englisch, Original in Unterabschnitten', async ({ page }) => {
    await open(page, 'en');
    const env = page.locator('.dm-rs[data-rid="the-environment"]');
    await expect(env.locator('.rs-topics')).toContainText('Falling');
    await env.locator('summary').first().click();
    await expect(env.locator('.rs-kv b').first()).toHaveText('Falling');
    await env.locator('.rs-orig > summary').click();
    expect(await env.locator('.rs-orig .rs-sub').count()).toBeGreaterThan(3);
  });

  test('Suche öffnet und markiert Treffer', async ({ page }) => {
    await open(page, 'en');
    await page.locator('#dm-rq').fill('suffocat');
    const hit = page.locator('.dm-rs[data-rid="the-environment"]');
    await expect(hit).toHaveAttribute('open', '');
    await expect(hit.locator('mark').first()).toBeVisible();
  });

  test('Monsterwerte gegliedert', async ({ page }) => {
    await page.goto(URL_UNDER_TEST);
    await page.evaluate(s => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'combat' })); }, base4({ tab: 'dm' }));
    await page.reload();
    await page.locator('#dm-mq').fill('wolf');
    await act(page, 'dmadd', '[data-m="wolf"]').click();
    await act(page, 'dmopen').click();
    await expect(page.locator('.dm-stat h5').first()).toHaveText('Traits');
    await expect(page.locator('.dm-stat .stat b').first()).toHaveText('Keen Hearing and Smell.');
  });
});
