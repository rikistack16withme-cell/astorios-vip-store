/**
 * Telegram Premium Custom Animated Emoji Configuration for AstorrIOS
 * Real, verified animated custom emoji IDs from Telegram's official Finance & Premium sets.
 */

const emojiConfig = {
  // Brand & Highlights
  brand: {
    id: process.env.EMOJI_BRAND_ID || '5267500801240092311', // ⭐ Animated Gold Star
    fallback: '⭐'
  },
  crown: {
    id: process.env.EMOJI_CROWN_ID || '5267500801240092311', // 👑 Animated Crown / Gold
    fallback: '👑'
  },
  game: {
    id: process.env.EMOJI_GAME_ID || '5368324170671202286',  // 🎮 Animated Game Controller
    fallback: '🎮'
  },
  sparkle: {
    id: process.env.EMOJI_SPARKLE_ID || '5267500801240092311', // ✨ Animated Sparkle Star
    fallback: '✨'
  },
  party: {
    id: process.env.EMOJI_PARTY_ID || '5267500801240092311',   // 🎉 Animated Celebration Star
    fallback: '🎉'
  },
  lightning: {
    id: process.env.EMOJI_LIGHTNING_ID || '5373066076558996568', // ⚡ Animated Neon Lightning
    fallback: '⚡'
  },
  shield: {
    id: process.env.EMOJI_SHIELD_ID || '5197288647275071607',   // 🛡 Animated Shield
    fallback: '🛡'
  },
  card: {
    id: process.env.EMOJI_CARD_ID || '5445353829304387411',     // 💳 Animated Blue Card
    fallback: '💳'
  },
  money: {
    id: process.env.EMOJI_MONEY_ID || '5278467510604160626',    // 💵 Animated Money Bag / Cash
    fallback: '💵'
  },
  cash: {
    id: process.env.EMOJI_CASH_ID || '5197434882321567830',     // 💰 Animated Cash Coin
    fallback: '💰'
  },
  key: {
    id: process.env.EMOJI_KEY_ID || '5240228673738527951',      // 🔑 Animated Key Tag
    fallback: '🔑'
  },
  box: {
    id: process.env.EMOJI_BOX_ID || '5190806721286657692',      // 📦 Animated Box / Package
    fallback: '📦'
  },
  users: {
    id: process.env.EMOJI_USERS_ID || '5267500801240092311',    // 👥 Animated Group / Users
    fallback: '👥'
  },
  support: {
    id: process.env.EMOJI_SUPPORT_ID || '5303138782004924588',  // 💬 Animated Chat Bubble
    fallback: '💬'
  },
  pointer: {
    id: process.env.EMOJI_POINTER_ID || '5429651785352501917',  // 👉 Animated Direction Arrow
    fallback: '👉'
  },
  down: {
    id: process.env.EMOJI_DOWN_ID || '5429651785352501917',     // 👇 Animated Down Arrow
    fallback: '👇'
  },
  rocket: {
    id: process.env.EMOJI_ROCKET_ID || '5195033767969839232',  // 🚀 Animated Rocket
    fallback: '🚀'
  },
  diamond: {
    id: process.env.EMOJI_DIAMOND_ID || '5267500801240092311', // 💎 Animated Diamond / VIP
    fallback: '💎'
  },
  verified: {
    id: process.env.EMOJI_VERIFIED_ID || '5219740554455163110',// ✅ Animated Green Checkmark
    fallback: '✅'
  },
  gear: {
    id: process.env.EMOJI_GEAR_ID || '5400250414929041085',     // ⚙️ Animated Settings Gear
    fallback: '⚙️'
  },
  bell: {
    id: process.env.EMOJI_BELL_ID || '5262844652964303985',     // 🔔 Animated Bell
    fallback: '🔔'
  },
  chart: {
    id: process.env.EMOJI_CHART_ID || '5190806721286657692',    // 📊 Animated Chart
    fallback: '📊'
  },
  receipt: {
    id: process.env.EMOJI_RECEIPT_ID || '5444856076954520455',  // 🧾 Animated Receipt
    fallback: '🧾'
  },
  alert: {
    id: process.env.EMOJI_ALERT_ID || '5197288647275071607',    // ⚠️ Animated Warning Shield
    fallback: '⚠️'
  }
};

/**
 * Renders custom animated emoji HTML tag <tg-emoji emoji-id="...">char</tg-emoji>
 */
function tgEmoji(key, customChar = null) {
  const item = emojiConfig[key];
  if (!item) return customChar || '';
  const char = customChar || item.fallback;
  if (item.id && /^\d+$/.test(String(item.id))) {
    return `<tg-emoji emoji-id="${item.id}">${char}</tg-emoji>`;
  }
  return char;
}

/**
 * Strips tg-emoji tags to plain text fallback
 */
function stripTgEmoji(text) {
  if (!text) return '';
  return text.replace(/<tg-emoji emoji-id="[^"]*">(.*?)<\/tg-emoji>/gi, '$1');
}

/**
 * Creates an InlineKeyboardButton with colored style ('primary', 'success', 'danger')
 */
function makeBtn(text, extra = {}, style = 'primary') {
  const validStyles = ['primary', 'success', 'danger'];
  const safeStyle = validStyles.includes(style) ? style : 'primary';
  return {
    text: String(text).trim(),
    style: safeStyle,
    ...extra
  };
}

module.exports = {
  emojiConfig,
  tgEmoji,
  stripTgEmoji,
  makeBtn
};
