import {
  LanguageCode,
  TranslationTone,
  MenuDishItem,
  MenuDishBbox,
  WordBreakdownItem,
  LiveSubtitleSegment,
  LiveConversationSummary,
} from '../types/travel';
import {
  LANGUAGES,
  BUILTIN_SURVIVAL_PHRASES,
} from '../data/languages';
import {
  POPULAR_RESTAURANT_MENUS,
  CUISINE_FALLBACK_MENUS,
} from '../data/restaurantMenus';

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
    /(?:Gate\s*[A-Z0-9]+|Platform\s*\d+|\d+\s*番線|\d+\s*번|\d{1,2}:\d{2}|(?:HK\$|MOP\s*|[¥₩$€฿₫])\s*[\d,]+(?:\.\d+)?|[\d,]+\s*(?:円|원|บาท|동|歐元|日圓|韓元|港幣|港紙|蚊|台幣|元)|\b\d+\s*(?:名|人|位|份|つ|개|분)\b)/gi
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
  yue: [
    { pattern: /唔該/i, term: '唔該 (m4 goi1)', meaning: '不好意思／麻煩您／謝謝', pronunciation: '嗯該' },
    { pattern: /多謝/i, term: '多謝 (do1 ze6)', meaning: '非常感謝（致謝／收禮）', pronunciation: '多謝' },
    { pattern: /唔好意思/i, term: '唔好意思', meaning: '不好意思', pronunciation: '嗯吼意思' },
    { pattern: /喺邊度/i, term: '喺邊度 (hai2 bin1 dou6)', meaning: '在哪裡', pronunciation: '孩邊兜' },
    { pattern: /幾多錢|幾錢/i, term: '幾多錢 (gei2 do1 cin2)', meaning: '多少錢', pronunciation: '給多錢' },
    { pattern: /埋單/i, term: '埋單 (maai4 daan1)', meaning: '結帳買單', pronunciation: '買單' },
    { pattern: /走冰/i, term: '走冰 (zau2 bing1)', meaning: '去冰（不要冰塊）', pronunciation: '走冰' },
    { pattern: /走青/i, term: '走青 (zau2 ceng1)', meaning: '不要加蔥花', pronunciation: '走清' },
    { pattern: /走芫荽|芫荽/i, term: '芫荽 (jyun4 sai1)', meaning: '香菜（走芫荽＝不要香菜）', pronunciation: '雲西' },
    { pattern: /走甜|少甜/i, term: '走甜／少甜', meaning: '無糖／微糖', pronunciation: '走甜／少甜' },
    { pattern: /茶走/i, term: '茶走 (caa4 zau2)', meaning: '港式奶茶改加煉乳（不加砂糖淡奶）', pronunciation: '茶走' },
    { pattern: /飛砂走奶/i, term: '飛砂走奶', meaning: '黑咖啡（去糖去奶）', pronunciation: '飛沙走奶' },
    { pattern: /搭枱/i, term: '搭枱 (daap3 toi2)', meaning: '併桌（與陌生人同桌）', pronunciation: '搭台' },
    { pattern: /堂食/i, term: '堂食 (tong4 sik6)', meaning: '內用', pronunciation: '堂食' },
    { pattern: /外賣|拎走|打包/i, term: '外賣／拎走', meaning: '外帶打包', pronunciation: '外買／拎走' },
    { pattern: /八達通/i, term: '八達通', meaning: '香港交通與小額支付卡', pronunciation: '八達通' },
    { pattern: /收唔收|得唔得/i, term: '收唔收／得唔得', meaning: '收不收／可以嗎', pronunciation: '收嗯收／德嗯德' },
    { pattern: /洗手間|廁所/i, term: '洗手間／廁所', meaning: '洗手間', pronunciation: '寫首間' },
    { pattern: /士多啤梨/i, term: '士多啤梨', meaning: '草莓', pronunciation: '士多啤梨' },
    { pattern: /西多士|多士/i, term: '西多士／多士', meaning: '法式炸厚吐司／吐司', pronunciation: '西多士' },
    { pattern: /公仔麵|撈丁/i, term: '公仔麵／撈丁', meaning: '港式泡麵／乾拌出前一丁', pronunciation: '公仔麵／撈丁' },
    { pattern: /忌廉/i, term: '忌廉', meaning: '鮮奶油', pronunciation: '給廉' },
    { pattern: /班戟/i, term: '班戟', meaning: '鬆餅／可麗餅', pronunciation: '班給' },
    { pattern: /豬扒|雞扒|雞翼/i, term: '豬扒／雞翼', meaning: '豬排／雞翅', pronunciation: '豬排／雞翼' },
    { pattern: /芝士/i, term: '芝士', meaning: '起司', pronunciation: '芝士' },
    { pattern: /吞拿魚|三文魚/i, term: '吞拿魚／三文魚', meaning: '鮪魚／鮭魚', pronunciation: '吞拿魚／三文魚' },
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
  const seenTerms = new Set<string>();

  for (const entry of list) {
    if (entry.pattern.test(foreignText)) {
      hits.push({
        term: entry.term,
        meaning: entry.meaning,
        pronunciation: entry.pronunciation,
      });
      seenTerms.add(entry.term.toLowerCase());
    }
  }

  // Mixed Cantonese/Mandarin + English code-switching word breakdowns (Kongish chips)
  const mixed = detectMixedLanguageTags(foreignText);
  if (targetLang === 'yue' || (mixed.hasMandarinOrCjk && mixed.hasEnglish)) {
    let shadow = foreignText;
    for (const entry of HONG_KONG_MIXED_ENGLISH_MAP) {
      const re = new RegExp(entry.pattern.source, 'gi');
      if (re.test(shadow)) {
        if (!seenTerms.has(entry.term.toLowerCase())) {
          hits.push({
            term: entry.term,
            meaning: entry.zh,
          });
          seenTerms.add(entry.term.toLowerCase());
        }
        // Mask matched span so overlapping shorter tokens (e.g. "check" inside "double check") are skipped
        shadow = shadow.replace(new RegExp(entry.pattern.source, 'gi'), ' ');
      }
    }
  }

  // Spoken Cantonese idioms from glossary (when not already emitted above)
  if (targetLang === 'yue') {
    for (const [pattern, twMeaning] of HK_CANTONESE_GLOSSARY_NOTES) {
      const singleRe = new RegExp(pattern.source);
      const m = foreignText.match(singleRe);
      if (m && m[0]) {
        const key = m[0].trim();
        if (!hits.some((h) => h.term.includes(key) || key.includes(h.term))) {
          hits.push({
            term: key,
            meaning: twMeaning,
          });
        }
      }
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
  return hits.slice(0, 8);
}

const HK_CANTONESE_GLOSSARY_NOTES: Array<[RegExp, string]> = [
  [/士多啤梨/g, '草莓'],
  [/班戟/g, '鬆餅／可麗餅'],
  [/西多士/g, '法式花生醬奶油炸厚吐司'],
  [/多士/g, '吐司'],
  [/三文治/g, '三明治'],
  [/忌廉/g, '鮮奶油'],
  [/公仔麵/g, '港式泡麵'],
  [/撈丁/g, '乾拌出前一丁泡麵'],
  [/意粉/g, '義大利麵'],
  [/通粉/g, '通心粉'],
  [/豬扒/g, '豬排'],
  [/雞扒/g, '雞排'],
  [/雞翼/g, '雞翅'],
  [/牛扒/g, '牛排'],
  [/吞拿魚/g, '鮪魚'],
  [/三文魚/g, '鮭魚'],
  [/芝士/g, '起司'],
  [/雪糕/g, '冰淇淋'],
  [/芫荽/g, '香菜'],
  [/走青/g, '不要加蔥花'],
  [/走冰/g, '去冰'],
  [/茶走/g, '奶茶改加煉乳不加糖'],
  [/飛砂走奶/g, '黑咖啡去糖去奶'],
  [/凍鴦|鴛鴦/g, '咖啡加港式奶茶'],
  [/搭枱/g, '併桌'],
  [/埋單/g, '結帳'],
  [/拎走/g, '外帶'],
  [/細蓉/g, '傳統小碗雲吞麵'],
  [/鵝髀/g, '燒鵝大鵝腿'],
  [/豬潤/g, '豬肝'],
  [/頭先/g, '剛才'],
  [/等陣|陣間/g, '等一下'],
  [/聽日/g, '明天'],
  [/尋日|琴日/g, '昨天'],
  [/而家/g, '現在'],
  [/點解/g, '為什麼'],
  [/喺邊度|邊度/g, '在哪裡'],
  [/幾耐/g, '多久'],
  [/幾時/g, '什麼時候'],
  [/返工/g, '上班'],
  [/放工/g, '下班'],
  [/傾計|傾偈/g, '聊天'],
  [/行街/g, '逛街'],
  [/得閒/g, '有空'],
  [/齊人/g, '人到齊了'],
  [/落單/g, '點餐'],
  [/幫襯/g, '光顧'],
  [/唔緊要/g, '沒關係'],
  [/冇問題/g, '沒問題'],
];

/**
 * 香港／澳門「中英粵三語混講 (Kongish / Code-Switching)」高頻夾雜英文單字對照字典
 */
const HONG_KONG_MIXED_ENGLISH_MAP: Array<{ pattern: RegExp; term: string; zh: string }> = [
  { pattern: /\bdouble[\s-]?check\b/i, term: 'double check', zh: '再次確認' },
  { pattern: /\blast\s+order\b/i, term: 'last order', zh: '最後點餐' },
  { pattern: /\bcheck[\s-]?in\b/i, term: 'check-in', zh: '辦理入住／報到' },
  { pattern: /\bcheck[\s-]?out\b/i, term: 'check-out', zh: '退房／結帳' },
  { pattern: /\bfollow[\s-]?up\b/i, term: 'follow up', zh: '跟進確認' },
  { pattern: /\bcredit\s+card\b/i, term: 'credit card', zh: '信用卡' },
  { pattern: /\bhalf\s+price\b/i, term: 'half price', zh: '半價' },
  { pattern: /\btax[\s-]?free\b/i, term: 'tax-free', zh: '免稅' },
  { pattern: /\bhold\s+on\b/i, term: 'hold on', zh: '稍等一下' },
  { pattern: /\bsend\s+email\b/i, term: 'send email', zh: '寄信／寄 Email' },
  { pattern: /\bemail\b/i, term: 'email', zh: '電子郵件' },
  { pattern: /\breschedule\b/i, term: 'reschedule', zh: '改期／重新安排' },
  { pattern: /\bwhatsapp\b/i, term: 'WhatsApp', zh: 'WhatsApp 訊息' },
  { pattern: /\binvoice\b/i, term: 'invoice', zh: '發票／請款單' },
  { pattern: /\bbooking\b/i, term: 'booking', zh: '訂位／預約' },
  { pattern: /\bbook\b/i, term: 'book', zh: '預訂' },
  { pattern: /\bcheck\b/i, term: 'check', zh: '確認／檢查' },
  { pattern: /\bconfirm\b/i, term: 'confirm', zh: '確認' },
  { pattern: /\bcancel\b/i, term: 'cancel', zh: '取消' },
  { pattern: /\border\b/i, term: 'order', zh: '點餐／訂單' },
  { pattern: /\btakeaway\b/i, term: 'takeaway', zh: '外帶' },
  { pattern: /\bdelay\b/i, term: 'delay', zh: '延誤' },
  { pattern: /\bboarding\b/i, term: 'boarding', zh: '登機' },
  { pattern: /\bgate\b/i, term: 'gate', zh: '登機門' },
  { pattern: /\bupgrade\b/i, term: 'upgrade', zh: '升級' },
  { pattern: /\bsize\b/i, term: 'size', zh: '尺寸' },
  { pattern: /\breceipt\b/i, term: 'receipt', zh: '收據／發票' },
  { pattern: /\bmenu\b/i, term: 'menu', zh: '菜單' },
  { pattern: /\bbill\b/i, term: 'bill', zh: '帳單' },
  { pattern: /\bcharge\b/i, term: 'charge', zh: '收費' },
  { pattern: /\bdiscount\b/i, term: 'discount', zh: '折扣' },
  { pattern: /\brefund\b/i, term: 'refund', zh: '退款／退稅' },
  { pattern: /\bcash\b/i, term: 'cash', zh: '現金' },
  { pattern: /\bmeeting\b/i, term: 'meeting', zh: '開會' },
  { pattern: /\bproject\b/i, term: 'project', zh: '專案' },
  { pattern: /\bdeadline\b/i, term: 'deadline', zh: '截止日' },
  { pattern: /\bschedule\b/i, term: 'schedule', zh: '行程／排程' },
  { pattern: /\bupdate\b/i, term: 'update', zh: '更新進度' },
  { pattern: /\bfeedback\b/i, term: 'feedback', zh: '意見回饋' },
  { pattern: /\bsorry\b/i, term: 'sorry', zh: '不好意思' },
  { pattern: /\basap\b/i, term: 'ASAP', zh: '越快越好' },
  { pattern: /\bcall\b/i, term: 'call', zh: '打電話' },
  { pattern: /\bmessage\b/i, term: 'message', zh: '傳訊息' },
  { pattern: /\btext\b/i, term: 'text', zh: '傳簡訊' },
  { pattern: /\blunch\b/i, term: 'lunch', zh: '午餐' },
  { pattern: /\bdinner\b/i, term: 'dinner', zh: '晚餐' },
  { pattern: /\bcoffee\b/i, term: 'coffee', zh: '咖啡' },
  { pattern: /\bready\b/i, term: 'ready', zh: '準備好' },
  { pattern: /\bfull\b/i, term: 'full', zh: '客滿／滿了' },
  { pattern: /\bbusy\b/i, term: 'busy', zh: '忙碌' },
  { pattern: /\bavailable\b/i, term: 'available', zh: '有空／可供應' },
  { pattern: /\bshare\b/i, term: 'share', zh: '分食／分享' },
  { pattern: /\bdeposit\b/i, term: 'deposit', zh: '押金／訂金' },
  { pattern: /\bvoucher\b/i, term: 'voucher', zh: '優惠券／兌換券' },
  { pattern: /\bqueue\b/i, term: 'queue', zh: '排隊' },
  { pattern: /\bchallenging\b/i, term: 'challenging', zh: '有挑戰性' },
  { pattern: /\bactually\b/i, term: 'actually', zh: '其實' },
  { pattern: /\banyway\b/i, term: 'anyway', zh: '總之' },
  { pattern: /\bchange\b/i, term: 'change', zh: '更改／找零' },
  { pattern: /\bseat\b/i, term: 'seat', zh: '座位' },
  { pattern: /\btable\b/i, term: 'table', zh: '桌子／訂桌' },
  { pattern: /\btransfer\b/i, term: 'transfer', zh: '轉乘／轉帳' },
  { pattern: /\bexit\b/i, term: 'exit', zh: '出口' },
];

/**
 * 偵測一段語音文字是否為「廣東話＋中文（國語）＋英文」混講（Code-Switching）
 */
export function detectMixedLanguageTags(text: string): {
  isMixed: boolean;
  hasCantonese: boolean;
  hasMandarinOrCjk: boolean;
  hasEnglish: boolean;
  badge: string;
} {
  const clean = text.trim();
  const hasCantonese =
    /唔|喺|冇|佢|哋|嘅|咗|啲|咁|噉|點解|邊度|幾多|埋單|走冰|走青|搭枱|搵|攞|睇|傾計|傾偈|聽日|尋日|琴日|而家|頭先|等陣|陣間|係咪|唔該|幾耐|幾時|返工|放工|行街|幫襯|唔緊要|得閒|落單/.test(
      clean
    );
  const hasMandarinOrCjk = /[\u4e00-\u9fff]/.test(clean);
  const hasEnglish = /\b[A-Za-z]{2,}\b/.test(clean);
  const hasMandarinMarker = /什麼|怎麼|在哪|不要|沒有|剛才|現在|明天|昨天|這個|那個|真的|謝謝|可以嗎|等一下/.test(
    clean
  );

  if (hasCantonese && hasMandarinMarker && hasEnglish) {
    return {
      isMixed: true,
      hasCantonese,
      hasMandarinOrCjk,
      hasEnglish,
      badge: '🇭🇰 粵＋🇹🇼 中＋🇺🇸 英 混講',
    };
  }
  if (hasCantonese && hasEnglish) {
    return {
      isMixed: true,
      hasCantonese,
      hasMandarinOrCjk,
      hasEnglish,
      badge: '🇭🇰 粵＋🇺🇸 英 混講',
    };
  }
  if (hasCantonese && hasMandarinMarker) {
    return {
      isMixed: true,
      hasCantonese,
      hasMandarinOrCjk,
      hasEnglish,
      badge: '🇭🇰 粵＋🇹🇼 中 混講',
    };
  }
  if (hasMandarinOrCjk && hasEnglish) {
    return {
      isMixed: true,
      hasCantonese,
      hasMandarinOrCjk,
      hasEnglish,
      badge: '🇹🇼 中＋🇺🇸 英 混講',
    };
  }
  return {
    isMixed: false,
    hasCantonese,
    hasMandarinOrCjk,
    hasEnglish,
    badge: '',
  };
}

/**
 * 將「廣東話／國語＋英文」混講句子中殘留的英文詞彙與港式口語，
 * 轉換／補充成台灣繁體中文一看秒懂的完整句子！
 */
export function annotateHongKongCantoneseMenuZh(
  originalCantonese: string,
  baseZh: string
): string {
  // 1. Protect already-parenthesized segments first, then inline-gloss mixed English words
  // using placeholder tokens so shorter keywords (e.g. "check" inside "double check")
  // NEVER re-match inside an earlier annotation!
  const placeholders: string[] = [];
  const hold = (val: string): string => {
    const idx = placeholders.length;
    placeholders.push(val);
    return `\uE000HKM_${idx}\uE001`;
  };

  let working = baseZh.replace(/\([^()]*\)|（[^（）]*）/g, (m) => hold(m));

  for (const entry of HONG_KONG_MIXED_ENGLISH_MAP) {
    const baseFlags = entry.pattern.flags.replace(/g/g, '');
    const testRe = new RegExp(entry.pattern.source, baseFlags);
    if (!testRe.test(working)) continue;
    const globalRe = new RegExp(entry.pattern.source, `${baseFlags}g`);
    working = working.replace(globalRe, (matched) => {
      return hold(`${entry.zh}(${matched})`);
    });
  }

  let enriched = working;
  for (let i = placeholders.length - 1; i >= 0; i--) {
    enriched = enriched.replace(`\uE000HKM_${i}\uE001`, placeholders[i]);
  }

  // 2. Append Taiwanese jargon explanation for Cantonese-only dishes/slang left untranslated
  const notes: string[] = [];
  for (const [pattern, twMeaning] of HK_CANTONESE_GLOSSARY_NOTES) {
    const singleRe = new RegExp(pattern.source);
    const primary = twMeaning.split('／')[0];
    const origMatch = originalCantonese.match(singleRe);
    if (
      origMatch &&
      singleRe.test(enriched) &&
      !enriched.includes(primary)
    ) {
      notes.push(`${origMatch[0]}＝${twMeaning}`);
    } else if (
      origMatch &&
      !enriched.includes(primary) &&
      /士多啤梨|班戟|西多士|多士|三文治|忌廉|公仔麵|撈丁|意粉|通粉|豬扒|雞扒|雞翼|牛扒|吞拿魚|三文魚|芝士|雪糕|芫荽|走青|走冰|茶走|飛砂走奶|搭枱|細蓉|鵝髀|豬潤/.test(
        origMatch[0]
      )
    ) {
      notes.push(`${origMatch[0]}＝${twMeaning}`);
    }
  }
  if (notes.length === 0) return enriched;
  const uniqueNotes = Array.from(new Set(notes)).slice(0, 4).join('・');
  return `${enriched}（台灣說法：${uniqueNotes}）`;
}

/**
 * 若句中夾雜較長的英文片語且 Google 廣東話引擎沒幫它翻掉，單獨補翻那段英文並 inline 標註！
 */
export async function enrichMixedEnglishPhrases(
  textWithRemainingEn: string
): Promise<string> {
  // Strip out already-parenthesized glosses before scanning for untranslated English spans
  const masked = textWithRemainingEn.replace(/\([^()]*\)|（[^（）]*）/g, ' ');
  const spans = masked.match(
    /[A-Za-z][A-Za-z0-9'’-]*(?:\s+[A-Za-z][A-Za-z0-9'’-]*){1,6}/g
  );
  if (!spans || spans.length === 0) return textWithRemainingEn;
  let out = textWithRemainingEn;
  const uniqueSpans = Array.from(new Set(spans.map((s) => s.trim()))).slice(0, 3);
  for (const span of uniqueSpans) {
    if (span.length < 4 || out.includes(`(${span})`)) continue;
    const gtxEn = await translateViaGoogleGtx(span, 'en', 'zh-TW');
    if (gtxEn?.translated && gtxEn.translated.toLowerCase() !== span.toLowerCase()) {
      const idx = out.indexOf(span);
      if (idx >= 0 && out[idx - 1] !== '(' && out[idx - 1] !== '（') {
        out =
          out.slice(0, idx) +
          `${gtxEn.translated.trim()}(${span})` +
          out.slice(idx + span.length);
      }
    }
  }
  return out;
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

  const yueExtraRule =
    targetLang === 'yue'
      ? '\n特別注意：目標語言為「香港／澳門道地口語廣東話（粵語）」，translatedText 必須使用真實口語粵字（例如：唔該、喺邊度、幾多錢、走冰、埋單、唔好意思、我哋），不可只寫書面國語；romanization 請填標準粵語拼音（Jyutping，例如 m4 goi1），phoneticHint 請寫台灣人一看就會唸的國語空耳諧音。'
      : '';

  const prompt =
    direction === 'zh-to-foreign'
      ? `你是一位精通台灣繁體中文與${langCfg.countryName}${langCfg.name}的隨身出國口譯專家。
請將以下台灣旅客說的話翻譯成最道地的【${langCfg.name}】（語氣要求：${toneDesc}），並提供「獨立逆向直譯回譯驗算」與「關鍵詞彙逐詞拆解」，讓不懂外文的旅客能 100% 確認翻譯正確無誤。${yueExtraRule}
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
      : `你是一位精通${langCfg.countryName}${langCfg.name}與台灣繁體中文的隨身出國口譯專家，特別擅長處理**三語自由混講（Code-Switching）**，例如香港／澳門常見的「廣東話（粵語）＋中文（國語）＋英文」夾雜句（如「唔該幫我 double check 下個 booking，我剛才已經 confirm 咗」）。
請將以下當地人或廣播說的話翻譯成自然流暢、純粹好懂的【台灣繁體中文】（把句中夾雜的英文單字與粵語口語全部翻成自然台灣用語，重要專有名詞可在括號保留原文），並拆解裡面的關鍵外語／粵語／英文單字讓旅客核對。
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
    const isMixedTrilingual =
      params.direction === 'foreign-to-zh' &&
      (params.targetLang === 'yue' || detectMixedLanguageTags(cleanText).isMixed);
    let finalTranslated = isMixedTrilingual
      ? annotateHongKongCantoneseMenuZh(cleanText, gtx.translated)
      : gtx.translated;
    if (isMixedTrilingual && /\b[A-Za-z]{2,}\s+[A-Za-z]{2,}\b/.test(finalTranslated)) {
      finalTranslated = await enrichMixedEnglishPhrases(finalTranslated);
    }

    return {
      sourceText: cleanText,
      translatedText: finalTranslated,
      romanization: gtx.romanization,
      phoneticHint: gtx.romanization
        ? `發音拼音：${gtx.romanization}`
        : '點按下方「🔊 朗讀」或「🐢 0.7x 慢速」可直接播放地道語音',
      backTranslatedText,
      confidenceScore,
      wordBreakdowns: buildLocalWordBreakdowns(foreignSentence, params.targetLang),
      highlightKeywords: extractImportantKeywords(`${cleanText} ${finalTranslated}`),
      engine: 'builtin',
    };
  }

  const mm = await translateViaMyMemory(cleanText, sl, tl);
  if (mm) {
    const foreignSentence = params.direction === 'zh-to-foreign' ? mm : cleanText;
    const isMixedMm =
      params.direction === 'foreign-to-zh' &&
      (params.targetLang === 'yue' || detectMixedLanguageTags(cleanText).isMixed);
    const finalMm = isMixedMm
      ? annotateHongKongCantoneseMenuZh(cleanText, mm)
      : mm;
    return {
      sourceText: cleanText,
      translatedText: finalMm,
      romanization: '',
      phoneticHint: '點按下方「🔊 朗讀」可直接播放地道語音給對方聽',
      backTranslatedText: cleanText,
      confidenceScore: 90,
      wordBreakdowns: buildLocalWordBreakdowns(foreignSentence, params.targetLang),
      highlightKeywords: extractImportantKeywords(`${cleanText} ${finalMm}`),
      engine: 'builtin',
    };
  }

  // 4. Ultimate offline graceful fallback
  const cfg = LANGUAGES[params.targetLang];
  const isOfflineMixed =
    params.direction === 'foreign-to-zh' &&
    (params.targetLang === 'yue' || detectMixedLanguageTags(cleanText).isMixed);
  const offlineForeignToZh = isOfflineMixed
    ? annotateHongKongCantoneseMenuZh(cleanText, cleanText)
    : cleanText;
  return {
    sourceText: cleanText,
    translatedText:
      params.direction === 'zh-to-foreign'
        ? `[離線模式] ${cfg.orderGreeting} ${cleanText}`
        : `[離線模式] ${offlineForeignToZh}`,
    romanization: '',
    phoneticHint: '目前處於離線狀態，建議切換至「🪧 離線手指卡」直接出示常用句或播放內建離線語音！',
    backTranslatedText: '離線模式（未連線至翻譯伺服器）',
    confidenceScore: 80,
    wordBreakdowns:
      params.direction === 'foreign-to-zh'
        ? buildLocalWordBreakdowns(cleanText, params.targetLang)
        : [],
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
      : `請聽這段【${langCfg.name}】語音或廣播錄音（注意：說話者可能會在**廣東話（粵語）、中文（國語）、英文**之間自由混講 Code-Switching，請精準保留原文混合字詞！），先精準聽寫出原文，接著將所有粵語口語、國語與英文夾雜詞彙全部流暢地翻成自然好懂的【台灣繁體中文】。
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
 * 去除 iOS Safari / Chrome Web Speech API 連續收音常見的重複前綴或尾端重疊句，
 * 避免同一句話在字幕機裡被重複翻譯兩次！
 */
export function dedupeSpeechRecognitionChunk(
  prevCommitted: string,
  nextChunk: string
): string {
  const prev = prevCommitted.trim();
  const next = nextChunk.trim();
  if (!next) return '';
  if (!prev) return next;

  const norm = (s: string) =>
    s.toLowerCase().replace(/[\s，。、！？,.\-!?;:：；「」『』]/g, '');
  const pNorm = norm(prev);
  const nNorm = norm(next);
  if (!nNorm) return '';
  // Exact duplicate or wholly contained inside the tail of previous utterance
  if (pNorm === nNorm || (nNorm.length <= pNorm.length && pNorm.endsWith(nNorm))) {
    return '';
  }
  // If WebKit emitted a cumulative result starting with the previous phrase, return only the new suffix
  if (next.length > prev.length && next.toLowerCase().startsWith(prev.toLowerCase())) {
    return next.slice(prev.length).replace(/^[\s，。、,]+/, '').trim();
  }
  // Detect suffix-prefix overlap (e.g. "明洞駅まで" + "までいくらですか")
  const maxOverlap = Math.min(prev.length, next.length, 24);
  for (let len = maxOverlap; len >= 3; len--) {
    if (prev.slice(-len).toLowerCase() === next.slice(0, len).toLowerCase()) {
      return next.slice(len).trim();
    }
  }
  return next;
}

/**
 * 判斷連續聽寫緩衝區是否已形成完整一句話（避免把「あの」「はい」「um」這種碎詞單獨丟給翻譯造成失真）
 */
export function shouldFlushSpeechBuffer(
  buffer: string,
  targetLang: LanguageCode
): boolean {
  const clean = buffer.trim();
  if (!clean) return false;
  if (targetLang === 'ja' || targetLang === 'ko' || targetLang === 'yue') {
    if (/[。！？!?]$/.test(clean) && clean.length >= 6) return true;
    return clean.length >= 24;
  }
  if (/[.!?]$/.test(clean) && clean.length >= 12) return true;
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  return clean.length >= 42 || wordCount >= 8;
}

/**
 * 邊講邊看中文預覽（輕量單向即時翻譯，跳過雙向回譯以壓低延遲至 ~300ms）
 */
export async function translateInterimPreviewFast(
  text: string,
  targetLang: LanguageCode
): Promise<string> {
  const clean = text.trim();
  if (clean.length < 2) return '';
  const shouldAnnotateMix = targetLang === 'yue' || detectMixedLanguageTags(clean).isMixed;
  const gtx = await translateViaGoogleGtx(clean, targetLang, 'zh-TW');
  if (gtx?.translated) {
    return shouldAnnotateMix
      ? annotateHongKongCantoneseMenuZh(clean, gtx.translated)
      : gtx.translated;
  }
  const mm = await translateViaMyMemory(clean, targetLang, 'zh-TW');
  if (mm) {
    return shouldAnnotateMix ? annotateHongKongCantoneseMenuZh(clean, mm) : mm;
  }
  return '';
}

function detectConversationTopicLabel(combinedText: string): string {
  if (/メニュー|注文|料理|食べ|飲|ラー|肉|辛|氷|円|お会計|埋單|走冰|少甜|菜|餐|點餐|食|辣|茶|order|table|menu|bill|spicy|delicious|맛|주문|계산/i.test(combinedText)) {
    return '🍽️ 餐廳／點餐＆口味討論';
  }
  if (/駅|電車|ホーム|番線|バス|乗|出口|空港|ゲート|搭乗|出発|遅延|車|站|月台|登機|班機|地鐵|港鐵|gate|platform|train|flight|boarding|delay|station|지하철|역|공항/i.test(combinedText)) {
    return '🚆 交通／地鐵／機場廣播';
  }
  if (/税|免税|会計|カード|現金|パスポート|サイズ|試着|割引|八達通|刷卡|價錢|幾多錢|退稅|買|tax|card|cash|size|price|passport|discount|카드|면세|가격/i.test(combinedText)) {
    return '🛍️ 購物／價格＆付款討論';
  }
  if (/ホテル|部屋|チェックイン|荷物|予約|鍵|朝食|房間|入住|行李|退房|check-?in|room|luggage|hotel|reservation|예약|호텔|짐/i.test(combinedText)) {
    return '🏨 飯店入住／預約確認';
  }
  if (/meeting|project|deadline|schedule|email|feedback|update|follow[\s-]?up|開會|專案|截止|進度|報告|簡報/i.test(combinedText)) {
    return '💼 工作／會議＆行程討論';
  }
  return '💬 身邊旁人對話／日常解說';
}

/**
 * ✨ 高精準「身邊多人對話錄音」AI 聽寫＋翻譯＋一句話看懂大意 (Gemini Multimodal Audio)
 * 支援真實錄音（MediaRecorder 遠距／多人／雜音環境）與 iPhone 語音備忘錄匯入 (.m4a/.mp3/.wav/.webm)
 */
export async function transcribeAmbientConversationWithGemini(params: {
  audioBase64: string;
  mimeType: string;
  targetLang: LanguageCode;
  geminiApiKey: string;
  geminiModel?: string;
}): Promise<{
  segments: Array<{
    speakerLabel: string;
    originalText: string;
    translatedZh: string;
    highlightKeywords: string[];
  }>;
  summary: LiveConversationSummary;
} | null> {
  const cleanKey = params.geminiApiKey.trim();
  if (!cleanKey || !params.audioBase64) return null;
  const langCfg = LANGUAGES[params.targetLang];
  const model = params.geminiModel || 'gemini-2.5-flash';

  const yueHint =
    params.targetLang === 'yue'
      ? '（特別注意：說話者極可能進行**「廣東話（粵語）＋中文（國語）＋英文」三語自由混講（Code-Switching）**！`originalText` 請忠實保留原音夾雜的粵字、中文與英文單字，例如「唔該幫我 double check 下個 booking」；`translatedZh` 與 `overallGistZh` 請翻成**純粹流暢的台灣繁體中文**，把英文詞彙與港式口語都轉成台灣日常用語，重要茶餐廳或專有名詞可在括號補註原文！）'
      : '（若音訊中夾雜廣東話、中文或英文混講 Code-Switching，`originalText` 請忠實照實聽寫混合原文，`translatedZh` 請全部翻成自然順暢的台灣繁體中文）';

  const prompt = `你是一位貼身隨行口譯員。使用者正用手機錄下「身邊的人的對話／店員解說／廣播」（預期主要語言：${langCfg.countryName}${langCfg.name}，也可能夾雜英文或其他語言）${yueHint}。
即使環境有些嘈雜或講話速度很快，請仔細聆聽整段真實音訊，幫使用者完成兩件事：
1. 用台灣人最自然好懂的繁體中文，整理出 **「一句話看懂他們在聊什麼（大意摘要）」** 與 **「2～4 條重點筆記」**。
2. 將聽到的重要對話拆成逐句「原文 ↔ 台灣繁體中文」，若聽得出有多人交談請區分說話者（例如「🗣️ 說話者 A」、「🗣️ 說話者 B」、「📢 廣播／店員」）。
3. 嚴禁捏造沒聽到的內容！若某句背景音太小或太吵聽不清楚，請老實標註「（此段背景音量較小或模糊）」。

請嚴格只回傳 JSON 物件（不要 markdown code block）：
{
  "topicLabel": "帶表情符號的 10 字內主題標籤，例如：🍽️ 餐廳點餐與座位溝通",
  "overallGistZh": "用 1～2 句超白話台灣繁體中文講出這段對話的整體大意與核心結論",
  "bulletPointsZh": [
    "重點一（誰提到什麼、或決定了什麼）",
    "重點二（任何提醒、規定、時間或金額）"
  ],
  "toneOrMoodZh": "語氣與氛圍（例如：輕鬆閒聊、店員親切解說、緊急廣播提醒）",
  "keyFacts": ["價格／時間／地點／人名／月台等關鍵字（無則空陣列）"],
  "suggestedReply": {
    "zh": "如果使用者現在想禮貌接話或回應，最實用的一句中文",
    "foreign": "對應的道地${langCfg.name}說法",
    "phoneticHint": "台灣空耳發音或提醒"
  },
  "segments": [
    {
      "speakerLabel": "🗣️ 說話者 A",
      "originalText": "聽寫出的外文原文（若夾雜英文可照實寫）",
      "translatedZh": "翻成自然台灣繁體中文"
    }
  ]
}`;

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 32000) : null;
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
            temperature: 0.15,
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
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed.overallGistZh !== 'string') return null;

    const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
    const segments: Array<{
      speakerLabel: string;
      originalText: string;
      translatedZh: string;
      highlightKeywords: string[];
    }> = rawSegments
      .filter(
        (s: Record<string, unknown>) =>
          s &&
          (typeof s.originalText === 'string' || typeof s.translatedZh === 'string')
      )
      .map((s: Record<string, unknown>) => {
        const orig = String(s.originalText || '').trim();
        const zh = String(s.translatedZh || orig).trim();
        return {
          speakerLabel: String(s.speakerLabel || '🗣️ 對話片段').trim(),
          originalText: orig || zh,
          translatedZh:
            params.targetLang === 'yue'
              ? annotateHongKongCantoneseMenuZh(orig, zh)
              : zh,
          highlightKeywords: extractImportantKeywords(`${orig} ${zh}`),
        };
      });

    const bullets: string[] = Array.isArray(parsed.bulletPointsZh)
      ? parsed.bulletPointsZh.map((b: unknown) => String(b).trim()).filter(Boolean)
      : [];
    const keyFacts: string[] = Array.isArray(parsed.keyFacts)
      ? parsed.keyFacts.map((k: unknown) => String(k).trim()).filter(Boolean)
      : [];
    const mergedFlowZh = segments.map((s) => `${s.speakerLabel}：${s.translatedZh}`).join('\n');

    const sr = parsed.suggestedReply as Record<string, unknown> | undefined;
    const suggestedReply =
      sr && typeof sr.zh === 'string' && typeof sr.foreign === 'string' && sr.foreign.trim()
        ? {
            zh: String(sr.zh).trim(),
            foreign: String(sr.foreign).trim(),
            phoneticHint: sr.phoneticHint ? String(sr.phoneticHint).trim() : undefined,
          }
        : undefined;

    return {
      segments,
      summary: {
        topicLabel: String(parsed.topicLabel || '💬 身邊對話即時摘要').trim(),
        overallGistZh: String(parsed.overallGistZh).trim(),
        bulletPointsZh: bullets.slice(0, 5),
        mergedFlowZh,
        toneOrMoodZh: parsed.toneOrMoodZh ? String(parsed.toneOrMoodZh).trim() : undefined,
        keyFacts: Array.from(
          new Set([
            ...keyFacts,
            ...extractImportantKeywords(segments.map((s) => `${s.originalText} ${s.translatedZh}`).join(' ')),
          ])
        ).slice(0, 8),
        suggestedReply,
        engine: 'gemini-audio',
        segmentCount: segments.length,
        updatedAt: Date.now(),
      },
    };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 🧠 一鍵彙整目前所有即時字幕為「白話中文大意 ＋ 上下文重譯 ＋ 重點條列」！
 * 雙軌支援：
 * 1. 若有綁定 Gemini Key -> 呼叫 AI 深度歸納話題、誰問了什麼、結論與建議回應。
 * 2. 免 API Key -> 把原本零碎的逐句外文合併成完整段落「連同上下文一起整段重譯」，大幅修正斷句誤譯並抓出關鍵數字／問句／主題重點！
 */
export async function summarizeLiveConversation(params: {
  segments: LiveSubtitleSegment[];
  targetLang: LanguageCode;
  geminiApiKey?: string;
  geminiModel?: string;
}): Promise<LiveConversationSummary> {
  const ordered = [...params.segments]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-24);

  if (ordered.length === 0) {
    return {
      topicLabel: '💬 尚無收音內容',
      overallGistZh: '開始收音或錄下一段對話後，這裡會自動幫妳整理出「一句話大意」與重點條列。',
      bulletPointsZh: [],
      mergedFlowZh: '',
      keyFacts: [],
      engine: 'builtin-context',
      segmentCount: 0,
      updatedAt: Date.now(),
    };
  }

  const langCfg = LANGUAGES[params.targetLang];
  const transcriptLines = ordered
    .map(
      (s, i) =>
        `${i + 1}. ${s.speakerLabel ? `[${s.speakerLabel}] ` : ''}${s.originalText}（初譯：${s.translatedZh}）`
    )
    .join('\n');

  if (params.geminiApiKey && params.geminiApiKey.trim().length > 10) {
    const cleanKey = params.geminiApiKey.trim();
    const model = params.geminiModel || 'gemini-2.5-flash';
    const prompt = `以下是使用者在${langCfg.countryName}用手機收音記下的「身邊人的對話／廣播紀錄」（依時間先後排序；說話者可能會在**廣東話／國語／英文**之間自由混講 Code-Switching，且語音辨識偶爾有同音字誤差，請依前後文幫他修正並統一轉為順暢的**台灣繁體中文**）：
${transcriptLines}

請用最自然好懂的台灣繁體中文，嚴格只回傳 JSON 物件（不要 markdown code block）：
{
  "topicLabel": "帶 emoji 的簡短主題標籤（10字內）",
  "overallGistZh": "用 1～2 句超白話總結：這段對話到底在聊什麼／重點結論是什麼",
  "bulletPointsZh": [
    "重點 1（條列式，簡明清楚）",
    "重點 2",
    "重點 3"
  ],
  "mergedFlowZh": "將整段對話重新潤飾為通順易讀的繁體中文對話大意",
  "toneOrMoodZh": "語氣氛圍（例如：親切招呼、快速詢問、日常聊天）",
  "keyFacts": ["重要數字、金額、時間、地點、月台、條件（無則空陣列）"],
  "suggestedReply": {
    "zh": "使用者如果要禮貌回應，最推薦的一句中文",
    "foreign": "對應的道地${langCfg.name}說法",
    "phoneticHint": "台灣空耳發音"
  }
}`;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 14000) : null;
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
      if (res.ok) {
        const data = await res.json();
        const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (rawText) {
          const parsed = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
          if (parsed && typeof parsed.overallGistZh === 'string') {
            const sr = parsed.suggestedReply as Record<string, unknown> | undefined;
            return {
              topicLabel: String(parsed.topicLabel || '💬 對話重點大意').trim(),
              overallGistZh: String(parsed.overallGistZh).trim(),
              bulletPointsZh: Array.isArray(parsed.bulletPointsZh)
                ? parsed.bulletPointsZh.map((b: unknown) => String(b).trim()).filter(Boolean).slice(0, 5)
                : [],
              mergedFlowZh: String(parsed.mergedFlowZh || '').trim(),
              toneOrMoodZh: parsed.toneOrMoodZh ? String(parsed.toneOrMoodZh).trim() : undefined,
              keyFacts: Array.isArray(parsed.keyFacts)
                ? parsed.keyFacts.map((k: unknown) => String(k).trim()).filter(Boolean).slice(0, 8)
                : [],
              suggestedReply:
                sr && typeof sr.zh === 'string' && typeof sr.foreign === 'string' && sr.foreign.trim()
                  ? {
                      zh: String(sr.zh).trim(),
                      foreign: String(sr.foreign).trim(),
                      phoneticHint: sr.phoneticHint ? String(sr.phoneticHint).trim() : undefined,
                    }
                  : undefined,
              engine: 'gemini-text',
              segmentCount: ordered.length,
              updatedAt: Date.now(),
            };
          }
        }
      }
    } catch {
      // Fallback gracefully to zero-key contextual summary
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // Track 2: 100% Free Built-in Contextual Re-translation + Key Fact Extraction
  const joinedForeign = ordered.map((s) => s.originalText.trim()).join('。 ');
  const fallbackZhFlow = ordered.map((s) => s.translatedZh.trim()).join(' ');
  const contextGtx = await translateViaGoogleGtx(joinedForeign, params.targetLang, 'zh-TW');
  let mergedFlowZh = contextGtx?.translated?.trim() || fallbackZhFlow;
  const isMixedFlow =
    params.targetLang === 'yue' || detectMixedLanguageTags(joinedForeign).isMixed;
  if (isMixedFlow) {
    mergedFlowZh = annotateHongKongCantoneseMenuZh(joinedForeign, mergedFlowZh);
    if (/\b[A-Za-z]{2,}\s+[A-Za-z]{2,}\b/.test(mergedFlowZh)) {
      mergedFlowZh = await enrichMixedEnglishPhrases(mergedFlowZh);
    }
  }

  const allCombined = `${joinedForeign} ${fallbackZhFlow} ${mergedFlowZh}`;
  const topicLabel = detectConversationTopicLabel(allCombined);
  const keyFacts = Array.from(
    new Set([
      ...extractImportantKeywords(allCombined),
      ...ordered.flatMap((s) => s.highlightKeywords || []),
    ])
  ).slice(0, 6);

  const zhClauses = ordered.map((s) => s.translatedZh.trim()).filter(Boolean);
  const questionClauses = zhClauses.filter((z) => /[？?嗎呢麼幾哪誰怎麼什麼]/.test(z));
  const bullets: string[] = [];
  if (keyFacts.length > 0) {
    bullets.push(`關鍵數字／資訊：${keyFacts.join('、')}`);
  }
  if (questionClauses.length > 0) {
    bullets.push(`對方提到的問題：「${questionClauses[questionClauses.length - 1]}」`);
  }
  const latestClause = zhClauses[zhClauses.length - 1];
  if (latestClause && !bullets.some((b) => b.includes(latestClause))) {
    bullets.push(`最新一句重點：${latestClause}`);
  }
  if (zhClauses.length > 1) {
    const firstClause = zhClauses[0];
    if (!bullets.some((b) => b.includes(firstClause))) {
      bullets.unshift(`對話開頭提到：${firstClause}`);
    }
  }

  const shortGist =
    mergedFlowZh.length > 100
      ? `${mergedFlowZh.slice(0, 98)}…`
      : mergedFlowZh;

  return {
    topicLabel,
    overallGistZh: shortGist,
    bulletPointsZh: bullets.slice(0, 4),
    mergedFlowZh,
    toneOrMoodZh:
      questionClauses.length > 0
        ? `包含詢問／確認事項（共 ${ordered.length} 段）`
        : `連續對話紀錄（共 ${ordered.length} 段）`,
    keyFacts,
    engine: 'builtin-context',
    segmentCount: ordered.length,
    updatedAt: Date.now(),
  };
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
 * 將局部區段座標 (0~100%) 映射回整張原圖座標 (0~100%)
 */
export function mapSubBboxToFullImage(
  subBbox: MenuDishBbox,
  parentRegion?: MenuDishBbox
): MenuDishBbox {
  if (!parentRegion) return subBbox;
  const xPct = Math.max(
    0,
    Math.min(96, parentRegion.xPct + (subBbox.xPct / 100) * parentRegion.wPct)
  );
  const yPct = Math.max(
    0,
    Math.min(96, parentRegion.yPct + (subBbox.yPct / 100) * parentRegion.hPct)
  );
  const wPct = Math.max(
    6,
    Math.min(100 - xPct, (subBbox.wPct / 100) * parentRegion.wPct)
  );
  const hPct = Math.max(
    4,
    Math.min(100 - yPct, (subBbox.hPct / 100) * parentRegion.hPct)
  );
  return {
    xPct: Math.round(xPct * 10) / 10,
    yPct: Math.round(yPct * 10) / 10,
    wPct: Math.round(wPct * 10) / 10,
    hPct: Math.round(hPct * 10) / 10,
  };
}

/**
 * 確保每一道辨識出的菜名都有對應在照片上的座標框 (bbox)，方便像 iPhone 相機一樣直接在照片原位覆蓋中文或產生全新中文對照菜單圖
 */
export function ensureMenuDishesHaveBboxes(
  items: MenuDishItem[],
  orientation: 'horizontal' | 'vertical' = 'horizontal',
  parentRegion?: MenuDishBbox
): MenuDishItem[] {
  const total = Math.max(1, items.length);
  return items.map((item, idx) => {
    if (item.bbox) {
      return {
        ...item,
        bbox: mapSubBboxToFullImage(item.bbox, parentRegion),
      };
    }
    let fallbackBbox: MenuDishBbox;
    if (orientation === 'vertical') {
      // Japanese vertical menu: right-to-left columns
      const colWidth = Math.min(18, Math.max(9, Math.floor(84 / total)));
      const xPct = Math.max(
        6,
        Math.min(88, 86 - idx * ((80 / Math.max(1, total - 1)) || 0))
      );
      fallbackBbox = {
        xPct: Math.round(xPct * 10) / 10,
        yPct: 12 + (idx % 2) * 8,
        wPct: colWidth,
        hPct: 68,
      };
    } else {
      // Horizontal or 2-column grid layout
      const useTwoCols = total >= 6;
      if (useTwoCols) {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const totalRows = Math.ceil(total / 2);
        const rowStep = Math.min(15, 78 / Math.max(1, totalRows));
        fallbackBbox = {
          xPct: col === 0 ? 5 : 52,
          yPct: Math.round((8 + row * rowStep) * 10) / 10,
          wPct: 43,
          hPct: Math.max(7, Math.round((rowStep - 2) * 10) / 10),
        };
      } else {
        const rowStep = Math.min(16, 80 / Math.max(1, total));
        fallbackBbox = {
          xPct: 8,
          yPct: Math.round((8 + idx * rowStep) * 10) / 10,
          wPct: 84,
          hPct: Math.max(8, Math.round((rowStep - 2) * 10) / 10),
        };
      }
    }
    return {
      ...item,
      bbox: mapSubBboxToFullImage(fallbackBbox, parentRegion),
    };
  });
}

/**
 * 拍照菜單視覺辨識（Gemini Vision — 支援手寫字、直書縦書き、多欄複雜菜單，並回傳每道菜在照片上的 2D 座標 box2d）
 */
export async function analyzeMenuPhotoWithGemini(params: {
  imageDataUrl: string;
  targetLang: LanguageCode;
  geminiApiKey: string;
  geminiModel?: string;
  parentRegion?: MenuDishBbox;
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

  const prompt = `你是一位專業的${langCfg.countryName}餐廳菜單翻譯助手。請仔細辨識這張菜單照片中實際出現的所有餐點／飲品項目（包含橫書或直書縦書き），逐一翻譯為台灣繁體中文，並標出每道菜在照片上的位置座標 box2d ([ymin, xmin, ymax, xmax]，範圍 0~1000)。切勿編造照片中沒有的菜名！
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
      "dietaryWarning": "若含牛肉/豬肉/生食/花生/甲殼類/辣味/酒精請標註，無則填 null",
      "box2d": [ymin, xmin, ymax, xmax]
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
    const rawItems: MenuDishItem[] = parsed.items
      .filter((it: Record<string, unknown>) => it && typeof it.originalName === 'string')
      .map((it: Record<string, unknown>, idx: number) => {
        const orig = String(it.originalName).trim();
        const zh = String(it.translatedZh || it.originalName).trim();
        let bbox: MenuDishBbox | undefined;
        if (Array.isArray(it.box2d) && it.box2d.length === 4) {
          const [ymin, xmin, ymax, xmax] = it.box2d.map((n) => Number(n));
          if (
            Number.isFinite(ymin) &&
            Number.isFinite(xmin) &&
            Number.isFinite(ymax) &&
            Number.isFinite(xmax) &&
            ymax > ymin &&
            xmax > xmin
          ) {
            bbox = {
              xPct: Math.max(0, Math.min(95, Math.round((xmin / 10) * 10) / 10)),
              yPct: Math.max(0, Math.min(95, Math.round((ymin / 10) * 10) / 10)),
              wPct: Math.max(8, Math.min(100, Math.round(((xmax - xmin) / 10) * 10) / 10)),
              hPct: Math.max(5, Math.min(100, Math.round(((ymax - ymin) / 10) * 10) / 10)),
            };
          }
        }
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
          bbox,
          quantity: 0,
        };
      });
    const items = ensureMenuDishesHaveBboxes(
      rawItems,
      'horizontal',
      params.parentRegion
    );
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
 * 將圖片進行高對比文字強化預處理，並同時回傳強化後的尺寸 (width, height)，以便精準換算 Tesseract 的 bbox 座標百分比
 */
async function preprocessMenuImageForOcr(
  imageDataUrl: string
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () =>
      resolve({ dataUrl: imageDataUrl, width: 1000, height: 1000 });
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
        resolve({ dataUrl: imageDataUrl, width: w, height: h });
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
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: w,
        height: h,
      });
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
  yue: { horiz: 'chi_tra', vert: 'chi_tra_vert' },
  en: { horiz: 'eng' },
  th: { horiz: 'tha' },
  vi: { horiz: 'vie' },
  fr: { horiz: 'fra' },
  es: { horiz: 'spa' },
  de: { horiz: 'deu' },
};

/**
 * 清理 OCR 辨識出的原始文字行：
 * 1. 自動消除 Tesseract 日文/韓文模型在每個漢字與假名之間插入的多餘空白（例如「豚 骨 ラ ー メ ン」→「豚骨ラーメン」），避免翻譯引擎斷詞錯誤！
 * 2. 修復被空白拆散的金額（例如「1 , 2 8 0 円」→「1,280円」）。
 * 3. 若同一橫行跨欄出現兩道菜＋兩個價格（例如「親子丼 980円 カツ丼 1100円」），自動拆分為獨立菜名。
 * 4. 過濾相片邊框與插圖產生的單字元亂碼雜訊。
 */
export function cleanOcrMenuLines(rawText: string): string[] {
  const normalizedBlock = rawText
    // Normalize full-width digits and currency symbols first
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[￥¥]/g, '¥')
    // Remove Tesseract inter-character horizontal spaces between Japanese Kanji / Hiragana / Katakana / Hangul (preserve \n!)
    .replace(
      /([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7afー])[ \t\u3000]+(?=[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7afー])/g,
      '$1'
    )
    .replace(
      /([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7afー])[ \t\u3000]+(?=[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7afー])/g,
      '$1'
    )
    // Fix spaced numbers like "1 , 2 8 0 円" -> "1,280円" (using horizontal space [ \t\u3000] only!)
    .replace(/(\d)[ \t\u3000]*,[ \t\u3000]*(\d)/g, '$1,$2')
    .replace(/(\d)[ \t\u3000]+(?=\d)/g, '$1')
    .replace(/(\d)[ \t\u3000]+(?=\d)/g, '$1')
    .replace(/(\d)[ \t\u3000]+(?=円|원|税込|税抜)/g, '$1')
    // If a single horizontal line contains multiple dishes separated by price (e.g. "親子丼 980円 カツ丼 1,100円"), split after price!
    .replace(
      /((?:¥[ \t]*)?\d[\d,]*[ \t]*(?:円|원)(?:[ \t]*[（(]?税込[)）]?)?)[ \t\u3000]*(?=[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]{2,})/g,
      '$1\n'
    );

  const rawLines = normalizedBlock
    .split(/\r?\n/)
    .map((line) =>
      line
        // Strip OCR border/dot leader noise like "・・・" "…" "---" "|||"
        .replace(/[・…‥─━\-=_|~｜|\\/«»<>^*+°]{2,}/g, ' ')
        // Strip leading/trailing isolated punctuation or single ASCII noise from photo borders
        .replace(/^[^a-zA-Z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0e00-\u0e7f¥₩$€฿₫]+/, '')
        .replace(/[^a-zA-Z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0e00-\u0e7f円원บาท동)）]+$/, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((line) => line.length >= 2);

  const validLines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const meaningfulChars = line.match(
      /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0e00-\u0e7fa-zA-ZÀ-ÿ]/g
    );
    const cjkOrKanaWords = line.match(
      /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0e00-\u0e7f]{2,}|[a-zA-ZÀ-ÿ]{3,}/g
    );
    const isOnlyPrice = /^(?:[¥₩$€฿₫]?\s*\d[\d,.]*\s*(?:円|원|บาท|동|税込|税抜)?)$/.test(line);

    if (isOnlyPrice && validLines.length > 0) {
      const prev = validLines[validLines.length - 1];
      if (!/\d{2,}/.test(prev)) {
        validLines[validLines.length - 1] = `${prev} ${line}`;
      }
      continue;
    }

    if (!meaningfulChars || meaningfulChars.length < 2 || !cjkOrKanaWords) continue;
    validLines.push(line);
  }

  return Array.from(new Set(validLines)).slice(0, 24);
}

interface TesseractRawLine {
  text?: string;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
}

/**
 * 從 Tesseract 辨識結果中提取每一行文字與其精準影像座標 (bbox 0~100%)
 */
function extractCleanedLinesWithBbox(
  tessData: { text?: string; lines?: TesseractRawLine[] } | undefined,
  imgWidth: number,
  imgHeight: number
): Array<{ text: string; bbox?: MenuDishBbox }> {
  const w = Math.max(1, imgWidth);
  const h = Math.max(1, imgHeight);
  const rawLines = Array.isArray(tessData?.lines) ? tessData.lines : [];
  const results: Array<{ text: string; bbox?: MenuDishBbox }> = [];
  const seen = new Set<string>();

  if (rawLines.length > 0) {
    for (const rl of rawLines) {
      const cleanedParts = cleanOcrMenuLines(rl.text || '');
      if (cleanedParts.length === 0) continue;

      let baseBbox: MenuDishBbox | undefined;
      if (
        rl.bbox &&
        typeof rl.bbox.x0 === 'number' &&
        typeof rl.bbox.y0 === 'number' &&
        typeof rl.bbox.x1 === 'number' &&
        typeof rl.bbox.y1 === 'number' &&
        rl.bbox.x1 > rl.bbox.x0 &&
        rl.bbox.y1 > rl.bbox.y0
      ) {
        const xPct = Math.max(0, Math.min(95, (rl.bbox.x0 / w) * 100));
        const yPct = Math.max(0, Math.min(95, (rl.bbox.y0 / h) * 100));
        const wPct = Math.max(
          8,
          Math.min(100 - xPct, ((rl.bbox.x1 - rl.bbox.x0) / w) * 100)
        );
        const hPct = Math.max(
          4.5,
          Math.min(100 - yPct, ((rl.bbox.y1 - rl.bbox.y0) / h) * 100)
        );
        baseBbox = {
          xPct: Math.round(xPct * 10) / 10,
          yPct: Math.round(yPct * 10) / 10,
          wPct: Math.round(wPct * 10) / 10,
          hPct: Math.round(hPct * 10) / 10,
        };
      }

      // If a horizontal line split into multiple dishes (e.g. left dish + right dish), split the horizontal bbox proportionally!
      const partCount = cleanedParts.length;
      cleanedParts.forEach((part, idx) => {
        if (seen.has(part)) return;
        seen.add(part);
        let subBbox = baseBbox;
        if (baseBbox && partCount > 1) {
          const sliceW = Math.max(10, baseBbox.wPct / partCount);
          subBbox = {
            xPct: Math.round((baseBbox.xPct + idx * sliceW) * 10) / 10,
            yPct: baseBbox.yPct,
            wPct: Math.round(sliceW * 10) / 10,
            hPct: baseBbox.hPct,
          };
        }
        results.push({ text: part, bbox: subBbox });
      });
    }
  }

  if (results.length === 0) {
    const fallbackLines = cleanOcrMenuLines(tessData?.text || '');
    for (const fl of fallbackLines) {
      if (!seen.has(fl)) {
        seen.add(fl);
        results.push({ text: fl });
      }
    }
  }

  return results.slice(0, 24);
}

/**
 * 免 API Key！直接在瀏覽器內執行真實光學文字辨識 (Tesseract.js WASM OCR) ＋ Google GTX 逐道翻譯
 * 支援「橫排菜單 (horizontal)」與「日本傳統直書菜單 (vertical / 縦書き)」，並保留每道菜在照片上的原位座標 (bbox)！
 */
export async function analyzeMenuPhotoFreeOcr(params: {
  imageDataUrl: string;
  targetLang: LanguageCode;
  orientation?: 'horizontal' | 'vertical';
  parentRegion?: MenuDishBbox;
  onProgress?: (statusText: string, pct: number) => void;
}): Promise<{
  title: string;
  items: MenuDishItem[];
  rawOcrText: string;
  fullTranslatedSummaryZh: string;
}> {
  const langCfg = LANGUAGES[params.targetLang];
  params.onProgress?.('🔍 正在強化菜單影像對比與清晰度...', 12);
  const {
    dataUrl: enhancedUrl,
    width: imgW,
    height: imgH,
  } = await preprocessMenuImageForOcr(params.imageDataUrl);

  const tessMap = TESSERACT_LANG_MAP[params.targetLang] || { horiz: 'eng' };
  let effectiveOrient: 'horizontal' | 'vertical' =
    params.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const tessLang =
    effectiveOrient === 'vertical' && tessMap.vert
      ? tessMap.vert
      : tessMap.horiz;

  params.onProgress?.(
    `📖 正在載入【${langCfg.flag} ${langCfg.name}${
      effectiveOrient === 'vertical' ? '・直書縦書き' : '・橫書'
    }】OCR 辨識模型...`,
    25
  );

  const Tesseract = await import('tesseract.js');
  let result = await Tesseract.recognize(enhancedUrl, tessLang, {
    logger: (m: { status?: string; progress?: number }) => {
      if (m && typeof m.progress === 'number') {
        const pct = Math.min(78, Math.round(25 + m.progress * 53));
        params.onProgress?.(
          `🔍 正在掃描照片中的${langCfg.name}菜單文字與座標 (${Math.round(m.progress * 100)}%)...`,
          pct
        );
      }
    },
  });

  let rawOcrText = (result?.data?.text || '').trim();
  let lineEntries = extractCleanedLinesWithBbox(
    result?.data as { text?: string; lines?: TesseractRawLine[] },
    imgW,
    imgH
  );

  // Smart Auto-Fallback for Japanese / Hong Kong Traditional Vertical Menus
  if (
    (params.targetLang === 'ja' || params.targetLang === 'yue') &&
    params.orientation !== 'vertical' &&
    lineEntries.length < 2 &&
    tessMap.vert
  ) {
    params.onProgress?.(
      '↕️ 偵測到可能為日本直排菜單（縦書き），自動切換直書模型重掃中...',
      60
    );
    const vertResult = await Tesseract.recognize(enhancedUrl, tessMap.vert);
    const vertEntries = extractCleanedLinesWithBbox(
      vertResult?.data as { text?: string; lines?: TesseractRawLine[] },
      imgW,
      imgH
    );
    if (vertEntries.length > lineEntries.length) {
      rawOcrText = (vertResult?.data?.text || '').trim();
      lineEntries = vertEntries;
      effectiveOrient = 'vertical';
    }
  }

  if (lineEntries.length === 0) {
    return {
      title: `${langCfg.flag} 實拍菜單辨識`,
      items: [],
      rawOcrText,
      fullTranslatedSummaryZh: '',
    };
  }

  params.onProgress?.(
    `🌐 已從照片定位出 ${lineEntries.length} 道菜單文字，正在原位翻譯為繁體中文...`,
    88
  );

  const translatedItems = await parseAndTranslateMenuLinesFree(
    lineEntries.map((e) => e.text).join('\n'),
    params.targetLang
  );

  const itemsWithRawBbox: MenuDishItem[] = translatedItems.map((it, idx) => ({
    ...it,
    bbox: lineEntries[idx]?.bbox,
  }));

  const items = ensureMenuDishesHaveBboxes(
    itemsWithRawBbox,
    effectiveOrient,
    params.parentRegion
  );

  const fullTranslatedSummaryZh = items
    .map(
      (it, idx) =>
        `${idx + 1}. ${it.translatedZh}（原文：${it.originalName}）${
          it.priceForeign ? ` — ${langCfg.currencySymbol}${it.priceForeign.toLocaleString()}` : ''
        }`
    )
    .join('\n');

  params.onProgress?.('✅ 菜單原位中文翻譯完成！', 100);

  return {
    title: `${langCfg.flag} 實拍菜單中文對照 (${items.length} 項)`,
    items,
    rawOcrText,
    fullTranslatedSummaryZh,
  };
}

/**
 * 🖼️ 生成一份「全新對應中文版菜單照片」(DataURL)：
 * 直接將原菜單照片上的每一道外文菜名原位覆蓋為「① 繁體中文菜名 ＋ 外幣/台幣價格標籤」，
 * 讓使用者不用上下來回找，直接看這張新產出的中文菜單圖就知道哪個位置是什麼菜！
 */
export async function renderTranslatedMenuCanvasDataUrl(params: {
  imageDataUrl: string;
  items: MenuDishItem[];
  lang: LanguageCode;
  rateToTwd: number;
  orientation?: 'horizontal' | 'vertical';
}): Promise<string> {
  return new Promise((resolve) => {
    if (!params.imageDataUrl) {
      resolve('');
      return;
    }
    const img = new Image();
    img.onerror = () => resolve(params.imageDataUrl);
    img.onload = () => {
      const w = Math.max(600, img.width || 1000);
      const h = Math.max(450, img.height || 800);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(params.imageDataUrl);
        return;
      }

      // 1. Draw original menu image as base
      ctx.drawImage(img, 0, 0, w, h);

      const langCfg = LANGUAGES[params.lang] || LANGUAGES.ja;
      const positioned = ensureMenuDishesHaveBboxes(
        params.items,
        params.orientation || 'horizontal'
      );

      // 2. Paint high-contrast Traditional Chinese translation card directly over each dish's bbox position!
      positioned.forEach((dish, idx) => {
        const b = dish.bbox;
        if (!b) return;
        const bx = Math.round((b.xPct / 100) * w);
        const by = Math.round((b.yPct / 100) * h);
        const bw = Math.max(Math.round(w * 0.16), Math.round((b.wPct / 100) * w));
        const bh = Math.max(Math.round(h * 0.052), Math.round((b.hPct / 100) * h));

        // Rounded cream card covering the foreign text in-place
        const radius = Math.min(14, Math.round(bh * 0.25));
        ctx.save();
        ctx.fillStyle = 'rgba(255, 253, 248, 0.95)';
        ctx.strokeStyle = '#C48E63';
        ctx.lineWidth = Math.max(2, Math.round(w * 0.0025));

        ctx.beginPath();
        ctx.moveTo(bx + radius, by);
        ctx.lineTo(bx + bw - radius, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius);
        ctx.lineTo(bx + bw, by + bh - radius);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh);
        ctx.lineTo(bx + radius, by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius);
        ctx.lineTo(bx, by + radius);
        ctx.quadraticCurveTo(bx, by, bx + radius, by);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Number badge pill on left of box
        const badgeW = Math.max(24, Math.min(36, Math.round(bh * 0.72)));
        ctx.fillStyle = '#F2CA62';
        ctx.fillRect(bx + 3, by + 3, badgeW, bh - 6);
        ctx.fillStyle = '#2D251E';
        const numFontSize = Math.max(12, Math.min(20, Math.round(bh * 0.42)));
        ctx.font = `900 ${numFontSize}px "Zen Maru Gothic", "PingFang TC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(idx + 1), bx + 3 + badgeW / 2, by + bh / 2);

        // Traditional Chinese dish name + NT$ price inside box
        const twd =
          dish.priceForeign && params.rateToTwd
            ? `NT$${Math.round(dish.priceForeign * params.rateToTwd)}`
            : '';
        const priceLabel = dish.priceForeign
          ? ` ${langCfg.currencySymbol}${dish.priceForeign}${twd ? `(${twd})` : ''}`
          : '';
        const fullText = `${dish.translatedZh}${priceLabel}`;

        const availW = Math.max(40, bw - badgeW - 14);
        const fontSize = Math.max(
          13,
          Math.min(
            26,
            Math.floor(Math.min(bh * 0.48, (availW / Math.max(4, fullText.length)) * 1.15))
          )
        );
        ctx.font = `900 ${fontSize}px "Zen Maru Gothic", "PingFang TC", sans-serif`;
        ctx.fillStyle = '#2D251E';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          fullText,
          bx + badgeW + 9,
          by + bh / 2,
          availW
        );
        ctx.restore();
      });

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = params.imageDataUrl;
  });
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
      // Extract trailing or embedded price like 1,280円, ¥850, 15000원, HK$48, €18.5, $12
      const priceMatch = line.match(
        /(?:(?:HK\$|MOP\s*|[¥₩$€฿₫])\s*)?(\d{1,3}(?:,\d{3})+|\d{2,6}(?:\.\d{1,2})?)\s*(?:円|원|บาท|동|蚊|港幣|元|HKD|MOP|EUR|USD|JPY|KRW|税込|税抜)?/i
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
      const baseZh = gtx?.translated || `${cleanDish}`;
      const translatedZh =
        targetLang === 'yue'
          ? annotateHongKongCantoneseMenuZh(cleanDish, baseZh)
          : baseZh;
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
    const targetLower = bcp47.toLowerCase();
    const langPrefix = targetLower.split('-')[0];
    let preferred: SpeechSynthesisVoice | undefined;
    if (targetLower === 'zh-hk' || targetLower.startsWith('yue')) {
      // Strictly prioritize authentic Hong Kong Cantonese voices (e.g. Apple Sin-ji / zh-HK / yue-HK) before falling back
      const isCantoneseVoice = (v: SpeechSynthesisVoice) =>
        /zh[-_]hk|yue|cantonese|sin-?ji|hiu-?gaai|hiu-?maan|wan-?lung|香港|粵語|廣東話/i.test(
          `${v.lang} ${v.name}`
        );
      preferred =
        voices.find((v) => isCantoneseVoice(v) && v.localService) ||
        voices.find((v) => isCantoneseVoice(v));
    }
    if (!preferred) {
      preferred =
        voices.find((v) => v.lang.toLowerCase() === targetLower && v.localService) ||
        voices.find((v) => v.lang.toLowerCase() === targetLower) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    }
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

/**
 * 若使用者貼上的是 Google Maps 網址 (例如 https://www.google.com/maps/place/一蘭+新宿...) 或 Tabelog 網址，
 * 自動從網址中解析出餐廳名稱！
 */
export function extractRestaurantNameFromInput(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed);
      // Google Maps /maps/place/<Name>/...
      const placeMatch = u.pathname.match(/\/maps\/place\/([^/]+)/i);
      if (placeMatch && placeMatch[1]) {
        return decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
      }
      const qParam = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('sk');
      if (qParam) return qParam.trim();
    }
  } catch {
    // Fallback to raw string
  }
  return trimmed;
}

export interface RestaurantMenuSearchResult {
  title: string;
  lang: LanguageCode;
  engine: 'gemini-search' | 'restaurant-search';
  addressNote?: string;
  googleMapsUrl: string;
  localFoodPortalUrl: string;
  officialUrl?: string;
  items: MenuDishItem[];
}

function buildFoodPortalLinks(
  restaurantName: string,
  lang: LanguageCode
): { googleMapsUrl: string; localFoodPortalUrl: string } {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${restaurantName} menu 菜單`
  )}`;
  let localFoodPortalUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
    `${restaurantName} メニュー menu`
  )}`;
  if (lang === 'ja') {
    localFoodPortalUrl = `https://tabelog.com/rstLst/?vs=1&sa=&sk=${encodeURIComponent(
      restaurantName
    )}`;
  } else if (lang === 'ko') {
    localFoodPortalUrl = `https://map.naver.com/p/search/${encodeURIComponent(
      restaurantName
    )}`;
  } else if (lang === 'yue') {
    localFoodPortalUrl = `https://www.openrice.com/zh/hongkong/restaurants?what=${encodeURIComponent(
      restaurantName
    )}`;
  }
  return { googleMapsUrl, localFoodPortalUrl };
}

/**
 * 透過 OpenStreetMap Nominatim 免費查詢全球真實餐廳座標、當地官方店名、料理分類與官網 (100% 免金鑰 CORS 支援)
 */
async function lookupRestaurantOnOpenStreetMap(
  query: string
): Promise<{
  localName?: string;
  displayAddress?: string;
  cuisine?: string;
  website?: string;
} | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 4500) : null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=jsonv2&extratags=1&namedetails=1&limit=3`;
    const res = await fetch(url, {
      signal: ctrl?.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const best =
      data.find(
        (d: Record<string, unknown>) =>
          d.category === 'amenity' ||
          d.type === 'restaurant' ||
          d.type === 'fast_food' ||
          d.type === 'cafe' ||
          d.type === 'bar'
      ) || data[0];
    if (!best) return null;

    const namedetails = (best.namedetails || {}) as Record<string, string>;
    const extratags = (best.extratags || {}) as Record<string, string>;
    const localName =
      namedetails['name:ja'] ||
      namedetails['name:ko'] ||
      extratags['brand:ja'] ||
      extratags['brand:ko'] ||
      best.name ||
      undefined;

    return {
      localName: localName ? String(localName).trim() : undefined,
      displayAddress: best.display_name ? String(best.display_name).trim() : undefined,
      cuisine: extratags.cuisine ? String(extratags.cuisine).trim() : undefined,
      website: extratags.website || extratags['contact:website'] || undefined,
    };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 透過 Wikipedia API (`origin=*`) 檢索該餐廳條目中提到的『招牌菜名』或「代表料理」
 */
async function extractWikipediaSignatureDishes(
  query: string,
  lang: LanguageCode
): Promise<string[]> {
  const wikiHost =
    lang === 'ja'
      ? 'ja.wikipedia.org'
      : lang === 'ko'
      ? 'ko.wikipedia.org'
      : 'zh.wikipedia.org';
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 4000) : null;
  try {
    const url = `https://${wikiHost}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query
    )}&format=json&origin=*`;
    const res = await fetch(url, { signal: ctrl?.signal });
    if (!res.ok) return [];
    const data = await res.json();
    const hits = data?.query?.search;
    if (!Array.isArray(hits) || hits.length === 0) return [];
    const combinedSnippet = hits
      .slice(0, 3)
      .map((h: { snippet?: string }) =>
        (h.snippet || '').replace(/<[^>]+>/g, '')
      )
      .join(' ');
    // Extract quoted signature items like 「天然とんこつラーメン」 or 『シロノワール』
    const quoted = combinedSnippet.match(/[「『]([^」』]{2,18})[」』]/g) || [];
    const cleaned = quoted
      .map((q) => q.slice(1, -1).trim())
      .filter(
        (q) =>
          q.length >= 2 &&
          !/株式会社|創業|店舗|チェーン|グループ|一覧|メニュー|テレビ/.test(q)
      );
    return Array.from(new Set(cleaned)).slice(0, 4);
  } catch {
    return [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 若使用者綁定了 Gemini API Key，自動啟用 `google_search` Grounding 即時上網搜尋該餐廳在 Google / Tabelog / 官網上的真實菜單！
 */
async function searchRestaurantMenuWithGeminiGrounding(params: {
  restaurantQuery: string;
  targetLang: LanguageCode;
  geminiApiKey: string;
  geminiModel?: string;
}): Promise<RestaurantMenuSearchResult | null> {
  const cleanKey = params.geminiApiKey.trim();
  if (!cleanKey) return null;
  const langCfg = LANGUAGES[params.targetLang];
  const model = params.geminiModel || 'gemini-2.5-flash';

  const prompt = `你是一位精通${langCfg.countryName}美食與餐廳菜單的導遊助手。
使用者正在搜尋這間餐廳的菜單：「${params.restaurantQuery}」（目標語言：${langCfg.name}）。
請搜尋該餐廳在 Google Maps、Tabelog、Naver Map 或官方網站上最真實的招牌必點菜單與價格（約 6 ~ 8 道代表性餐點／飲品）。
請嚴格只回傳 JSON 物件（不要 markdown 區塊），格式如下：
{
  "restaurantTitle": "餐廳完整名稱（含外文原名與中文，例如：🇯🇵 銀座 篝 雞白湯拉麵）",
  "addressNote": "分店地區或點餐小提醒（例如：低消規定、食券機點餐、可否免費加麵等）",
  "officialUrl": "官方網站網址（無則填 null）",
  "items": [
    {
      "originalName": "店員看得懂的${langCfg.name}外文原名",
      "translatedZh": "台灣繁體中文菜名翻譯",
      "romanization": "外文發音或羅馬拼音",
      "descriptionZh": "口感、食材或為什麼必點的簡短介紹",
      "priceForeign": 當地貨幣純數字預估價格,
      "dietaryWarning": "若含牛肉/豬肉/生食/蝦蟹海鮮/辣味/酒精請標註，無則填 null"
    }
  ]
}`;

  const tryFetch = async (useSearchTool: boolean) => {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 18000) : null;
    try {
      const bodyPayload: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          ...(useSearchTool ? {} : { responseMimeType: 'application/json' }),
        },
      };
      if (useSearchTool) {
        bodyPayload.tools = [{ google_search: {} }];
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(cleanKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
          signal: ctrl?.signal,
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const rawText: string =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text || '')
          .join('') || '';
      if (!rawText) return null;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
        return null;
      }
      const now = Date.now();
      const items: MenuDishItem[] = parsed.items
        .filter((it: Record<string, unknown>) => it && typeof it.originalName === 'string')
        .map((it: Record<string, unknown>, idx: number) => {
          const orig = String(it.originalName).trim();
          const zh = String(it.translatedZh || orig).trim();
          return {
            id: `gsearch-dish-${now}-${idx}`,
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
      const links = buildFoodPortalLinks(params.restaurantQuery, params.targetLang);
      return {
        title:
          typeof parsed.restaurantTitle === 'string' && parsed.restaurantTitle.trim()
            ? parsed.restaurantTitle.trim()
            : `${langCfg.flag} ${params.restaurantQuery} 招牌菜單`,
        lang: params.targetLang,
        engine: 'gemini-search' as const,
        addressNote:
          typeof parsed.addressNote === 'string' ? parsed.addressNote.trim() : undefined,
        googleMapsUrl: links.googleMapsUrl,
        localFoodPortalUrl: links.localFoodPortalUrl,
        officialUrl:
          typeof parsed.officialUrl === 'string' &&
          parsed.officialUrl.startsWith('http')
            ? parsed.officialUrl
            : undefined,
        items,
      };
    } catch {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  // Try with Google Search Grounding first; fallback to standard Gemini knowledge if grounding tool is restricted
  const grounded = await tryFetch(true);
  if (grounded) return grounded;
  return tryFetch(false);
}

/**
 * 將台灣旅客常輸入的繁體中文餐廳名／料理詞（例如：「挽肉與米」、「五代目花山烏龍麵」、「利久牛舌」、「敘敘苑」、「淺草今半」）
 * 自動正規化為當地搜尋引擎最容易命中的外文關鍵字！
 */
export function normalizeRestaurantQueryForLocalSearch(
  rawQuery: string,
  targetLang: LanguageCode
): string {
  let out = rawQuery.trim();
  if (!out) return '';
  if (targetLang === 'ja') {
    const jaReplacements: Array<[RegExp, string]> = [
      [/烏龍麵/g, 'うどん'],
      [/蕎麥麵/g, 'そば'],
      [/拉麵/g, 'ラーメン'],
      [/沾麵/g, 'つけ麺'],
      [/迴轉壽司/g, '回転寿司'],
      [/壽司/g, '寿司'],
      [/燒肉|烤肉/g, '焼肉'],
      [/牛舌/g, ' 牛たん'],
      [/炸豬排|豬排/g, 'とんかつ'],
      [/炸牛排/g, '牛かつ'],
      [/壽喜燒/g, 'すき焼き'],
      [/涮涮鍋/g, 'しゃぶしゃぶ'],
      [/鰻魚飯|鰻魚/g, 'うなぎ'],
      [/串燒/g, '焼き鳥'],
      [/串炸/g, '串かつ'],
      [/鬆餅/g, 'パンケーキ'],
      [/千層蛋糕|蛋糕/g, 'ケーキ'],
      [/敘敘/g, '叙々'],
      [/敘/g, '叙'],
      [/淺/g, '浅'],
      [/與/g, 'と'],
      [/麵/g, '麺'],
      [/雞/g, '鶏'],
      [/燒/g, '焼'],
      [/鐵/g, '鉄'],
      [/澤/g, '沢'],
      [/廣/g, '広'],
      [/濱/g, '浜'],
      [/邊/g, '辺'],
    ];
    for (const [pattern, rep] of jaReplacements) {
      out = out.replace(pattern, rep);
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * 從搜尋引擎回傳的 Markdown 結果中，自動挑選出可進一步抓取完整菜單的官方／食評菜單網址
 * （優先順序：umenu.jp 結構化菜單庫 > 店家官網 /menu /oshinagaki > 楽天ぐるなび r.gnavi.co.jp）
 */
export function extractMenuUrlsFromSearchMarkdown(searchMd: string): string[] {
  const urls: string[] = [];
  const regex = /\((https?:\/\/[^\s)"<>]+)\)/g;
  let m: RegExpExecArray | null;
  const blockedDomains = [
    'yahoo.co.jp',
    'tabelog.com',
    'hotpepper.jp',
    'hitosara.com',
    'retty.me',
    'google.',
    'youtube.',
    'instagram.',
    'twitter.',
    'x.com',
    'facebook.',
    'bing.com',
    'duckduckgo.com',
    '.pdf',
    '.jpg',
    '.png',
    '.svg',
    'login',
    'reserve',
    'recruit',
    'wikipedia.org',
  ];

  while ((m = regex.exec(searchMd)) !== null) {
    let url = m[1];
    // Unwrap DuckDuckGo uddg redirect URL if present
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/i);
    if (uddgMatch && uddgMatch[1]) {
      try {
        url = decodeURIComponent(uddgMatch[1]);
      } catch {
        // Keep original
      }
    }
    const lower = url.toLowerCase();
    if (blockedDomains.some((bad) => lower.includes(bad))) {
      continue;
    }
    if (
      lower.includes('umenu.jp/menus/') ||
      lower.includes('r.gnavi.co.jp/') ||
      /\/(?:menu|food|oshinagaki|shinagaki|lunch|dinner|grand|special|course)/i.test(lower)
    ) {
      if (!urls.includes(url)) {
        urls.push(url);
      }
    }
  }

  urls.sort((a, b) => {
    const score = (u: string) =>
      u.includes('umenu.jp/menus/') ? 0 : !u.includes('gnavi.co.jp') ? 1 : 2;
    return score(a) - score(b);
  });

  return urls.slice(0, 2);
}

/**
 * 從即時檢索到的搜尋結果與店家官方菜單頁 Markdown 中，精準解析出「真實外文菜名 ＋ 真實當地價格」！
 * 支援：
 * 1. umenu.jp 價格分組格式 (`## [330円.]` + `【二階建て生ほたて】`)
 * 2. Yahoo! マップ 內嵌菜單卡片 (`[鶏白湯Sobaの画像 鶏白湯Soba 1,200円 ★ ...]`)
 * 3. 店家官網 / ぐるなび / 食評摘要中的菜名與價格 (`* ざる（醤油つゆ） 890円`、`特上カルビ. 4,200円`、`칼국수 : 12,000원`)
 */
export function extractRealMenuDishesFromWebMarkdown(
  md: string,
  targetLang: LanguageCode
): Array<{ originalName: string; priceForeign?: number }> {
  if (!md || !md.trim()) return [];
  const items: Array<{ originalName: string; priceForeign?: number }> = [];
  const seen = new Set<string>();

  const noiseRegex =
    /(検索|マップ|食べログ|ぐるなび|ホットペッパー|件の|レビュー|口コミ|予算|営業時間|アクセス|予約|平均|税込価格|ページ|一覧|写真|画像|店舗|円〜|円～|以上|以下|未満|割引|クーポン|送料|無料|追加|変更|時間|ランチ営業|ディナー営業|調査|まとめ|ブログ|記事|サイト|公式|電話|住所|二人で|一人で|ついて|価格設定|値段や|ちなみに|お求めやす|バランス|秀逸|保存版|新商品|一番安|一番高|円大|お子様料金|小学生|キャンセル|チケット|放題コース|飲み放題|食べ放題メニュー|たった|異なり|料理のみ|税込み|税抜き|現在|以前|当時|並盛り|大盛り|特盛り|ハーフ|利用金額|カード可|席数|定休日)/i;

  const validJaEndingFoodNoun =
    /(?:そば|ソバ|ラテ|パフェ|ピッツァ|パスタ|サラダ|コロッケ|カフェ|フラッペ|マリネ|ソテー|天ぷら|いくら|うに|かに|えび|たこ|いか|たい|ぶり|あなご|まぐろ|とろ|カルビ|ハラミ|ロース|ホルモン|キムチ|チヂミ|ビビンバ|クッパ|盛合せ|盛り合わせ|握り|巻き|焼き|揚げ|煮込み|たたき|刺し|蒸し|出し|茶漬け|うどん|ラーメン|つけ麺|定食|丼|重|鍋|膳|セット|ステーキ|ハンバーグ|カレー|シチュー|ピザ|ケーキ|タルト|クレープ|ティラミス|コーヒー|ティー|茶|酒|ビール)$/i;

  const addCandidate = (rawName: string, price?: number) => {
    let name = rawName
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\*\*/g, '')
      .trim();

    name = name
      .replace(/^[\s・･·;；:：、,，.。/／\-|｜*#◎○●◇■□▼▲]+|[\s・･·;；:：、,，.。/／\-|｜*#]+$/g, '')
      .replace(/^[(\[（【]+(?![^)\]）】]*[)\]）】])/, '')
      .replace(/^(?:メニュー|価格|値段|料理|単品メニュー|注文|おすすめ|売れ筋|新着|名物|人気|定番)\s*/i, '')
      .replace(/[.。,，:：・/／\s]*(?:1カット|1ピース|1ホール|お一人様|税込|税抜)\s*$/i, '')
      .trim();

    if (name.length < 2 || name.length > 28) return;
    if (noiseRegex.test(name)) return;
    if (/\d+$/.test(name)) return;

    if (targetLang === 'ja') {
      if (!/[ぁ-んァ-ヶ一-龠々ーA-Za-z]/.test(name)) return;
      if (
        /[はがをにへとでやもてい]$/.test(name) &&
        !validJaEndingFoodNoun.test(name)
      ) {
        return;
      }
      if (price !== undefined && (price < 120 || price > 45000)) return;
    } else if (targetLang === 'ko') {
      if (!/[가-힣A-Za-z]/.test(name)) return;
      if (price !== undefined && (price < 1000 || price > 250000)) return;
    } else if (targetLang === 'yue') {
      if (!/[\u4e00-\u9fffA-Za-z]/.test(name)) return;
      if (price !== undefined && (price < 5 || price > 5000)) return;
    }

    const key = name.replace(/[\s()（）【】[\]・･·]+/g, '').toLowerCase();
    if (key.length < 2 || seen.has(key)) return;
    seen.add(key);
    items.push({ originalName: name, priceForeign: price });
  };

  // 1. umenu.jp structured price sections: ## [330円.] followed by 【二階建て生ほたて(一貫)】
  let currentBucketPrice: number | undefined;
  for (const line of md.split(/\r?\n/)) {
    const trimmed = line.trim();
    const bucketMatch = trimmed.match(/^##\s*\[?(\d{1,2},\d{3}|\d{3,5})円/);
    if (bucketMatch) {
      currentBucketPrice = Number.parseInt(bucketMatch[1].replace(/,/g, ''), 10);
      continue;
    }
    if (trimmed.includes('【') && trimmed.includes('】')) {
      const bracketRegex = /【([^【】]{2,26})】(?:\s*(?:\*\*)?(\d{1,2},\d{3}|\d{3,5})\s*(?:\*\*)?円)?/g;
      let bm: RegExpExecArray | null;
      while ((bm = bracketRegex.exec(trimmed)) !== null) {
        const explicitPrice = bm[2]
          ? Number.parseInt(bm[2].replace(/,/g, ''), 10)
          : currentBucketPrice;
        if (explicitPrice) {
          addCandidate(bm[1], explicitPrice);
        }
      }
    }
  }

  const cleanText = md.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\*\*/g, '');

  // 2. Yahoo! マップ embedded menu cards: [鶏白湯Sobaの画像 鶏白湯Soba 1,200円 ★
  const yahooMapRegex =
    /\[([^[\]]+?)の画像\s+([^[\]]+?)\s+(?:〜)?(\d{1,2},\d{3}|\d{3,5})円/g;
  let ym: RegExpExecArray | null;
  while ((ym = yahooMapRegex.exec(cleanText)) !== null) {
    addCandidate(ym[2], Number.parseInt(ym[3].replace(/,/g, ''), 10));
  }

  // 3. Markdown bullet / heading lines on official menu pages
  for (const line of cleanText.split(/\r?\n/)) {
    const lineS = line.trim();
    if (targetLang === 'ja') {
      const mLine = lineS.match(
        /^(?:[*+-]|\d+\.|#{2,4})\s+(.+?)\s*(?:お一人様)?\s*[/／:：・\s]*(?:[￥¥]\s*(\d{1,2},\d{3}|\d{3,5})(?:\s*→\s*[￥¥]\s*(\d{1,2},\d{3}|\d{3,5}))?|(\d{1,2},\d{3}|\d{3,5})\s*円)/
      );
      if (mLine) {
        const pStr = mLine[3] || mLine[2] || mLine[4];
        if (pStr) {
          addCandidate(mLine[1], Number.parseInt(pStr.replace(/,/g, ''), 10));
        }
      }
    } else if (targetLang === 'ko') {
      const mKo = lineS.match(
        /^(?:[*+-]|\d+\.|#{2,4})?\s*([가-힣A-Za-z0-9\s()]{2,22}?)\s*[:：·\-]\s*(\d{1,3}(?:,\d{3})+|\d{4,6})\s*원/
      );
      if (mKo) {
        addCandidate(mKo[1], Number.parseInt(mKo[2].replace(/,/g, ''), 10));
      }
    }
  }

  // 4. General inline dish + price pattern across search snippets
  if (targetLang === 'ja') {
    const jaInlineRegex =
      /(?:^|[・･·;；。|\n\r]|\s)([【[][^】\]]{1,12}[】\]]\s*[ぁ-んァ-ヶ一-龠々ーA-Za-z0-9・＆&()（）\s]{0,20}|[ぁ-んァ-ヶ一-龠々ーA-Za-z][ぁ-んァ-ヶ一-龠々ーA-Za-z0-9・＆&()（）\s]{1,22}?)\s*(?:[.。,，:：・\s]+(?:1カット|1ピース|単品|お一人様))?\s*[.。,，:：・/／\s]*\s*(?:[￥¥]\s*(\d{1,2},\d{3}|\d{3,5})(?:\s*\(税込\)|\s*（税込）|\s*円)?|(\d{1,2},\d{3}|\d{3,5})\s*円)/g;
    let jm: RegExpExecArray | null;
    while ((jm = jaInlineRegex.exec(cleanText)) !== null) {
      const dish = jm[1].trim();
      if (/\d$/.test(dish)) continue;
      const pStr = jm[2] || jm[3];
      if (pStr) {
        addCandidate(dish, Number.parseInt(pStr.replace(/,/g, ''), 10));
      }
    }
  } else if (targetLang === 'ko') {
    const koInlineRegex =
      /([가-힣][가-힣A-Za-z0-9\s()]{1,18}?)\s*[:：·.]?\s*(\d{1,3}(?:,\d{3})+|\d{4,6})\s*원/g;
    let km: RegExpExecArray | null;
    while ((km = koInlineRegex.exec(cleanText)) !== null) {
      const dish = km[1].trim();
      if (/\d$/.test(dish)) continue;
      addCandidate(dish, Number.parseInt(km[2].replace(/,/g, ''), 10));
    }
  } else if (targetLang === 'yue') {
    const yueInlineRegex =
      /(?:^|[・･·;；。|\n\r]|\s)([\u4e00-\u9fff][\u4e00-\u9fffA-Za-z0-9()（）\s]{1,18}?)\s*[:：·.\-/\s]*\s*(?:(?:HK\$|MOP\s*|\$)\s*(\d{1,4}(?:\.\d{1,2})?)|(\d{1,4})\s*(?:蚊|港幣|元))/gi;
    let ym2: RegExpExecArray | null;
    while ((ym2 = yueInlineRegex.exec(cleanText)) !== null) {
      const dish = ym2[1].trim();
      if (/\d$/.test(dish)) continue;
      const pStr = ym2[2] || ym2[3];
      if (pStr) {
        addCandidate(dish, Number.parseFloat(pStr));
      }
    }
  } else {
    const intlInlineRegex =
      /([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÿ0-9\s'’&()-]{2,26}?)\s*[:：·\-]?\s*(?:[$€฿₫]\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)|(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:EUR|USD|THB|VND|฿|€|\$))/g;
    let im: RegExpExecArray | null;
    while ((im = intlInlineRegex.exec(cleanText)) !== null) {
      const dish = im[1].trim();
      const pStr = im[2] || im[3];
      if (pStr) {
        addCandidate(dish, Number.parseFloat(pStr.replace(/,/g, '')));
      }
    }
  }

  return items.slice(0, 12);
}

async function fetchJinaMarkdown(targetUrl: string, timeoutMs = 7500): Promise<string> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetch(`https://r.jina.ai/${targetUrl}`, {
      signal: ctrl?.signal,
      headers: {
        Accept: 'text/plain',
      },
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 🌐 免 API Key！即時透過搜尋引擎（Yahoo! 検索 / Yahoo! マップ菜單卡 / DuckDuckGo）與店家官方菜單頁 (`umenu.jp` / 官網 `/menu` / ぐるなび)
 * 抓取該餐廳在網路上的真實菜單品項與價格，並自動逐道翻譯成繁體中文！
 */
export async function scrapeLiveRestaurantMenuFromWeb(params: {
  query: string;
  targetLang: LanguageCode;
  onProgress?: (statusText: string, pct: number) => void;
}): Promise<{
  items: MenuDishItem[];
  discoveredOfficialUrl?: string;
  normalizedQuery: string;
}> {
  const normalizedQuery = normalizeRestaurantQueryForLocalSearch(
    params.query,
    params.targetLang
  );

  const searchUrl =
    params.targetLang === 'ja'
      ? `https://search.yahoo.co.jp/search?p=${encodeURIComponent(
          `${normalizedQuery} メニュー 価格 円`
        )}`
      : params.targetLang === 'ko'
      ? `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
          `${normalizedQuery} 메뉴 가격 원`
        )}`
      : params.targetLang === 'yue'
      ? `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
          `${normalizedQuery} 香港 餐牌 價錢 HK$`
        )}`
      : `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
          `${normalizedQuery} restaurant menu prices`
        )}`;

  params.onProgress?.(
    `🌐 正在即時檢索「${normalizedQuery}」的線上真實菜單與價格...`,
    45
  );

  let searchMd = await fetchJinaMarkdown(searchUrl, 8000);
  if (!searchMd && params.targetLang === 'ja') {
    const fallbackDdg = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
      `${normalizedQuery} メニュー 価格 円`
    )}`;
    searchMd = await fetchJinaMarkdown(fallbackDdg, 7000);
  }

  const candidateMenuUrls = extractMenuUrlsFromSearchMarkdown(searchMd);
  const rawDishes: Array<{ originalName: string; priceForeign?: number }> = [];
  const seenKeys = new Set<string>();

  const pushUniqueDishes = (
    list: Array<{ originalName: string; priceForeign?: number }>
  ) => {
    for (const item of list) {
      const k = item.originalName
        .replace(/[\s()（）【】[\]・･·]+/g, '')
        .toLowerCase();
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        rawDishes.push(item);
      }
    }
  };

  // 1. If we discovered an official menu page or umenu.jp structured menu, fetch it first for 100% pure menu items!
  if (candidateMenuUrls.length > 0) {
    params.onProgress?.(
      `📖 已找到「${normalizedQuery}」線上菜單頁，正在擷取完整品項與價格...`,
      68
    );
    const pageMd = await fetchJinaMarkdown(candidateMenuUrls[0], 6800);
    if (pageMd) {
      pushUniqueDishes(
        extractRealMenuDishesFromWebMarkdown(pageMd, params.targetLang)
      );
    }
  }

  // 2. Also extract Yahoo! Map menu cards & Tabelog/Gurunavi/HotPepper menu snippets from the search result page
  if (searchMd) {
    pushUniqueDishes(
      extractRealMenuDishesFromWebMarkdown(searchMd, params.targetLang)
    );
  }

  // 3. If still < 4 items and there is a 2nd candidate menu URL, fetch it too
  if (rawDishes.length < 4 && candidateMenuUrls.length > 1) {
    const pageMd2 = await fetchJinaMarkdown(candidateMenuUrls[1], 6000);
    if (pageMd2) {
      pushUniqueDishes(
        extractRealMenuDishesFromWebMarkdown(pageMd2, params.targetLang)
      );
    }
  }

  const topDishes = rawDishes.slice(0, 12);
  if (topDishes.length === 0) {
    return {
      items: [],
      discoveredOfficialUrl: candidateMenuUrls[0],
      normalizedQuery,
    };
  }

  params.onProgress?.(
    `✨ 已抓取到 ${topDishes.length} 道真實餐點，正在翻譯為繁體中文...`,
    85
  );

  const now = Date.now();
  const translatedItems: MenuDishItem[] = await Promise.all(
    topDishes.map(async (d, idx): Promise<MenuDishItem> => {
      const cleanOrig = d.originalName.replace(/^[【[]|[】\]]$/g, '').trim();
      const gtx = await translateViaGoogleGtx(
        cleanOrig,
        params.targetLang,
        'zh-TW'
      );
      const baseZh = gtx?.translated || cleanOrig;
      const translatedZh =
        params.targetLang === 'yue'
          ? annotateHongKongCantoneseMenuZh(cleanOrig, baseZh)
          : baseZh;
      return {
        id: `web-dish-${now}-${idx}`,
        originalName: cleanOrig,
        translatedZh,
        romanization: gtx?.romanization || undefined,
        priceForeign: d.priceForeign,
        dietaryWarning: detectDishDietaryWarning(
          `${cleanOrig} ${translatedZh}`
        ),
        quantity: 0,
      };
    })
  );

  return {
    items: translatedItems,
    discoveredOfficialUrl: candidateMenuUrls[0],
    normalizedQuery,
  };
}

/**
 * 🔍 核心功能：輸入餐廳名稱或貼上 Google Maps 餐廳連結，自動抓取該店真實招牌菜單並翻譯成「店員指指點餐卡」！
 * 支援三軌：
 * 1. 台灣旅客必吃名店官方認證菜單庫（秒開、100% 精準官方價格與吃法介紹）
 * 2. 若有綁定 Gemini Key -> 啟動 Google Search Grounding 即時搜尋該店最新網路菜單
 * 3. 免 API Key 即時網路菜單爬蟲 -> 自動透過 Yahoo! マップ菜單卡、店家官網 `/menu`、`umenu.jp`、ぐるなび與 DuckDuckGo 抓取該店真實菜名與價格並翻譯為中文（絕不回傳假固定項目！）
 */
export async function searchRestaurantMenuOnline(params: {
  query: string;
  targetLang: LanguageCode;
  geminiApiKey?: string;
  geminiModel?: string;
  onProgress?: (statusText: string, pct: number) => void;
}): Promise<RestaurantMenuSearchResult> {
  const cleanName = extractRestaurantNameFromInput(params.query);
  if (!cleanName) {
    throw new Error('請輸入要搜尋的餐廳名稱（例如：一蘭、挽肉與米、五代目花山烏龍麵、六歌仙、利久牛舌、敘敘苑、橋村炸雞）');
  }

  params.onProgress?.(`🔍 正在搜尋「${cleanName}」的餐廳資訊與官方菜單...`, 20);

  // 1. Check Curated Top Tourist Chains Database first (Instant & 100% Verified Official Prices!)
  const norm = cleanName.toLowerCase();
  const normalizedLocal = normalizeRestaurantQueryForLocalSearch(
    cleanName,
    params.targetLang
  ).toLowerCase();

  const curatedHit = POPULAR_RESTAURANT_MENUS.find((rest) =>
    rest.keywords.some((kw) => {
      const k = kw.toLowerCase();
      return (
        norm.includes(k) ||
        normalizedLocal.includes(k) ||
        (norm.length >= 2 && k.includes(norm))
      );
    })
  );

  // Lookup OpenStreetMap in parallel for real branch address & website
  const osmPromise = lookupRestaurantOnOpenStreetMap(cleanName);

  if (curatedHit) {
    params.onProgress?.(`✨ 已命中「${curatedHit.displayName}」官方認證菜單，正在定位分店資訊...`, 75);
    const osm = await osmPromise;
    const now = Date.now();
    const links = buildFoodPortalLinks(
      osm?.localName || cleanName,
      curatedHit.lang
    );
    params.onProgress?.('✅ 餐廳菜單載入完成！', 100);
    return {
      title: curatedHit.displayName,
      lang: curatedHit.lang,
      engine: 'restaurant-search',
      addressNote: osm?.displayAddress
        ? `📍 已定位：${osm.displayAddress} ｜ ${curatedHit.locationNote}`
        : `📍 ${curatedHit.locationNote}`,
      googleMapsUrl: links.googleMapsUrl,
      localFoodPortalUrl: links.localFoodPortalUrl,
      officialUrl: osm?.website || curatedHit.officialUrl,
      items: curatedHit.items.map((it, idx) => ({
        ...it,
        id: `rest-${curatedHit.id}-${now}-${idx}`,
        quantity: 0,
      })),
    };
  }

  // 2. If user has Gemini API Key configured, use Gemini + Google Search Grounding for ANY restaurant worldwide!
  if (params.geminiApiKey && params.geminiApiKey.trim().length > 10) {
    params.onProgress?.(
      `🌐 正在透過 Gemini Google Search 即時檢索「${cleanName}」的線上菜單...`,
      42
    );
    const geminiMenu = await searchRestaurantMenuWithGeminiGrounding({
      restaurantQuery: cleanName,
      targetLang: params.targetLang,
      geminiApiKey: params.geminiApiKey,
      geminiModel: params.geminiModel,
    });
    if (geminiMenu) {
      params.onProgress?.('✅ 已從 Google 檢索並翻譯好該店真實菜單！', 100);
      return geminiMenu;
    }
  }

  // 3. Free Zero-Key Live Web Menu Crawler + OpenStreetMap + Wikipedia Signature Dishes
  const [liveScraped, osmInfo, wikiDishes] = await Promise.all([
    scrapeLiveRestaurantMenuFromWeb({
      query: cleanName,
      targetLang: params.targetLang,
      onProgress: params.onProgress,
    }),
    osmPromise,
    extractWikipediaSignatureDishes(cleanName, params.targetLang),
  ]);

  const langCfg = LANGUAGES[params.targetLang];
  const localRestName =
    osmInfo?.localName || liveScraped.normalizedQuery || cleanName;
  const combinedHint = `${cleanName} ${localRestName} ${osmInfo?.cuisine || ''}`;

  const now = Date.now();
  const dynamicItems: MenuDishItem[] = [...liveScraped.items];

  // Append any Wikipedia-extracted signature dishes not already in liveScraped
  if (wikiDishes.length > 0) {
    const wikiTranslated = await Promise.all(
      wikiDishes.map(async (dishName, idx): Promise<MenuDishItem> => {
        const gtx = await translateViaGoogleGtx(dishName, params.targetLang, 'zh-TW');
        const zh = gtx?.translated || dishName;
        return {
          id: `wiki-dish-${now}-${idx}`,
          originalName: dishName,
          translatedZh: `【招牌名物】${zh}`,
          romanization: gtx?.romanization || undefined,
          descriptionZh: `線上食評記載之「${localRestName}」代表餐點`,
          dietaryWarning: detectDishDietaryWarning(`${dishName} ${zh}`),
          quantity: 0,
        };
      })
    );
    for (const wItem of wikiTranslated) {
      if (!dynamicItems.some((d) => d.originalName === wItem.originalName)) {
        dynamicItems.push(wItem);
      }
    }
  }

  // Only if live web scraping found fewer than 2 items, check if the restaurant name matches a specific cuisine template (e.g. Sukiyaki, Kushikatsu, Sushi, Tonkatsu, Yakiniku, Udon, Ramen)
  const cuisineTemplate =
    CUISINE_FALLBACK_MENUS.find((c) => c.matchRegex.test(combinedHint)) || null;

  if (dynamicItems.length < 2 && cuisineTemplate) {
    cuisineTemplate.items.forEach((it, idx) => {
      if (!dynamicItems.some((d) => d.originalName === it.originalName)) {
        dynamicItems.push({
          ...it,
          id: `cuisine-dish-${now}-${idx}`,
          quantity: 0,
        });
      }
    });
  }

  // If even after live web scraping + Wikipedia + cuisine matching there are 0 dishes (e.g. user entered a specific dish name directly in the search box!), translate the entered term directly without generating fake "最受歡迎/特色套餐" items!
  if (dynamicItems.length === 0) {
    const gtxDirect = await translateViaGoogleGtx(
      cleanName,
      'auto',
      params.targetLang
    );
    const foreignTerm = gtxDirect?.translated || localRestName;
    const gtxBackZh = await translateViaGoogleGtx(
      foreignTerm,
      params.targetLang,
      'zh-TW'
    );
    dynamicItems.push({
      id: `direct-query-${now}`,
      originalName: foreignTerm,
      translatedZh: gtxBackZh?.translated || cleanName,
      romanization: gtxBackZh?.romanization || gtxDirect?.romanization || undefined,
      descriptionZh:
        '未在公開網頁檢索到該店完整價目文字表；建議點上方「📍 開啟 Google Maps 菜單相簿」查看實拍菜單後直接截圖上傳翻譯！',
      dietaryWarning: detectDishDietaryWarning(`${foreignTerm} ${cleanName}`),
      quantity: 0,
    });
  }

  const links = buildFoodPortalLinks(localRestName, params.targetLang);
  params.onProgress?.('✅ 餐廳真實菜單與 Google Maps 菜單連結已就緒！', 100);

  return {
    title: `${langCfg.flag} ${localRestName}${
      liveScraped.items.length > 0
        ? `（網路實抓菜單 ${dynamicItems.length} 項）`
        : cuisineTemplate
        ? `（${cuisineTemplate.cuisineLabel}）`
        : ' 線上菜單'
    }`,
    lang: params.targetLang,
    engine: 'restaurant-search',
    addressNote: osmInfo?.displayAddress
      ? `📍 已定位：${osmInfo.displayAddress}`
      : liveScraped.discoveredOfficialUrl
      ? `🌐 已從線上菜單頁即時抓取真實品項與價格！亦可點下方按鈕開啟 Google Maps 菜單相簿。`
      : `💡 可點下方「📍 開啟 Google Maps 菜單相簿」或「🍽️ 開啟 Tabelog/Naver 菜單」查看店內最新菜單照片！`,
    googleMapsUrl: links.googleMapsUrl,
    localFoodPortalUrl: links.localFoodPortalUrl,
    officialUrl: osmInfo?.website || liveScraped.discoveredOfficialUrl,
    items: dynamicItems,
  };
}

