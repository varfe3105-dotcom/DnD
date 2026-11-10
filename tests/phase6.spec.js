import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, seed, read, act, base4, URL_UNDER_TEST } from './helpers.js';

const start = (klass, extra = {}) => ({ v: 4, name: 'Multi', klass, level: 0, hp: 10, hpMax: 10, prof: 2, abil: { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 14 }, tab: 'main', ...extra });
async function up(page, { klass, sub } = {}) {
  await act(page, 'lu').click();
  await expect(page.locator('.dlg')).toBeVisible();
  if (klass) { await page.locator('#lu-k').selectOption(klass); await expect(page.locator('.dlg .lbl').first()).toContainText(klass); }
  const s = page.locator('#lu-sub');
  if (await s.count()) { await s.fill(sub || 'X'); await s.blur(); }
  if (await page.locator('#lu-a1').count()) { await page.locator('#lu-a1').selectOption('str'); await page.locator('#lu-a2').selectOption('dex'); }
  await act(page, 'luapply').click();
  await expect(page.locator('.dlg')).toHaveCount(0);
}

test.describe('Mehrere Charaktere @new', () => {
  test('anlegen, wechseln, Daten bleiben getrennt', async ({ page }) => {
    await seed(page, base4({ name: 'Erster', notes: 'eins', tab: 'setup' }));
    await act(page, 'charnew').click();
    await page.locator('#f-name').fill('Zweiter');
    await page.locator('#f-name').blur();
    await expect(page.locator('h1')).toHaveText('Zweiter');
    expect((await read(page)).notes).toBe('');
    await page.locator('#char-switch').selectOption({ label: 'Erster' });
    await expect(page.locator('h1')).toHaveText('Erster');
    expect((await read(page)).notes).toBe('eins');
    await page.reload();
    await expect(page.locator('h1')).toHaveText('Erster');
    await expect(page.locator('#char-switch option')).toHaveCount(2);
  });

  test('duplizieren kopiert alles unter neuer Identität', async ({ page }) => {
    await seed(page, base4({ name: 'Original', notes: 'n', tab: 'setup' }));
    await act(page, 'hp', '[data-d="-1"]').count();
    await act(page, 'chardup').click();
    const s = await read(page);
    expect(s.name).toBe('Original (2)');
    expect(s.notes).toBe('n');
    await expect(page.locator('#char-switch option')).toHaveCount(2);
  });

  test('löschen braucht Bestätigung; der letzte wird leer ersetzt', async ({ page }) => {
    await seed(page, base4({ name: 'Einziger', tab: 'setup' }));
    await act(page, 'chardel').click();
    await expect(page.locator('h1')).toHaveText('Einziger');
    await act(page, 'chardel').click();
    await expect(page.locator('h1')).not.toHaveText('Einziger');
  });

  test('anderen Charakter löschen lässt den aktiven unberührt', async ({ page }) => {
    await seed(page, base4({ name: 'Bleibt', tab: 'setup' }));
    await act(page, 'charnew').click();
    await page.locator('#char-switch').selectOption({ label: 'Bleibt' });
    await expect(page.locator('h1')).toHaveText('Bleibt');
    const other = page.locator('.edrow', { hasText: 'New Character' }).locator('[data-a="chardel"]');
    await other.click();
    await page.locator('.edrow', { hasText: 'New Character' }).locator('[data-a="chardel"]').click();
    await expect(page.locator('h1')).toHaveText('Bleibt');
    await expect(page.locator('#char-switch')).toHaveCount(0);
  });

  test('Import ersetzt nur den aktiven Charakter', async ({ page }) => {
    await seed(page, base4({ name: 'A', tab: 'setup' }));
    await act(page, 'charnew').click();
    const before = (await read(page)).id;
    await page.locator('#imp').fill(JSON.stringify(base4({ name: 'Importiert', id: 'fremd' })));
    await act(page, 'imp').click();
    await act(page, 'imp').click();
    const s = await read(page);
    expect(s.name).toBe('Importiert');
    expect(s.id).toBe(before);
    await expect(page.locator('#char-switch option')).toHaveCount(2);
  });
});

test.describe('Multiclassing @new', () => {
  test('Voraussetzungen sperren Klassen', async ({ page }) => {
    await seed(page, start('Fighter', { abil: { str: 14, dex: 10, con: 14, int: 10, wis: 10, cha: 10 } }));
    await up(page);
    await act(page, 'lu').click();
    await expect(page.locator('#lu-k option[value="Wizard"]')).toBeDisabled();
    await expect(page.locator('#lu-k option[value="Barbarian"]')).toBeEnabled();
  });

  test('Wizard 3 / Cleric 2: Plätze nach Multiclass-Tabelle, Übung nach Gesamtstufe', async ({ page }) => {
    await seed(page, start('Wizard'));
    await up(page); await up(page, { sub: 'School of Evocation' }); await up(page);
    await up(page, { klass: 'Cleric', sub: 'Life Domain' });
    await up(page, { klass: 'Cleric' });
    const s = await read(page);
    expect(s.level).toBe(5);
    expect(s.multi).toEqual([{ k: 'Cleric', sub: 'Life Domain', lvl: 2 }]);
    expect(s.slots.slice(0, 3).map(x => x.max)).toEqual([4, 3, 2]);
    expect(s.prof).toBe(3);
    expect(s.saves).toEqual({ int: true, wis: true });
    expect(s.feats.map(f => f.n)).toEqual(expect.arrayContaining(['Multiclass: Cleric', 'Disciple of Life']));
    expect(s.hd.die).toBe('W6');
    await expect(page.locator('.who p').first()).toContainText('Wizard 3 / Cleric 2');
  });

  test('Halbzauberer zählt abgerundet: Paladin 2 / Wizard 2', async ({ page }) => {
    await seed(page, start('Paladin'));
    await up(page); await up(page);
    await up(page, { klass: 'Wizard' });
    await up(page, { klass: 'Wizard', sub: 'School of Evocation' });
    const s = await read(page);
    expect(s.slots.slice(0, 2).map(x => x.max)).toEqual([4, 2]);
  });

  test('Warlock bleibt getrennt: Paktplätze neben normalen Plätzen', async ({ page }) => {
    await seed(page, start('Warlock'));
    await up(page, { sub: 'The Fiend' }); await up(page);
    await up(page, { klass: 'Sorcerer', sub: 'Draconic Bloodline' });
    const s = await read(page);
    expect([s.pact.max, s.pact.lvl]).toEqual([2, 1]);
    expect(s.slots[0].max).toBe(2);
  });

  test('Eldritch Knight erhält Plätze als Drittelzauberer', async ({ page }) => {
    await seed(page, start('Fighter'));
    await up(page); await up(page); await up(page, { sub: 'Eldritch Knight' });
    expect((await read(page)).slots[0].max).toBe(2);
  });

  test('Trefferwürfel nach Art getrennt angezeigt', async ({ page }) => {
    await seed(page, start('Fighter'));
    await up(page); await up(page, { klass: 'Wizard' });
    await expect(page.locator('.row', { hasText: 'Hit Dice' })).toContainText('1d10 + 1d6');
  });
});

test.describe('Suche und Druck @new', () => {
  test('Tippfehler finden den Zauber', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('#wq').fill('firbal');
    await expect(page.locator('.wli', { hasText: 'Fireball' }).first()).toBeVisible();
  });

  test('exakte Treffer stehen vor unscharfen', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('#wq').fill('Fireball');
    await expect(page.locator('.wli b').first()).toHaveText('Fireball');
  });

  test('Deutsche Namen sind suchbar', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('#wq').fill('Feuerball');
    await expect(page.locator('.wli', { hasText: 'Fireball' }).first()).toBeVisible();
  });

  test('Druckansicht blendet Bedienelemente aus', async ({ page }) => {
    await seed(page, base4({}));
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
    expect(await page.locator('.st').first().evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
    await expect(page.locator('.tabs')).toBeHidden();
    await expect(page.locator('.hacts')).toBeHidden();
    await expect(page.locator('.abs')).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
  });

  test('Einzeldatei enthält keinen Service Worker und lädt nichts nach', async ({ page }) => {
    const remote = [];
    page.on('request', r => { if (/^https?:/.test(r.url())) remote.push(r.url()); });
    await seed(page, base4({}));
    expect(URL_UNDER_TEST.startsWith('file://')).toBe(true);
    expect(remote).toEqual([]);
    expect(await page.evaluate(() => [...document.scripts].some(s => /serviceWorker\.register/.test(s.textContent)))).toBe(false);
  });
});

test.describe('Web-Fassung @new', () => {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
  let server, base;
  test.beforeAll(async () => {
    server = http.createServer((q, r) => {
      const p = path.join('dist-web', decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
      if (!fs.existsSync(p)) { r.writeHead(404).end(); return; }
      r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }).end(fs.readFileSync(p));
    });
    await new Promise(ok => server.listen(0, '127.0.0.1', ok));
    base = `http://127.0.0.1:${server.address().port}/`;
  });
  test.afterAll(() => { if (server.listening) server.close(); });

  test('installierbar: Manifest und Icons vorhanden', async ({ page }) => {
    await page.goto(base);
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const m = await (await page.request.get(new URL(href, base).href)).json();
    expect(m.display).toBe('standalone');
    expect(m.icons.length).toBe(2);
    for (const i of m.icons) expect((await page.request.get(new URL(i.src, base).href)).ok()).toBe(true);
  });

  test('läuft nach dem ersten Besuch offline', async ({ page }) => {
    await page.goto(base);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    // Server wirklich abschalten: Das ist der Fall am Spieltisch ohne Netz.
    server.closeAllConnections();
    await new Promise(ok => server.close(ok));
    await page.reload();
    await expect(page.locator('#app header')).toBeVisible();
  });
});
