const categoryDisplay = new Map([
  ["food", { glyph: "glyph-food", tone: "tone-mint" }],
  ["takeout", { glyph: "glyph-takeout", tone: "tone-mint" }],
  ["groceries", { glyph: "glyph-basket", tone: "tone-mint" }],
  ["transport", { glyph: "glyph-route", tone: "tone-blue" }],
  ["subway", { glyph: "glyph-bus", tone: "tone-blue" }],
  ["taxi", { glyph: "glyph-car", tone: "tone-blue" }],
  ["shopping", { glyph: "glyph-bag", tone: "tone-violet" }],
  ["daily-goods", { glyph: "glyph-bottle", tone: "tone-violet" }],
  ["housing", { glyph: "glyph-home", tone: "tone-blue" }],
  ["rent", { glyph: "glyph-key", tone: "tone-blue" }],
  ["entertainment", { glyph: "glyph-play", tone: "tone-amber" }],
  ["movies", { glyph: "glyph-ticket", tone: "tone-amber" }],
  ["health", { glyph: "glyph-cross", tone: "tone-rose" }],
  ["medicine", { glyph: "glyph-pill", tone: "tone-rose" }],
  ["learning", { glyph: "glyph-book", tone: "tone-violet" }],
  ["books", { glyph: "glyph-pages", tone: "tone-violet" }]
]);

const toneKeywords = [
  { tone: "tone-mint", words: ["餐", "外卖", "菜", "超市", "food", "takeout", "groceries"] },
  { tone: "tone-blue", words: ["交通", "地铁", "公交", "打车", "房", "租", "transport", "subway", "taxi", "housing", "rent"] },
  { tone: "tone-amber", words: ["娱乐", "电影", "演出", "entertainment", "movies"] },
  { tone: "tone-rose", words: ["健康", "医疗", "药", "health", "medicine"] },
  { tone: "tone-violet", words: ["学习", "书", "课程", "购物", "日用", "learning", "books", "shopping", "daily goods"] }
];

export function getCategoryGlyph(categoryId) {
  const known = categoryDisplay.get(categoryId);
  return known?.glyph || "glyph-text";
}

export function getCategoryFallbackText(label) {
  return firstReadableCharacter(label);
}

export function getCategoryTone(categoryId, label) {
  const known = categoryDisplay.get(categoryId);
  if (known) return known.tone;
  const text = String(label || "").toLowerCase();
  return toneKeywords.find((item) => item.words.some((word) => text.includes(word)))?.tone || "tone-gray";
}

function firstReadableCharacter(value) {
  const text = String(value || "").trim();
  const match = text.match(/[\p{Script=Han}a-zA-Z0-9]/u);
  return match ? match[0].toUpperCase() : "•";
}
