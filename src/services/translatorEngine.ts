import {
  LanguageCode,
  TranslationTone,
  MenuDishItem,
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
      if (item.zhText === clean || item.zhText.includes(clean) && clean.length >= 6) {
        return {
          sourceText: clean,
          translatedText: tr.text,
          romanization: tr.romanization,
          phoneticHint: tr.phoneticHint,
          culturalTip: item.note,
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
        // GTX places target or source transliteration in index 2 or 3 of the last element
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
請將以下台灣旅客說的話翻譯成最道地的【${langCfg.name}】（語氣要求：${toneDesc}）。
待翻譯原文：「${text}」
請嚴格只回傳 JSON 物件（不要 markdown code block），欄位如下：
{
  "translatedText": "翻譯後的${langCfg.name}句子",
  "romanization": "該外語句子的羅馬拼音或發音標記",
  "phoneticHint": "用台灣人秒懂的中文/注音諧音寫出『空耳發音教學』",
  "culturalTip": "一句簡短實用的當地旅遊溝通小提醒（25字內）"
}`
      : `你是一位精通${langCfg.countryName}${langCfg.name}與台灣繁體中文的隨身出國口譯專家。
請將以下當地人或廣播說的外語翻譯成自然好懂的【台灣繁體中文】。
待翻譯外語原文：「${text}」
請嚴格只回傳 JSON 物件（不要 markdown code block），欄位如下：
{
  "translatedText": "翻譯後的台灣繁體中文",
  "romanization": "原文的羅馬拼音",
  "phoneticHint": "若旅客想簡單回應，推薦一句最實用的${langCfg.name}短句＋台灣空耳發音",
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
    return {
      sourceText: text.trim(),
      translatedText: parsed.translatedText.trim(),
      romanization: typeof parsed.romanization === 'string' ? parsed.romanization.trim() : '',
      phoneticHint: typeof parsed.phoneticHint === 'string' ? parsed.phoneticHint.trim() : '',
      culturalTip: typeof parsed.culturalTip === 'string' ? parsed.culturalTip.trim() : undefined,
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

  // 3. Built-in Free Engine (Google GTX with transliteration + MyMemory fallback)
  const sl = params.direction === 'zh-to-foreign' ? 'zh-TW' : params.targetLang;
  const tl = params.direction === 'zh-to-foreign' ? params.targetLang : 'zh-TW';

  const gtx = await translateViaGoogleGtx(cleanText, sl, tl);
  if (gtx) {
    return {
      sourceText: cleanText,
      translatedText: gtx.translated,
      romanization: gtx.romanization,
      phoneticHint: gtx.romanization
        ? `發音參考：${gtx.romanization}`
        : '點按下方「🔊 朗讀」或「🐢 0.75x 慢速」可直接播放地道語音',
      highlightKeywords: extractImportantKeywords(`${cleanText} ${gtx.translated}`),
      engine: 'builtin',
    };
  }

  const mm = await translateViaMyMemory(cleanText, sl, tl);
  if (mm) {
    return {
      sourceText: cleanText,
      translatedText: mm,
      romanization: '',
      phoneticHint: '點按下方「🔊 朗讀」可直接播放地道語音給對方聽',
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
    highlightKeywords: extractImportantKeywords(cleanText),
    engine: 'offline',
  };
}

/**
 * 當使用者設定了 Gemini API Key 時，支援將 MediaRecorder 錄下的真實音訊直接送交 Gemini 多模態聽寫＋翻譯（抗吵雜環境／廣播／方言）
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
      ? `請聽這段中文語音錄音，先精準聽寫出中文原文，接著翻譯成最自然有禮貌的【${langCfg.name}】。
請嚴格只回傳 JSON 物件：
{
  "sourceText": "聽寫出的繁體中文原文",
  "translatedText": "翻譯後的${langCfg.name}",
  "romanization": "${langCfg.name}羅馬拼音",
  "phoneticHint": "台灣人秒懂的空耳發音教學",
  "culturalTip": "簡短旅遊小提醒（25字內）"
}`
      : `請聽這段【${langCfg.name}】語音或廣播錄音，先精準聽寫出${langCfg.name}原文，接著翻譯成自然好懂的【台灣繁體中文】。
請嚴格只回傳 JSON 物件：
{
  "sourceText": "聽寫出的${langCfg.name}原文",
  "translatedText": "翻譯後的台灣繁體中文",
  "romanization": "原文羅馬拼音",
  "phoneticHint": "重點關鍵字或建議簡短回應的空耳發音",
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
    return {
      sourceText: (parsed.sourceText || '（語音錄音）').trim(),
      translatedText: parsed.translatedText.trim(),
      romanization: (parsed.romanization || '').trim(),
      phoneticHint: (parsed.phoneticHint || '').trim(),
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
 * 拍照菜單視覺辨識（Gemini Vision）或文字菜單批次免費翻譯（Free GTX Engine）
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

  const prompt = `你是一位專業的${langCfg.countryName}餐廳菜單翻譯助手。請辨識這張照片中的所有餐點／商品項目，並翻譯為台灣繁體中文。
請嚴格只回傳 JSON 物件：
{
  "title": "餐廳或菜單類型名稱（繁體中文）",
  "items": [
    {
      "originalName": "菜單上的外文原名（點餐給店員看用）",
      "translatedZh": "台灣繁體中文菜名",
      "romanization": "外文發音或羅馬拼音",
      "descriptionZh": "食材、口味或料理方式簡短說明",
      "priceForeign": 數字金額（若無標價填 null）,
      "dietaryWarning": "若含牛肉/生食/花生/甲殼類/辣味請標註，無則填 null"
    }
  ]
}`;

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 20000) : null;
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
    if (!parsed || !Array.isArray(parsed.items)) return null;
    const now = Date.now();
    const items: MenuDishItem[] = parsed.items
      .filter((it: Record<string, unknown>) => it && typeof it.originalName === 'string')
      .map((it: Record<string, unknown>, idx: number) => ({
        id: `dish-${now}-${idx}`,
        originalName: String(it.originalName).trim(),
        translatedZh: String(it.translatedZh || it.originalName).trim(),
        romanization: it.romanization ? String(it.romanization).trim() : undefined,
        descriptionZh: it.descriptionZh ? String(it.descriptionZh).trim() : undefined,
        priceForeign:
          typeof it.priceForeign === 'number' && Number.isFinite(it.priceForeign)
            ? it.priceForeign
            : undefined,
        dietaryWarning: it.dietaryWarning ? String(it.dietaryWarning).trim() : undefined,
        quantity: 0,
      }));
    return {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : `${langCfg.flag} 拍照菜單翻譯`,
      items,
    };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 免 API Key！將多行外文菜單文字（例如從 iPhone 原況文字複製貼上、或手動輸入）自動拆解價格並批次翻譯成點餐卡項目
 */
export async function parseAndTranslateMenuLinesFree(
  rawLines: string,
  targetLang: LanguageCode
): Promise<MenuDishItem[]> {
  const lines = rawLines
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 20);

  const now = Date.now();
  const items = await Promise.all(
    lines.map(async (line, idx): Promise<MenuDishItem> => {
      // Extract trailing or embedded price like 1,280円, 15000원, €18.5, $12, 850
      const priceMatch = line.match(
        /(?:[¥₩$€฿₫]\s*)?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d{1,2})?)\s*(?:円|원|บาท|동|EUR|USD|JPY|KRW)?/i
      );
      let priceForeign: number | undefined;
      let cleanDish = line;
      if (priceMatch) {
        const num = Number.parseFloat(priceMatch[1].replace(/,/g, ''));
        if (Number.isFinite(num) && num > 0) {
          priceForeign = num;
          cleanDish = line.replace(priceMatch[0], '').trim() || line;
        }
      }
      const gtx = await translateViaGoogleGtx(cleanDish, targetLang, 'zh-TW');
      return {
        id: `free-dish-${now}-${idx}`,
        originalName: cleanDish,
        translatedZh: gtx?.translated || `${cleanDish}（外文原名）`,
        romanization: gtx?.romanization || undefined,
        priceForeign,
        quantity: 1,
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
 * 將圖片壓縮為適合 IndexedDB 與雲端同步的輕量 Base64 縮圖
 */
export function compressImageFileToDataUrl(
  file: File,
  maxSide = 1024,
  quality = 0.78
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
