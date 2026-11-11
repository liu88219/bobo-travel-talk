import { describe, it, expect } from 'vitest';
import {
  deriveVaultIdentity,
  encryptVaultPayload,
  decryptVaultPayload,
  getPasscodeFallbackVariants,
} from '../services/cryptoVault';
import {
  mergeVaultStates,
  buildTextDbFormBody,
} from '../services/cloudSync';
import {
  createInitialVaultState,
} from '../types/travel';
import {
  extractImportantKeywords,
  translateTextDualEngine,
  computeBackTranslationConfidence,
  buildLocalWordBreakdowns,
  cleanOcrMenuLines,
  detectDishDietaryWarning,
  extractRestaurantNameFromInput,
  searchRestaurantMenuOnline,
  mapSubBboxToFullImage,
  ensureMenuDishesHaveBboxes,
  normalizeRestaurantQueryForLocalSearch,
  extractMenuUrlsFromSearchMarkdown,
  extractRealMenuDishesFromWebMarkdown,
} from '../services/translatorEngine';

describe('BoboTalk Cloud Sync & Translator Engine', () => {
  it('derives identical deterministic vault keys across Safari and Home Screen PWA', async () => {
    const id1 = await deriveVaultIdentity('mona-japan-2026');
    const id2 = await deriveVaultIdentity('  mona-japan-2026  ');
    expect(id1.vaultKey).toBe(id2.vaultKey);
    expect(id1.fingerprintBadge).toBe(id2.fingerprintBadge);
    expect(id1.vaultKey).toMatch(/^bobotalk_perm_v1_[0-9a-f]{32}$/);
  });

  it('generates iOS first-letter capitalization fallback variants', () => {
    const variants = getPasscodeFallbackVariants('MonaTrip88');
    expect(variants).toContain('MonaTrip88');
    expect(variants).toContain('monaTrip88');
    expect(variants).toContain('monatrip88');
  });

  it('encrypts and decrypts vault state losslessly using BC2 binary AES-GCM envelope', async () => {
    const state = createInitialVaultState();
    state.isUneditedDefault = false;
    state.updatedAt = 1700000000000;
    state.profile.geminiApiKey = 'AIzaSyTestEncryptedInVaultOnly';
    const raw = JSON.stringify(state);
    const cipher = await encryptVaultPayload(raw, 'test-pass-123');
    expect(cipher.startsWith('BC2:')).toBe(true);
    const plain = await decryptVaultPayload(cipher, 'test-pass-123');
    expect(JSON.parse(plain).profile.geminiApiKey).toBe('AIzaSyTestEncryptedInVaultOnly');
  });

  it('encodes + signs safely via URLSearchParams for textdb.online form body', () => {
    const body = buildTextDbFormBody('bobotalk_perm_v1_abc', 'BC2:abc+def/123==');
    expect(body).toContain('BC2%3Aabc%2Bdef%2F123%3D%3D');
  });

  it('protects cloud records from being overwritten by unedited default state and respects tombstones', () => {
    const freshDefault = createInitialVaultState();
    const remoteEdited = createInitialVaultState();
    remoteEdited.isUneditedDefault = false;
    remoteEdited.updatedAt = 5000;
    remoteEdited.dialogues = [
      {
        id: 'turn-1',
        speaker: 'me',
        targetLang: 'ja',
        sourceText: '請給我兩份',
        translatedText: '2つください',
        engine: 'builtin',
        createdAt: 4000,
        updatedAt: 4000,
      },
    ];

    const merged1 = mergeVaultStates(freshDefault, remoteEdited);
    expect(merged1.isUneditedDefault).toBe(false);
    expect(merged1.dialogues).toHaveLength(1);

    // Tombstone deletion check
    const localWithDelete = {
      ...merged1,
      updatedAt: 6000,
      dialogues: [],
      deletedIds: { 'turn-1': 5500 },
    };
    const merged2 = mergeVaultStates(localWithDelete, remoteEdited);
    expect(merged2.dialogues).toHaveLength(0);
    expect(merged2.deletedIds['turn-1']).toBe(5500);
  });

  it('extracts prices, gate numbers, and platforms from broadcast text', () => {
    const kws = extractImportantKeywords(
      'Gate B14 boarding at 14:30, total ¥5,800 on 3番線'
    );
    expect(kws.length).toBeGreaterThanOrEqual(3);
  });

  it('matches offline survival phrases with Taiwanese phonetic hint and back-translation verification', async () => {
    const res = await translateTextDualEngine({
      text: '不好意思，我們有兩位，請問現在有位子嗎？',
      direction: 'zh-to-foreign',
      targetLang: 'ja',
    });
    expect(res.translatedText).toContain('2人');
    expect(res.phoneticHint).toContain('斯咪媽線');
    expect(res.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it('penalizes back-translation confidence when numbers or negations mismatch', () => {
    const exactMatch = computeBackTranslationConfidence('請給我2份不要蔥', '請給我2份不要蔥');
    const negationLost = computeBackTranslationConfidence('請給我2份不要蔥', '請給我2份加蔥');
    const numberLost = computeBackTranslationConfidence('請給我3份拉麵', '請給我1份拉麵');
    expect(exactMatch).toBeGreaterThanOrEqual(90);
    expect(negationLost).toBeLessThan(exactMatch);
    expect(numberLost).toBeLessThan(exactMatch);
  });

  it('extracts word-by-word verification tokens for Japanese and Korean sentences', () => {
    const jaTokens = buildLocalWordBreakdowns('すみません、ネギ抜きで水を2つください', 'ja');
    expect(jaTokens.some((t) => t.term.includes('抜き'))).toBe(true);
    expect(jaTokens.some((t) => t.term.includes('水'))).toBe(true);

    const koTokens = buildLocalWordBreakdowns('화장실은 어디에 있나요? 포장해 주세요', 'ko');
    expect(koTokens.some((t) => t.term === '화장실')).toBe(true);
    expect(koTokens.some((t) => t.term === '포장')).toBe(true);
  });

  it('cleans real OCR menu lines and detects dietary badges', () => {
    const sampleOcr = `
      === --- ===
      名物！特選和牛カルビ・・・1,280円
      豚骨チャーシューラーメン
      ¥980
      海鮮お刺身盛り合わせ 1580円
    `;
    const cleaned = cleanOcrMenuLines(sampleOcr);
    expect(cleaned.length).toBe(3);
    expect(cleaned[0]).toContain('和牛カルビ');
    expect(cleaned[0]).toContain('1,280円');
    // Standalone ¥980 line should be automatically merged onto the preceding dish line
    expect(cleaned[1]).toContain('豚骨チャーシューラーメン ¥980');
    expect(detectDishDietaryWarning(cleaned[0])).toContain('含牛肉');
    expect(detectDishDietaryWarning(cleaned[1])).toContain('含豬肉');
    expect(detectDishDietaryWarning(cleaned[2])).toContain('生食');
  });

  it('removes Tesseract Japanese inter-character spaces and splits multi-column dish lines', () => {
    const tesseractSpacedRaw = `
      親 子 丼 9 8 0 円   カ ツ 丼 1 , 1 0 0 円
      天 ぷ ら う ど ん 1 , 2 5 0 円
    `;
    const cleaned = cleanOcrMenuLines(tesseractSpacedRaw);
    expect(cleaned).toContain('親子丼 980円');
    expect(cleaned).toContain('カツ丼 1,100円');
    expect(cleaned).toContain('天ぷらうどん 1,250円');
  });

  it('extracts restaurant names from Google Maps URLs and fetches official restaurant menus', async () => {
    const parsedName = extractRestaurantNameFromInput(
      'https://www.google.com/maps/place/%E4%B8%80%E8%98%AD+%E6%96%B0%E5%AE%BF%E4%B8%AD%E5%A4%AE%E6%9D%B1%E5%8F%A3%E5%BA%97/@35.69,139.70,17z'
    );
    expect(parsedName).toContain('一蘭');

    const menuRes = await searchRestaurantMenuOnline({
      query: '一蘭',
      targetLang: 'ja',
    });
    expect(menuRes.title).toContain('一蘭');
    expect(menuRes.items.length).toBeGreaterThanOrEqual(5);
    expect(menuRes.items[0].originalName).toContain('とんこつラーメン');
    expect(menuRes.googleMapsUrl).toContain('google.com/maps');
  });

  it('maps sub-region OCR bounding boxes back to full menu image coordinates and ensures fallback bboxes', () => {
    const mapped = mapSubBboxToFullImage(
      { xPct: 10, yPct: 20, wPct: 50, hPct: 10 },
      { xPct: 20, yPct: 30, wPct: 60, hPct: 40 }
    );
    expect(mapped.xPct).toBeCloseTo(26, 1);
    expect(mapped.yPct).toBeCloseTo(38, 1);
    expect(mapped.wPct).toBeCloseTo(30, 1);
    expect(mapped.hPct).toBeCloseTo(4, 1);

    const itemsWithFallback = ensureMenuDishesHaveBboxes([
      {
        id: 'dish-1',
        originalName: '親子丼',
        translatedZh: '親子丼（雞肉滑蛋蓋飯）',
        descriptionZh: '滑嫩雞蛋與雞肉蓋飯',
        quantity: 0,
      },
      {
        id: 'dish-2',
        originalName: 'カツ丼',
        translatedZh: '炸豬排滑蛋蓋飯',
        descriptionZh: '酥脆炸豬排與滑蛋',
        quantity: 0,
      },
    ]);
    expect(itemsWithFallback[0].bbox).toBeDefined();
    expect(itemsWithFallback[1].bbox).toBeDefined();
    expect(itemsWithFallback[1].bbox!.yPct).toBeGreaterThan(itemsWithFallback[0].bbox!.yPct);
  });

  it('normalizes Taiwanese restaurant search queries and parses real menu items & prices from web search markdown', () => {
    expect(normalizeRestaurantQueryForLocalSearch('五代目花山烏龍麵', 'ja')).toBe('五代目花山うどん');
    expect(normalizeRestaurantQueryForLocalSearch('挽肉與米', 'ja')).toBe('挽肉と米');

    const sampleSearchMd = `
      ### [お品書き | 花山うどん 日本橋店](https://www.hanayamaudon.co.jp/nihonbashi/menu/)
      * ざる（醤油つゆ）鬼ひも川／うどん 890円
      * 鬼釜（群馬県産 麦豚使用）鬼ひも川 1,300円
      [鶏白湯Sobaの画像 鶏白湯Soba 1,200円 ★ 4.6 (5件)](https://map.yahoo.co.jp/place)
      ## [330円.](https://www.umenu.jp/menus/435.html)
      【二階建て生ほたて(一貫)】
    `;

    const urls = extractMenuUrlsFromSearchMarkdown(sampleSearchMd);
    expect(urls[0]).toBe('https://www.umenu.jp/menus/435.html');
    expect(urls[1]).toBe('https://www.hanayamaudon.co.jp/nihonbashi/menu/');

    const dishes = extractRealMenuDishesFromWebMarkdown(sampleSearchMd, 'ja');
    expect(dishes.some((d) => d.originalName.includes('二階建て生ほたて') && d.priceForeign === 330)).toBe(true);
    expect(dishes.some((d) => d.originalName.includes('鶏白湯Soba') && d.priceForeign === 1200)).toBe(true);
    expect(dishes.some((d) => d.originalName.includes('鬼釜') && d.priceForeign === 1300)).toBe(true);
  });
});
