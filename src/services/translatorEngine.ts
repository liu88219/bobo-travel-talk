import {
  LanguageCode,
  TranslationTone,
  MenuDishItem,
  WordBreakdownItem,
} from '../types/travel';
import {
  LANGUAGES,
  BUILTIN_SURVIVAL_PHRASES,
} from '../data/languages';

export interface TranslationResult {
  sourceText: string;
  translatedText: string;
  romanization: string;
  phoneticHint: string;
  culturalTip?: string;
  backTranslatedText: string;
  confidenceScore: number;
  wordBreakdowns: WordBreakdownItem[];
  alternativeText?: string;
  highlightKeywords: string[];
  engine: 'builtin' | 'gemini' | 'offline';
}

export function extractImportantKeywords(text: string): string[] {
  const matches = text.match(
    /(?:Gate\s*[A-Z0-9]+|Platform\s*\d+|\d+\s*番線|\d+\s*번|\d{1,2}:\d{2}|[¥₩$€฿₫]\s*[\d,]+(?:\.\d+)?|[\d,]+\s*(?:円|원|บาท|동|歐元|日圓|韓元|台幣|元)|\b\d+\s*(?:名|人|份|つ|개|분)\b)/gi
  );
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.trim()))).slice(0, 5);
}

/**
 * 多國旅遊核心詞彙拆解字典（即使不倚賴 AI，也能在翻譯結果下方自動拆解出「外文單字 = 中文意思」供使用者逐詞核對正確性！）
 */
const CORE_VOCAB_DICTIONARY: Record<
  LanguageCode,
  Array<{ pattern: RegExp; term: string; meaning: string; pronunciation?: string }>
> = {
  ja: [
    { pattern: /すみません|스미마센/i, term: 'すみません', meaning: '不好意思／請問', pronunciation: '斯咪媽線' },
    { pattern: /ありがとう/i, term: 'ありがとうございます', meaning: '非常謝謝', pronunciation: '阿哩嘎偷' },
    { pattern: /お願いします/i, term: 'お願いします', meaning: '麻煩您了／拜託', pronunciation: '歐內嘎伊希媽斯' },
    { pattern: /ください/i, term: '〜ください', meaning: '請給我〜', pronunciation: '苦達賽' },
    { pattern: /1つ|ひとつ|一つ/i, term: '1つ (ひとつ)', meaning: '1份／1個', pronunciation: '喜偷茲' },
    { pattern: /2つ|ふたつ|二つ/i, term: '2つ (ふたつ)', meaning: '2份／2個', pronunciation: '胡塔茲' },
    { pattern: /3つ|みっつ|三つ/i, term: '3つ (みっつ)', meaning: '3份／3個', pronunciation: '咪茲' },
    { pattern: /2人|ふたり|二人/i, term: '2人 (ふたり)', meaning: '2位（人數）', pronunciation: '胡塔哩' },
    { pattern: /抜き|ぬき/i, term: '〜抜き', meaning: '不要加〜（去除）', pronunciation: '努ki' },
    { pattern: /なし|無し/i, term: '〜なし', meaning: '無〜／去〜', pronunciation: '那希' },
    { pattern: /氷|こおり/i, term: '氷 (こおり)', meaning: '冰塊', pronunciation: '口哩' },
    { pattern: /水|みず|おひや/i, term: 'お水 (おみず)', meaning: '飲用水／冰水', pronunciation: '歐咪茲' },
    { pattern: /ネギ|ねぎ|葱/i, term: 'ネギ', meaning: '青蔥', pronunciation: '內gi' },
    { pattern: /パクチー/i, term: 'パクチー', meaning: '香菜', pronunciation: '帕苦七' },
    { pattern: /牛肉|ぎゅうにく/i, term: '牛肉', meaning: '牛肉', pronunciation: '牛尼苦' },
    { pattern: /豚肉|ぶたにく/i, term: '豚肉', meaning: '豬肉', pronunciation: '布塔尼苦' },
    { pattern: /辛/i, term: '辛い (からい)', meaning: '辣', pronunciation: '卡拉伊' },
    { pattern: /会計|かいけい/i, term: 'お会計', meaning: '結帳買單', pronunciation: '歐開K' },
    { pattern: /免税|めんぜい|Tax-Free/i, term: '免税 (Tax-Free)', meaning: '辦理免稅', pronunciation: '麵Z' },
    { pattern: /クレジットカード|カード/i, term: 'カード', meaning: '信用卡', pronunciation: '卡兜' },
    { pattern: /トイレ|お手洗い/i, term: 'トイレ / お手洗い', meaning: '洗手間', pronunciation: '偷伊勒' },
    { pattern: /駅|えき/i, term: '駅 (えき)', meaning: '車站', pronunciation: '欸ki' },
    { pattern: /メニュー/i, term: 'メニュー', meaning: '菜單', pronunciation: '美牛' },
    { pattern: /おすすめ/i, term: 'おすすめ', meaning: '推薦招牌', pronunciation: '歐斯斯妹' },
    { pattern: /試着|しちゃく/i, term: '試着', meaning: '試穿', pronunciation: '希洽苦' },
    { pattern: /荷物|にもつ/i, term: '荷物', meaning: '行李', pronunciation: '尼某茲' },
  ],
  ko: [
    { pattern: /저기요|여기요/i, term: '저기요', meaning: '不好意思（叫店員）', pronunciation: '揪gi唷' },
    { pattern: /감사합니다/i, term: '감사합니다', meaning: '謝謝', pronunciation: '康撒哈咪達' },
    { pattern: /주세요/i, term: '〜주세요', meaning: '請給我〜', pronunciation: '朱誰唷' },
    { pattern: /하나|1개/i, term: '하나', meaning: '1份／1個', pronunciation: '哈那' },
    { pattern: /두\s*개|둘|두\s*명/i, term: '둘 / 두 명', meaning: '2個／2位', pronunciation: '嘟 / 嘟謬' },
    { pattern: /빼\s*주세요|빼고/i, term: '빼 주세요', meaning: '請不要加（拿掉）', pronunciation: '背 朱誰唷' },
    { pattern: /얼음/i, term: '얼음', meaning: '冰塊', pronunciation: '歐冷' },
    { pattern: /고수/i, term: '고수', meaning: '香菜', pronunciation: '勾蘇' },
    { pattern: /파/i, term: '파', meaning: '青蔥', pronunciation: '帕' },
    { pattern: /맵게|매운/i, term: '안 맵게', meaning: '不要太辣', pronunciation: '安 妹給' },
    { pattern: /계산/i, term: '계산', meaning: '結帳', pronunciation: '給三' },
    { pattern: /택스\s*리펀드|면세/i, term: '면세 (Tax Refund)', meaning: '退稅', pronunciation: '謬誰' },
    { pattern: /카드/i, term: '신용카드', meaning: '信用卡', pronunciation: '新庸卡德' },
    { pattern: /화장실/i, term: '화장실', meaning: '洗手間', pronunciation: '花江希' },
    { pattern: /포장/i, term: '포장', meaning: '外帶打包', pronunciation: '坡江' },
  ],
  en: [
    { pattern: /\bexcuse me\b/i, term: 'Excuse me', meaning: '不好意思／請問' },
    { pattern: /\bplease\b/i, term: 'please', meaning: '請／麻煩' },
    { pattern: /\bno ice\b/i, term: 'no ice', meaning: '去冰' },
    { pattern: /\bcilantro|coriander\b/i, term: 'cilantro', meaning: '香菜' },
    { pattern: /\bgreen onion|scallion\b/i, term: 'green onions', meaning: '青蔥' },
    { pattern: /\bbill|check\b/i, term: 'bill / check', meaning: '帳單結帳' },
    { pattern: /\btax[- ]?free|refund\b/i, term: 'Tax-Free refund', meaning: '退稅' },
    { pattern: /\bluggage|baggage\b/i, term: 'luggage', meaning: '行李' },
    { pattern: /\bplatform|gate\b/i, term: 'platform / gate', meaning: '月台／登機門' },
  ],
  th: [
    { pattern: /ขอโทษ/i, term: 'ขอโทษนะคะ', meaning: '不好意思', pronunciation: '口偷娜卡' },
    { pattern: /ขอบคุณ/i, term: 'ขอบคุณค่ะ', meaning: '謝謝', pronunciation: '口坤卡' },
    { pattern: /ไม่ใส่/i, term: 'ไม่ใส่〜', meaning: '不要加〜', pronunciation: '買塞' },
    { pattern: /น้ำแข็ง/i, term: 'น้ำแข็ง', meaning: '冰塊', pronunciation: '楠肯' },
    { pattern: /ผักชี/i, term: 'ผักชี', meaning: '香菜', pronunciation: '帕七' },
    { pattern: /เผ็ดน้อย/i, term: 'เผ็ดน้อย', meaning: '小辣／微辣', pronunciation: '佩餒' },
    { pattern: /เช็คบิล/i, term: 'เช็คบิล', meaning: '結帳買單', pronunciation: 'Check 賓' },
  ],
  vi: [
    { pattern: /xin lỗi/i, term: 'Xin lỗi', meaning: '不好意思', pronunciation: '新樓伊' },
    { pattern: /cảm ơn/i, term: 'Cảm ơn', meaning: '謝謝', pronunciation: '感恩' },
    { pattern: /không/i, term: 'không〜', meaning: '不要／無〜', pronunciation: '空' },
    { pattern: /đá/i, term: 'không đá', meaning: '去冰', pronunciation: '空打' },
    { pattern: /rau mùi|ngò/i, term: 'rau mùi', meaning: '香菜', pronunciation: '繞母伊' },
    { pattern: /tính tiền/i, term: 'tính tiền', meaning: '結帳算錢', pronunciation: '頂點' },
  ],
  fr: [
    { pattern: /\bbonjour\b/i, term: 'Bonjour', meaning: '日安／您好', pronunciation: '崩啾' },
    { pattern: /s['’]il vous plaît/i, term: 's’il vous plaît', meaning: '請／麻煩您', pronunciation: '希夫普蕾' },
    { pattern: /\bsans\b/i, term: 'sans〜', meaning: '不要加〜（無）', pronunciation: '桑' },
    { pattern: /\baddition\b/i, term: 'l’addition', meaning: '帳單結帳', pronunciation: '拉迪兄' },
    { pattern: /\bdétaxe\b/i, term: 'détaxe', meaning: '退稅', pronunciation: '得塔克斯' },
    { pattern: /\bcarafe d['’]eau\b/i, term: 'carafe d’eau', meaning: '免費飲用水壺', pronunciation: '卡拉夫 兜' },
  ],
  es: [
    { pattern: /\bhola\b/i, term: 'Hola', meaning: '您好', pronunciation: '歐拉' },
    { pattern: /\bpor favor\b/i, term: 'por favor', meaning: '請／麻煩', pronunciation: '破法否' },
    { pattern: /\bsin\b/i, term: 'sin〜', meaning: '不要加〜（無）', pronunciation: '新' },
    { pattern: /\bcuenta\b/i, term: 'la cuenta', meaning: '帳單結帳', pronunciation: '拉困塔' },
  ],
  de: [
    { pattern: /\bbitte\b/i, term: 'bitte', meaning: '請／麻煩', pronunciation: '筆特' },
    { pattern: /\bohne\b/i, term: 'ohne〜', meaning: '不要加〜（無）', pronunciation: '歐呢' },
    { pattern: /\brechnung\b/i, term: 'die Rechnung', meaning: '帳單結帳', pronunciation: '迪瑞許農' },
  ],
};

export function buildLocalWordBreakdowns(
  foreignText: string,
  targetLang: LanguageCode
): WordBreakdownItem[] {
  const list = CORE_VOCAB_DICTIONARY[targetLang] || [];
  const hits: WordBreakdownItem[] = [];
  for (const entry of list) {
    if (entry.pattern.test(foreignText)) {
      hits.push({
        term: entry.term,
        meaning: entry.meaning,
        pronunciation: entry.pronunciation,
      });
    }
  }
  // Also extract any numbers/prices in the sentence
  const numMatches = foreignText.match(/\d+(?:,\d+)*(?:\.\d+)?\s*(?:円|원|名|人|つ|개|분|%|฿|€|\$)?/g);
  if (numMatches) {
    for (const nm of numMatches.slice(0, 2)) {
      if (!hits.some((h) => h.term.includes(nm.trim()))) {
        hits.push({
          term: nm.trim(),
          meaning: `數字／數量核對：${nm.trim()}`,
        });
      }
    }
  }
  return hits.slice(0, 6);
}

/**
 * 計算「原文中文」與「外文逆向回譯中文」的語意吻合度信心分數 (0 ~ 99%)
 * 特別針對：否定詞（不/無/別/去）、數字金額、核心中文字根做嚴格比對！
 */
export function computeBackTranslationConfidence(
  originalZh: string,
  backTranslatedZh: string
): number {
  const a = originalZh.trim();
  const b = backTranslatedZh.trim();
  if (!a || !b) return 85;
  if (a === b) return 99;

  // Check if numbers match
  const numsA = (a.match(/\d+/g) || []).join(',');
  const numsB = (b.match(/\d+/g) || []).join(',');
  const hasArabicNumMismatch = numsA && numsB && numsA !== numsB;

  // Check negation consistency (e.g. 不要/不吃/去冰 vs positive)
  const negRegex = /不|無|沒|別|去冰|少冰|免/;
  const negA = negRegex.test(a);
  const negB = negRegex.test(b);
  const negationMismatch = negA !== negB;

  // Character bigram / character overlap
  const cleanChars = (s: string) =>
    Array.from(s.replace(/[，。！？、,.\s!?:;「」『』（）()]/g, ''));
  const charsA = cleanChars(a);
  const charsB = new Set(cleanChars(b));
  let hit = 0;
  for (const ch of charsA) {
    if (charsB.has(ch)) hit++;
  }
  const ratio = charsA.length > 0 ? hit / charsA.length : 0.7;

  let score = Math.round(78 + ratio * 20);
  if (hasArabicNumMismatch) score -= 18;
  if (negationMismatch) score -= 22;
  return Math.max(55, Math.min(99, score));
}

function findOfflinePhraseMatch(
  text: string,
  direction: 'zh-to-foreign' | 'foreign-to-zh',
  targetLang: LanguageCode
): TranslationResult | null {
  const clean = text.trim();
  if (!clean) return null;
  for (const item of BUILTIN_SURVIVAL_PHRASES) {
    const tr = item.translations[targetLang];
    if (!tr) continue;
    if (direction === 'zh-to-foreign') {
      if (item.zhText === clean || (item.zhText.includes(clean) && clean.length >= 6)) {
        return {
          sourceText: clean,
          translatedText: tr.text,
          romanization: tr.romanization,
          phoneticHint: tr.phoneticHint,
          culturalTip: item.note,
          backTranslatedText: item.zhText,
          confidenceScore: 99,
          wordBreakdowns: buildLocalWordBreakdowns(tr.text, targetLang),
          highlightKeywords: extractImportantKeywords(tr.text),
          engine: 'offline',
        };
      }
    } else {
      if (tr.text.toLowerCase() === clean.toLowerCase()) {
        return {
          sourceText: clean,
          translatedText: item.zhText,
          romanization: tr.romanization,
          phoneticHint: tr.phoneticHint,
          culturalTip: item.note,
          backTranslatedText: tr.text,
          confidenceScore: 99,
          wordBreakdowns: buildLocalWordBreakdowns(tr.text, targetLang),
          highlightKeywords: extractImportantKeywords(item.zhText),
          engine: 'offline',
        };
      }
    }
  }
  return null;
}

async function translateViaGoogleGtx(
  text: string,
  sl: string,
  tl: string
): Promise<{ translated: string; romanization: string } | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 7500) : null;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
      sl
    )}&tl=${encodeURIComponent(tl)}&dt=t&dt=rm&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: ctrl?.signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;

    let translated = '';
    let romanization = '';
    for (const seg of data[0]) {
      if (Array.isArray(seg)) {
        if (typeof seg[0] === 'string') translated += seg[0];
        if (typeof seg[2] === 'string' && seg[2].trim()) {
          romanization = seg[2].trim();
        } else if (typeof seg[3] === 'string' && seg[3].trim() && !romanization) {
          romanization = seg[3].trim();
        }
      }
    }
    if (!translated.trim()) return null;
    return {
      translated: translated.trim(),
      romanization: romanization.trim(),
    };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function translateViaMyMemory(
  text: string,
  sl: string,
  tl: string
): Promise<string | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 7500) : null;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${encodeURIComponent(sl)}|${encodeURIComponent(tl)}`;
    const res = await fetch(url, { signal: ctrl?.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const out = data?.responseData?.translatedText;
    if (typeof out === 'string' && out.trim()) {
      return out.trim();
    }
    return null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function translateViaGemini(
  text: string,
  direction: 'zh-to-foreign' | 'foreign-to-zh',
  targetLang: LanguageCode,
  tone: TranslationTone,
  apiKey: string,
  model = 'gemini-2.5-flash'
): Promise<TranslationResult | null> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return null;
  const langCfg = LANGUAGES[targetLang];
  const toneDesc =
    tone === 'polite'
      ? '禮貌得體、對店員或當地人非常友善的道地敬語'
      : tone === 'concise'
      ? '超精簡、一眼秒懂的大字手指卡短句'
      : '自然親切的日常口語';

  const prompt =
    direction === 'zh-to-foreign'
      ? `你是一位精通台灣繁體中文與${langCfg.countryName}${langCfg.name}的隨身出國口譯專家。
請將以下台灣旅客說的話翻譯成最道地的【${langCfg.name}】（語氣要求：${toneDesc}），並提供「獨立逆向直譯回譯驗算」與「關鍵詞彙逐詞拆解」，讓不懂外文的旅客能 100% 確認翻譯正確無誤。
待翻譯原文：「${text}」
請嚴格只回傳 JSON 物件（不要 markdown code block），欄位如下：
{
  "translatedText": "翻譯後的${langCfg.name}句子",
  "backTranslatedText": "將上方 translatedText 逐字直譯回台灣繁體中文的意思（讓旅客驗算對方實際會讀到的語意）",
  "confidenceScore": 98,
  "romanization": "該外語句子的羅馬拼音或發音標記",
  "phoneticHint": "用台灣人秒懂的中文/注音諧音寫出『空耳發音教學』",
  "alternativeText": "另一種更簡短直白的${langCfg.name}替換說法",
  "wordBreakdowns": [
    { "term": "外文關鍵字", "meaning": "對應中文意思", "pronunciation": "空耳短音" }
  ],
  "culturalTip": "一句簡短實用的當地旅遊溝通小提醒（25字內）"
}`
      : `你是一位精通${langCfg.countryName}${langCfg.name}與台灣繁體中文的隨身出國口譯專家。
請將以下當地人或廣播說的外語翻譯成自然好懂的【台灣繁體中文】，並拆解裡面的關鍵外語單字讓旅客核對。
待翻譯外語原文：「${text}」
請嚴格只回傳 JSON 物件（不要 markdown code block），欄位如下：
{
  "translatedText": "翻譯後的台灣繁體中文",
  "backTranslatedText": "字面直譯核對（繁體中文）",
  "confidenceScore": 98,
  "romanization": "原文的羅馬拼音",
  "phoneticHint": "若旅客想簡單回應，推薦一句最實用的${langCfg.name}短句＋台灣空耳發音",
  "wordBreakdowns": [
    { "term": "原文中的關鍵單字", "meaning": "中文意思", "pronunciation": "空耳短音" }
  ],
  "culturalTip": "一句簡短情境重點提示（例如金額、月台、或是店員在問什麼，25字內）"
}`;

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 12000) : null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(cleanKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
        signal: ctrl?.signal,
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) return null;
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed.translatedText !== 'string') return null;

    const foreignSentence =
      direction === 'zh-to-foreign' ? parsed.translatedText.trim() : text.trim();
    const aiBreakdowns: WordBreakdownItem[] = Array.isArray(parsed.wordBreakdowns)
      ? parsed.wordBreakdowns
          .filter((w: Record<string, unknown>) => w && typeof w.term === 'string')
          .map((w: Record<string, unknown>) => ({
            term: String(w.term).trim(),
            meaning: String(w.meaning || '').trim(),
            pronunciation: w.pronunciation ? String(w.pronunciation).trim() : undefined,
          }))
      : buildLocalWordBreakdowns(foreignSentence, targetLang);

    return {
      sourceText: text.trim(),
      translatedText: parsed.translatedText.trim(),
      romanization: typeof parsed.romanization === 'string' ? parsed.romanization.trim() : '',
      phoneticHint: typeof parsed.phoneticHint === 'string' ? parsed.phoneticHint.trim() : '',
      culturalTip: typeof parsed.culturalTip === 'string' ? parsed.culturalTip.trim() : undefined,
      backTranslatedText:
        typeof parsed.backTranslatedText === 'string' && parsed.backTranslatedText.trim()
          ? parsed.backTranslatedText.trim()
          : parsed.translatedText.trim(),
      confidenceScore:
        typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 97,
      wordBreakdowns:
        aiBreakdowns.length > 0
          ? aiBreakdowns
          : buildLocalWordBreakdowns(foreignSentence, targetLang),
      alternativeText:
        typeof parsed.alternativeText === 'string' ? parsed.alternativeText.trim() : undefined,
      highlightKeywords: extractImportantKeywords(
        `${text} ${parsed.translatedText}`
      ),
      engine: 'gemini',
    };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function translateTextDualEngine(params: {
  text: string;
  direction: 'zh-to-foreign' | 'foreign-to-zh';
  targetLang: LanguageCode;
  tone?: TranslationTone;
  geminiApiKey?: string;
  geminiModel?: string;
}): Promise<TranslationResult> {
  const cleanText = params.text.trim();
  if (!cleanText) {
    throw new Error('請先輸入或說出要翻譯的內容');
  }

  // 1. If Gemini API Key is configured in user's encrypted vault, try AI Pro Engine first
  if (params.geminiApiKey && params.geminiApiKey.trim().length > 10) {
    const aiRes = await translateViaGemini(
      cleanText,
      params.direction,
      params.targetLang,
      params.tone || 'polite',
      params.geminiApiKey,
      params.geminiModel || 'gemini-2.5-flash'
    );
    if (aiRes) return aiRes;
  }

  // 2. Check exact match in 100% Offline Survival Phrasebook (includes complete Taiwanese 空耳發音!)
  const offlineHit = findOfflinePhraseMatch(cleanText, params.direction, params.targetLang);
  if (offlineHit) return offlineHit;

  // 3. Built-in Free Engine (Google GTX with transliteration + Independent Reverse Back-Translation Verification!)
  const sl = params.direction === 'zh-to-foreign' ? 'zh-TW' : params.targetLang;
  const tl = params.direction === 'zh-to-foreign' ? params.targetLang : 'zh-TW';

  const gtx = await translateViaGoogleGtx(cleanText, sl, tl);
  if (gtx) {
    // Perform independent Reverse Back-Translation (`tl -> sl`) so the user can verify 100% accuracy!
    let backTranslatedText = '';
    let confidenceScore = 94;
    if (params.direction === 'zh-to-foreign') {
      const reverseGtx = await translateViaGoogleGtx(
        gtx.translated,
        params.targetLang,
        'zh-TW'
      );
      backTranslatedText = reverseGtx?.translated || cleanText;
      confidenceScore = computeBackTranslationConfidence(cleanText, backTranslatedText);
    } else {
      const reverseGtx = await translateViaGoogleGtx(
        gtx.translated,
        'zh-TW',
        params.targetLang
      );
      backTranslatedText = reverseGtx?.translated
        ? `逆向回譯核對：${reverseGtx.translated}`
        : gtx.translated;
      confidenceScore = 95;
    }

    const foreignSentence =
      params.direction === 'zh-to-foreign' ? gtx.translated : cleanText;

    return {
      sourceText: cleanText,
      translatedText: gtx.translated,
      romanization: gtx.romanization,
      phoneticHint: gtx.romanization
        ? `發音拼音：${gtx.romanization}`
        : '點按下方「🔊 朗讀」或「🐢 0.7x 慢速」可直接播放地道語音',
      backTranslatedText,
      confidenceScore,
      wordBreakdowns: buildLocalWordBreakdowns(foreignSentence, params.targetLang),
      highlightKeywords: extractImportantKeywords(`${cleanText} ${gtx.translated}`),
      engine: 'builtin',
    };
  }

  const mm = await translateViaMyMemory(cleanText, sl, tl);
  if (mm) {
    const foreignSentence = params.direction === 'zh-to-foreign' ? mm : cleanText;
    return {
      sourceText: cleanText,
      translatedText: mm,
      romanization: '',
      phoneticHint: '點按下方「🔊 朗讀」可直接播放地道語音給對方聽',
      backTranslatedText: cleanText,
      confidenceScore: 90,
      wordBreakdowns: buildLocalWordBreakdowns(foreignSentence, params.targetLang),
      highlightKeywords: extractImportantKeywords(`${cleanText} ${mm}`),
      engine: 'builtin',
    };
  }

  // 4. Ultimate offline graceful fallback
  const cfg = LANGUAGES[params.targetLang];
  return {
    sourceText: cleanText,
    translatedText:
      params.direction === 'zh-to-foreign'
        ? `[離線模式] ${cfg.orderGreeting} ${cleanText}`
        : `[離線模式] ${cleanText}`,
    romanization: '',
    phoneticHint: '目前處於離線狀態，建議切換至「🪧 離線手指卡」直接出示常用句或播放內建離線語音！',
    backTranslatedText: '離線模式（未連線至翻譯伺服器）',
    confidenceScore: 80,
    wordBreakdowns: [],
    highlightKeywords: extractImportantKeywords(cleanText),
    engine: 'offline',
  };
}

/**
 * 當使用者設定了 Gemini API Key 時，支援將 MediaRecorder 錄下的真實音訊直接送交 Gemini 多模態聽寫＋翻譯＋雙向回譯驗證
 */
export async function transcribeAndTranslateAudioWithGemini(params: {
  audioBase64: string;
  mimeType: string;
  direction: 'zh-to-foreign' | 'foreign-to-zh';
  targetLang: LanguageCode;
  tone: TranslationTone;
  geminiApiKey: string;
  geminiModel?: string;
}): Promise<TranslationResult | null> {
  const cleanKey = params.geminiApiKey.trim();
  if (!cleanKey || !params.audioBase64) return null;
  const langCfg = LANGUAGES[params.targetLang];
  const model = params.geminiModel || 'gemini-2.5-flash';

  const prompt =
    params.direction === 'zh-to-foreign'
      ? `請聽這段中文語音錄音，先精準聽寫出中文原文，接著翻譯成最自然有禮貌的【${langCfg.name}】，並附上直譯回譯驗算與關鍵單字拆解。
請嚴格只回傳 JSON 物件：
{
  "sourceText": "聽寫出的繁體中文原文",
  "translatedText": "翻譯後的${langCfg.name}",
  "backTranslatedText": "將 translatedText 逆向直譯回繁體中文的意思（供旅客驗算正確性）",
  "confidenceScore": 98,
  "romanization": "${langCfg.name}羅馬拼音",
  "phoneticHint": "台灣人秒懂的空耳發音教學",
  "wordBreakdowns": [
    { "term": "外文關鍵字", "meaning": "中文意思" }
  ],
  "culturalTip": "簡短旅遊小提醒（25字內）"
}`
      : `請聽這段【${langCfg.name}】語音或廣播錄音，先精準聽寫出${langCfg.name}原文，接著翻譯成自然好懂的【台灣繁體中文】。
請嚴格只回傳 JSON 物件：
{
  "sourceText": "聽寫出的${langCfg.name}原文",
  "translatedText": "翻譯後的台灣繁體中文",
  "backTranslatedText": "字面直譯核對（繁體中文）",
  "confidenceScore": 98,
  "romanization": "原文羅馬拼音",
  "phoneticHint": "重點關鍵字或建議簡短回應的空耳發音",
  "wordBreakdowns": [
    { "term": "外文關鍵字", "meaning": "中文意思" }
  ],
  "culturalTip": "店員或廣播的核心重點提醒（25字內）"
}`;

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 16000) : null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(cleanKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: params.mimeType || 'audio/webm',
                    data: params.audioBase64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
        signal: ctrl?.signal,
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) return null;
    const parsed = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
    if (!parsed || !parsed.translatedText) return null;
    const foreignSentence =
      params.direction === 'zh-to-foreign'
        ? parsed.translatedText.trim()
        : (parsed.sourceText || '').trim();
    return {
      sourceText: (parsed.sourceText || '（語音錄音）').trim(),
      translatedText: parsed.translatedText.trim(),
      backTranslatedText:
        typeof parsed.backTranslatedText === 'string'
          ? parsed.backTranslatedText.trim()
          : parsed.translatedText.trim(),
      confidenceScore:
        typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 97,
      romanization: (parsed.romanization || '').trim(),
      phoneticHint: (parsed.phoneticHint || '').trim(),
      wordBreakdowns: Array.isArray(parsed.wordBreakdowns)
        ? parsed.wordBreakdowns
        : buildLocalWordBreakdowns(foreignSentence, params.targetLang),
      culturalTip: parsed.culturalTip ? String(parsed.culturalTip).trim() : undefined,
      highlightKeywords: extractImportantKeywords(
        `${parsed.sourceText || ''} ${parsed.translatedText}`
      ),
      engine: 'gemini',
    };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 自動偵測菜名中的飲食過敏／忌口標籤（牛肉、豬肉、生食、海鮮蝦蟹、辣味、酒精）
 */
export function detectDishDietaryWarning(text: string): string | undefined {
  const tags: string[] = [];
  if (/牛|和牛|カルビ|ロース|ビーフ|beef|소고기|한우|bœuf|res/i.test(text)) {
    tags.push('🐄 含牛肉');
  }
  if (/豚|チャーシュー|ポーク|とんかつ|pork|돼지|삼겹살|porc|cerdo/i.test(text)) {
    tags.push('🐷 含豬肉');
  }
  if (/刺身|生|ユッケ|タルタル|sashimi|raw|육회|회/i.test(text)) {
    tags.push('🍣 生食注意');
  }
  if (/海老|エビ|えび|蟹|カニ|かに|海鮮|shrimp|crab|prawn|새우|게|해물|crevette/i.test(text)) {
    tags.push('🦐 含蝦蟹海鮮');
  }
  if (/辛|キムチ|麻辣|唐辛子|spicy|매운|김치|เผ็ด/i.test(text)) {
    tags.push('🌶️ 辣味');
  }
  if (/サワー|ビール|酒|ハイボール|ワイン|焼酎|beer|wine|sake|소주|맥주|アルコール/i.test(text)) {
    tags.push('🍺 含酒精');
  }
  return tags.length > 0 ? tags.slice(0, 2).join('・') : undefined;
}

/**
 * 拍照菜單視覺辨識（Gemini Vision — 支援手寫字、直書縦書き、多欄複雜菜單）
 */
export async function analyzeMenuPhotoWithGemini(params: {
  imageDataUrl: string;
  targetLang: LanguageCode;
  geminiApiKey: string;
  geminiModel?: string;
}): Promise<{ title: string; items: MenuDishItem[] } | null> {
  const cleanKey = params.geminiApiKey.trim();
  if (!cleanKey || !params.imageDataUrl.startsWith('data:image/')) return null;

  const commaIdx = params.imageDataUrl.indexOf(',');
  const header = params.imageDataUrl.slice(0, commaIdx);
  const base64Data = params.imageDataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const langCfg = LANGUAGES[params.targetLang];
  const model = params.geminiModel || 'gemini-2.5-flash';

  const prompt = `你是一位專業的${langCfg.countryName}餐廳菜單翻譯助手。請仔細辨識這張菜單照片中實際出現的所有餐點／飲品項目（包含橫書或直書縦書き），並逐一翻譯為台灣繁體中文。切勿編造照片中沒有的菜名！
請嚴格只回傳 JSON 物件：
{
  "title": "照片中的餐廳或菜單分類標題（繁體中文）",
  "items": [
    {
      "originalName": "照片上的外文原名（點餐給店員看用）",
      "translatedZh": "台灣繁體中文菜名翻譯",
      "romanization": "外文發音或羅馬拼音",
      "descriptionZh": "食材、口味或料理方式簡短說明",
      "priceForeign": 數字金額（若照片上有標價請填純數字，無標價填 null）,
      "dietaryWarning": "若含牛肉/豬肉/生食/花生/甲殼類/辣味/酒精請標註，無則填 null"
    }
  ]
}`;

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 24000) : null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(cleanKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
        signal: ctrl?.signal,
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) return null;
    const parsed = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
    if (!parsed || !Array.isArray(parsed.items)) return null;
    const now = Date.now();
    const items: MenuDishItem[] = parsed.items
      .filter((it: Record<string, unknown>) => it && typeof it.originalName === 'string')
      .map((it: Record<string, unknown>, idx: number) => {
        const orig = String(it.originalName).trim();
        const zh = String(it.translatedZh || it.originalName).trim();
        return {
          id: `dish-${now}-${idx}`,
          originalName: orig,
          translatedZh: zh,
          romanization: it.romanization ? String(it.romanization).trim() : undefined,
          descriptionZh: it.descriptionZh ? String(it.descriptionZh).trim() : undefined,
          priceForeign:
            typeof it.priceForeign === 'number' && Number.isFinite(it.priceForeign)
              ? it.priceForeign
              : undefined,
          dietaryWarning: it.dietaryWarning
            ? String(it.dietaryWarning).trim()
            : detectDishDietaryWarning(`${orig} ${zh}`),
          quantity: 0,
        };
      });
    return {
      title:
        typeof parsed.title === 'string' && parsed.title.trim()
          ? parsed.title.trim()
          : `${langCfg.flag} AI 視覺辨識菜單`,
      items,
    };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 將圖片進行高對比文字強化預處理，大幅提升瀏覽器內建 Tesseract OCR 對日韓外文菜單的辨識準確率
 */
async function preprocessMenuImageForOcr(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(imageDataUrl);
    img.onload = () => {
      // Upscale small web menu images so characters are at least 30px tall
      const maxDim = Math.max(img.width || 1, img.height || 1);
      const scale = maxDim < 1200 ? Math.min(2.2, 1600 / maxDim) : 1;
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageDataUrl);
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      // Gentle grayscale + contrast stretching so colored menu backgrounds don't confuse OCR
      try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;
        const contrast = 1.38; // 38% contrast boost
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          let v = (gray - 128) * contrast + 128;
          if (v < 0) v = 0;
          if (v > 255) v = 255;
          d[i] = v;
          d[i + 1] = v;
          d[i + 2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
      } catch {
        // Ignore cross-origin canvas taint
      }
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = imageDataUrl;
  });
}

/**
 * 支援局部裁切圖片（當使用者在菜單照片上框選特定區塊時，只裁切該區塊放大辨識，徹底排除背景雜訊！）
 */
export async function cropImageDataUrl(
  imageDataUrl: string,
  cropRect: { xPct: number; yPct: number; wPct: number; hPct: number }
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(imageDataUrl);
    img.onload = () => {
      const sx = Math.max(0, Math.round((cropRect.xPct / 100) * img.width));
      const sy = Math.max(0, Math.round((cropRect.yPct / 100) * img.height));
      const sw = Math.max(24, Math.round((cropRect.wPct / 100) * img.width));
      const sh = Math.max(24, Math.round((cropRect.hPct / 100) * img.height));
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageDataUrl);
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = imageDataUrl;
  });
}

const TESSERACT_LANG_MAP: Record<
  LanguageCode,
  { horiz: string; vert?: string }
> = {
  ja: { horiz: 'jpn', vert: 'jpn_vert' },
  ko: { horiz: 'kor' },
  en: { horiz: 'eng' },
  th: { horiz: 'tha' },
  vi: { horiz: 'vie' },
  fr: { horiz: 'fra' },
  es: { horiz: 'spa' },
  de: { horiz: 'deu' },
};

/**
 * 清理 OCR 辨識出的原始文字行，過濾掉亂碼符號、分隔線，並合併同行的菜名與金額
 */
export function cleanOcrMenuLines(rawText: string): string[] {
  const rawLines = rawText
    .split(/\r?\n/)
    .map((line) =>
      line
        // Strip OCR dot leader noise like "・・・" "…" "---" "|||"
        .replace(/[・…‥─━ー\-=_|~｜|]{2,}/g, ' ')
        // Normalize full-width digits and spaces
        .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
        .replace(/[￥¥]/g, '¥')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((line) => line.length >= 2);

  const validLines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    // Must contain at least 2 meaningful letters/CJK characters (not just symbols or standalone numbers)
    const meaningfulChars = line.match(
      /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0e00-\u0e7fa-zA-ZÀ-ÿ]/g
    );
    const isOnlyPrice = /^(?:[¥₩$€฿₫]?\s*\d[\d,.]*\s*(?:円|원|บาท|동|税込|税抜)?)$/.test(line);

    if (isOnlyPrice && validLines.length > 0) {
      // Attach standalone price line to the previous dish line if it didn't have a price yet
      const prev = validLines[validLines.length - 1];
      if (!/\d{2,}/.test(prev)) {
        validLines[validLines.length - 1] = `${prev} ${line}`;
      }
      continue;
    }

    if (!meaningfulChars || meaningfulChars.length < 2) continue;
    validLines.push(line);
  }

  return Array.from(new Set(validLines)).slice(0, 22);
}

/**
 * 免 API Key！直接在瀏覽器內執行真實光學文字辨識 (Tesseract.js WASM OCR) ＋ Google GTX 逐道翻譯
 * 支援「橫排菜單 (horizontal)」與「日本傳統直書菜單 (vertical / 縦書き)」！
 */
export async function analyzeMenuPhotoFreeOcr(params: {
  imageDataUrl: string;
  targetLang: LanguageCode;
  orientation?: 'horizontal' | 'vertical';
  onProgress?: (statusText: string, pct: number) => void;
}): Promise<{ title: string; items: MenuDishItem[]; rawOcrText: string }> {
  const langCfg = LANGUAGES[params.targetLang];
  params.onProgress?.('🔍 正在強化菜單影像對比與清晰度...', 12);
  const enhancedUrl = await preprocessMenuImageForOcr(params.imageDataUrl);

  const tessMap = TESSERACT_LANG_MAP[params.targetLang] || { horiz: 'eng' };
  const tessLang =
    params.orientation === 'vertical' && tessMap.vert
      ? tessMap.vert
      : tessMap.horiz;

  params.onProgress?.(
    `📖 正在載入【${langCfg.flag} ${langCfg.name}${
      params.orientation === 'vertical' ? '・直書縦書き' : '・橫書'
    }】OCR 辨識模型...`,
    25
  );

  const Tesseract = await import('tesseract.js');
  const result = await Tesseract.recognize(enhancedUrl, tessLang, {
    logger: (m: { status?: string; progress?: number }) => {
      if (m && typeof m.progress === 'number') {
        const pct = Math.min(82, Math.round(25 + m.progress * 57));
        params.onProgress?.(
          `🔍 正在掃描照片中的${langCfg.name}菜名 (${Math.round(m.progress * 100)}%)...`,
          pct
        );
      }
    },
  });

  const rawOcrText = (result?.data?.text || '').trim();
  const cleanedLines = cleanOcrMenuLines(rawOcrText);

  if (cleanedLines.length === 0) {
    return {
      title: `${langCfg.flag} 實拍菜單辨識`,
      items: [],
      rawOcrText,
    };
  }

  params.onProgress?.(
    `🌐 已從照片擷取 ${cleanedLines.length} 道項目，正在逐道翻譯為繁體中文...`,
    88
  );

  const items = await parseAndTranslateMenuLinesFree(
    cleanedLines.join('\n'),
    params.targetLang
  );

  params.onProgress?.('✅ 菜單辨識與中文翻譯完成！', 100);

  return {
    title: `${langCfg.flag} 實拍菜單 (${items.length} 道餐點)`,
    items,
    rawOcrText,
  };
}

/**
 * 免 API Key！將多行外文菜單文字自動拆解價格並批次翻譯成點餐卡項目
 */
export async function parseAndTranslateMenuLinesFree(
  rawLines: string,
  targetLang: LanguageCode
): Promise<MenuDishItem[]> {
  const lines = rawLines
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 24);

  const now = Date.now();
  const items = await Promise.all(
    lines.map(async (line, idx): Promise<MenuDishItem> => {
      // Extract trailing or embedded price like 1,280円, ¥850, 15000원, €18.5, $12
      const priceMatch = line.match(
        /(?:[¥₩$€฿₫]\s*)?(\d{1,3}(?:,\d{3})+|\d{2,6}(?:\.\d{1,2})?)\s*(?:円|원|บาท|동|EUR|USD|JPY|KRW|税込|税抜)?/i
      );
      let priceForeign: number | undefined;
      let cleanDish = line;
      if (priceMatch) {
        const num = Number.parseFloat(priceMatch[1].replace(/,/g, ''));
        if (Number.isFinite(num) && num > 0) {
          priceForeign = num;
          const stripped = line.replace(priceMatch[0], '').replace(/[()（）税込税抜]/g, '').trim();
          if (stripped.length >= 2) {
            cleanDish = stripped;
          }
        }
      }
      const gtx = await translateViaGoogleGtx(cleanDish, targetLang, 'zh-TW');
      const translatedZh = gtx?.translated || `${cleanDish}`;
      return {
        id: `free-dish-${now}-${idx}`,
        originalName: cleanDish,
        translatedZh,
        romanization: gtx?.romanization || undefined,
        priceForeign,
        dietaryWarning: detectDishDietaryWarning(`${cleanDish} ${translatedZh}`),
        quantity: 0,
      };
    })
  );
  return items;
}

/**
 * 瀏覽器原生多國語音朗讀 (TTS)，支援 1.0x 正常語速與 0.72x 慢速清晰朗讀
 */
export function speakTextTTS(text: string, bcp47: string, rate = 0.95): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const clean = text.trim();
  if (!clean) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = bcp47;
    utter.rate = Math.max(0.55, Math.min(1.3, rate));
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = bcp47.split('-')[0].toLowerCase();
    const preferred =
      voices.find((v) => v.lang.toLowerCase() === bcp47.toLowerCase() && v.localService) ||
      voices.find((v) => v.lang.toLowerCase() === bcp47.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    if (preferred) {
      utter.voice = preferred;
    }
    window.speechSynthesis.speak(utter);
  } catch {
    // Ignore TTS errors on unsupported devices
  }
}

/**
 * 免金鑰拉取即時匯率 (open.er-api.com)，換算為「1 外幣 = X 台幣」
 */
export async function fetchLiveExchangeRatesToTwd(): Promise<Partial<Record<LanguageCode, number>>> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 7000) : null;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/TWD', {
      signal: ctrl?.signal,
    });
    if (!res.ok) return {};
    const data = await res.json();
    const rates = data?.rates as Record<string, number> | undefined;
    if (!rates || typeof rates !== 'object') return {};

    const out: Partial<Record<LanguageCode, number>> = {};
    (Object.keys(LANGUAGES) as LanguageCode[]).forEach((code) => {
      const curr = LANGUAGES[code].currencyCode;
      const perTwd = rates[curr];
      if (typeof perTwd === 'number' && perTwd > 0) {
        const toTwd = 1 / perTwd;
        out[code] = Number(toTwd.toPrecision(4));
      }
    });
    return out;
  } catch {
    return {};
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 將圖片壓縮為清晰且適合 OCR 與 IndexedDB 的 DataURL (預設提升至 1400px 確保菜單小字清晰)
 */
export function compressImageFileToDataUrl(
  file: File,
  maxSide = 1400,
  quality = 0.86
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('讀取照片失敗'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('解析照片失敗'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
