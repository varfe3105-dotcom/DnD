import { test, expect, seed, read, act, tab, base4, URL_UNDER_TEST } from './helpers.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fake = () => {
  window.__sent = [];
  window.__liveFake = (code, key, onPeers, onStatus, onMsg) => {
    window.__livePeers = onPeers; window.__liveMsg = onMsg; window.__liveInfo = { code, key };
    setTimeout(() => onStatus('on'), 0);
    return { track: () => {}, send: m => window.__sent.push(m), close: () => {} };
  };
};
const incoming = (page, m) => page.evaluate(x => window.__liveMsg(x), m);
const sent = page => page.evaluate(() => window.__sent);
const join = async (page, s = {}) => {
  await seed(page, base4({ tab: 'setup', hp: 20, hpMax: 20, id: 'me1', ...s }));
  await page.locator('#live-code').fill('ABC234');
  await act(page, 'livejoin').click();
  await expect(page.locator('.live-state')).toHaveClass(/on/);
};
const openDm = async (page, view = 'live') => {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(([s, v]) => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, view: v })); }, [base4({ tab: 'dm' }), view]);
  await page.reload();
  await page.locator('#app header').waitFor();
};
const player = { key: 'p1', role: 'player', name: 'Mirelle', hp: 20, hpMax: 32, ac: 13, cond: [], death: { s: 0, f: 0 } };

test.describe('Vorschläge und Handouts @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('Schaden erst nach Annehmen, Spielleitung bekommt Antwort', async ({ page }) => {
    await join(page);
    await incoming(page, { id: 'a', type: 'dmg', to: 'me1', value: 7 });
    await expect(page.locator('.inbox')).toBeVisible();
    expect((await read(page)).hp).toBe(20);
    await act(page, 'liveyes').click();
    expect((await read(page)).hp).toBe(13);
    await expect(page.locator('.inbox')).toHaveCount(0);
    expect((await sent(page)).at(-1)).toMatchObject({ type: 'ack', to: 'dm', ok: true });
  });

  test('Ablehnen ändert nichts', async ({ page }) => {
    await join(page);
    await incoming(page, { id: 'a', type: 'cond', to: 'me1', cond: 'Poisoned' });
    await act(page, 'liveno').click();
    expect((await read(page)).cond.Poisoned).toBeUndefined();
    expect((await sent(page)).at(-1)).toMatchObject({ ok: false });
  });

  test('Zustand und Heilung werden angewendet', async ({ page }) => {
    await join(page, { hp: 5 });
    await incoming(page, { id: 'a', type: 'cond', to: 'all', cond: 'Prone' });
    await incoming(page, { id: 'b', type: 'heal', to: 'me1', value: 4 });
    await act(page, 'liveyes').first().click();
    await act(page, 'liveyes').first().click();
    const s = await read(page);
    expect(s.cond.Prone).toBe(true);
    expect(s.hp).toBe(9);
  });

  test('fremde Empfänger und kaputte Nachrichten werden ignoriert', async ({ page }) => {
    await join(page);
    await incoming(page, { id: 'a', type: 'dmg', to: 'jemand', value: 3 });
    await incoming(page, { id: 'b', type: 'dmg', to: 'me1', value: 'viel' });
    await incoming(page, { id: 'c', type: 'cond', to: 'me1', cond: '<b>x</b>' });
    await incoming(page, { id: 'd', type: 'boese', to: 'me1' });
    await page.waitForTimeout(50);
    await expect(page.locator('.inbox')).toHaveCount(0);
  });

  test('Handout erscheint, wird entschärft und kann in die Notizen', async ({ page }) => {
    await join(page);
    await incoming(page, { id: 'h', type: 'handout', to: 'all', title: 'Brief', text: '<img src=x onerror="window.__xss=1">Hallo', img: 'javascript:alert(1)' });
    await expect(page.locator('.dlg')).toContainText('<img');
    await expect(page.locator('.dlg img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await act(page, 'honote').click();
    await expect(page.locator('.dlg')).toHaveCount(0);
    expect((await read(page)).notes).toContain('Brief');
  });

  test('Spielleitung schickt Vorschlag und Handout', async ({ page }) => {
    await openDm(page);
    await act(page, 'livecreate').click();
    await page.evaluate(p => window.__livePeers([p]), player);
    await page.locator('#lv-a-p1').fill('6');
    await act(page, 'livesend', '[data-t="dmg"]').click();
    await page.locator('#lv-c-p1').selectOption('Stunned');
    await act(page, 'livesend', '[data-t="cond"]').click();
    await page.locator('#ho-t').fill('Karte');
    await page.locator('#ho-x').fill('Norden');
    await act(page, 'hosend').click();
    const s = await sent(page);
    expect(s[0]).toMatchObject({ type: 'dmg', to: 'p1', value: 6 });
    expect(s[1]).toMatchObject({ type: 'cond', to: 'p1', cond: 'Stunned' });
    expect(s[2]).toMatchObject({ type: 'handout', to: 'all', title: 'Karte', text: 'Norden' });
    await expect(page.locator('#ho-t')).toHaveValue('');
  });

  test('Antwort erscheint bei der Spielleitung', async ({ page }) => {
    await openDm(page);
    await act(page, 'livecreate').click();
    await expect(page.locator('.live-state')).toHaveClass(/on/);
    await incoming(page, { id: 'x', type: 'ack', to: 'dm', ok: false, name: 'Mirelle' });
    await expect(page.locator('#toast')).toContainText('Mirelle');
  });
});

test.describe('Sicherung @new', () => {
  const keys = page => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('charbogen')));

  test('Datei enthält alle Charaktere, Laden stellt sie wieder her', async ({ page }) => {
    await seed(page, base4({ name: 'Eins', tab: 'setup', klass: 'Wizard', level: 1 }));
    await page.evaluate(() => { localStorage.setItem('charbogen-char-b', JSON.stringify({ v: 4, id: 'b', name: 'Zwei' })); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, notes: [] })); });
    const dl = page.waitForEvent('download');
    await act(page, 'bakdl').click();
    const file = await (await dl).path();
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(data.kind).toBe('charbogen-backup');
    expect(Object.keys(data.data).sort()).toEqual(expect.arrayContaining(['charbogen-char-b', 'charbogen-dm', 'charbogen-v4']));

    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('charbogen-v4')); s.name = 'Kaputt'; localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.removeItem('charbogen-char-b'); });
    await page.reload();
    const tmp = path.join(os.tmpdir(), `bak-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify(data));
    await page.locator('#bak-f').setInputFiles(tmp);
    await expect(page.locator('.bakpanel')).toContainText('2');
    await act(page, 'bakyes').click();
    await expect.poll(async () => (await read(page))?.name).toBe('Eins');
    expect(await keys(page)).toContain('charbogen-char-b');
    fs.unlinkSync(tmp);
  });

  test('ungültige Dateien überschreiben nichts', async ({ page }) => {
    await seed(page, base4({ name: 'Bleibt', tab: 'setup' }));
    const tmp = path.join(os.tmpdir(), `bad-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify({ kind: 'charbogen-backup', data: { 'fremder-schluessel': '{}', 'charbogen-v4': '{}' } }));
    await page.locator('#bak-f').setInputFiles(tmp);
    await expect(page.locator('#toast')).toBeVisible();
    await expect(page.locator('.bakpanel')).toHaveCount(0);
    expect((await read(page)).name).toBe('Bleibt');
    fs.unlinkSync(tmp);
  });

  test('früheren Stand zurückholen', async ({ page }) => {
    await seed(page, base4({ name: 'Alt', tab: 'setup' }));
    await page.locator('.bakhist').waitFor();
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('charbogen-v4')); s.name = 'Neu'; localStorage.setItem('charbogen-v4', JSON.stringify(s)); });
    await page.reload();
    await expect.poll(() => page.locator('.bakhist .row').count()).toBeGreaterThanOrEqual(2);
    await page.locator('.bakhist summary').click();
    await page.locator('.bakhist [data-a="baksnap"]').nth(1).click();
    await act(page, 'bakyes').click();
    await expect.poll(async () => (await read(page))?.name).toBe('Alt');
  });

  test('höchstens fünf Stände', async ({ page }) => {
    await seed(page, base4({ name: 'S0', tab: 'setup' }));
    for (let i = 1; i <= 7; i++) {
      await page.locator('.bakhist').waitFor();
      await page.evaluate(n => { const s = JSON.parse(localStorage.getItem('charbogen-v4')); s.name = 'S' + n; localStorage.setItem('charbogen-v4', JSON.stringify(s)); }, i);
      await page.reload();
      await page.waitForTimeout(40);
    }
    await expect.poll(() => page.locator('.bakhist .row').count()).toBe(5);
  });

  test('erinnert nach einer Woche, Später blendet aus', async ({ page }) => {
    await seed(page, base4({ klass: 'Wizard', level: 1 }));
    await expect(page.locator('.baknag')).toHaveCount(0);
    await page.evaluate(() => localStorage.setItem('charbogen-lastbackup', new Date(Date.now() - 8 * 86400000).toISOString()));
    await page.reload();
    await expect(page.locator('.baknag')).toBeVisible();
    await act(page, 'baklater').click();
    await expect(page.locator('.baknag')).toHaveCount(0);
  });
});

test.describe('Beute @new', () => {
  test('Münzen zum W100-Ergebnis', async ({ page }) => {
    await openDm(page, 'loot');
    await page.locator('#dm-lr').fill('65');
    await expect(page.locator('.loot tr.on')).toContainText('3');
    await expect(page.locator('.loot tr.on td').first()).toHaveText('61–70');
    await page.locator('#dm-lt').selectOption('17+');
    await expect(page.locator('.loot tr')).toHaveCount(3);
  });

  test('Seltenheit passt zur Stufe', async ({ page }) => {
    await openDm(page, 'loot');
    await page.locator('#dm-lq').fill('Holy Avenger');
    await expect(page.locator('#dm-li .row')).toHaveCount(0);
    await page.locator('#dm-lt').selectOption('17+');
    await expect(page.locator('#dm-li .row')).toHaveCount(1);
  });

  test('Verschicken braucht einen offenen Raum', async ({ page }) => {
    await page.addInitScript(fake);
    await openDm(page, 'loot');
    await page.locator('#dm-lq').fill('Bag of Holding');
    await expect(page.locator('[data-a="lootsend"]').first()).toBeDisabled();
    await act(page, 'dmview', '[data-v="live"]').click();
    await act(page, 'livecreate').click();
    await expect(page.locator('.live-state')).toHaveClass(/on/);
    await act(page, 'dmview', '[data-v="loot"]').click();
    await act(page, 'lootsend').first().click();
    expect((await sent(page)).at(-1)).toMatchObject({ type: 'item', to: 'all', key: 'magic:bag-of-holding' });
  });
});

test('Beute und Sicherung ändern den Tab nicht @new', async ({ page }) => {
  await seed(page, base4({}));
  await tab(page, 'setup');
  await expect(page.locator('[data-a="bakdl"]')).toBeVisible();
});
