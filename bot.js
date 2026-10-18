require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');
const db = require('./data/db');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_IDS = (process.env.ADMIN_IDS || '6805487598,7283817695').split(',').map(id => id.trim());
const GROUP_ID = process.env.GROUP_ID || '-1003942921012';
let WEBAPP_URL = process.env.WEBAPP_URL || 'http://localhost:5000';

const LOGO_PATH = path.join(__dirname, 'public', 'assets', 'logo.jpg');

// State tracker for admin conversational flow (adding products, broadcasting)
const adminSessions = {};

function initBot(webAppUrl) {
  if (webAppUrl) {
    WEBAPP_URL = webAppUrl;
  }

  const bot = new TelegramBot(BOT_TOKEN, { polling: true });

  bot.setWebAppUrl = (newUrl) => {
    WEBAPP_URL = newUrl;
  };

  console.log(`[AstorrIOS Bot] Connected to Telegram API with polling.`);

  // Auto-configure the bottom left "Store" Menu Button
  try {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Store',
          web_app: { url: WEBAPP_URL }
        }
      })
    }).then(r => r.json()).then(res => {
      console.log('[AstorrIOS Bot] Chat Menu Button set to:', WEBAPP_URL, res.ok ? '✓' : res);
    }).catch(() => {});
  } catch (e) {}

  function isAdmin(userId) {
    return ADMIN_IDS.includes(String(userId));
  }

  // -------------------------------------------------------------
  // Animated Telegram Emojis Configuration
  // -------------------------------------------------------------
  const EMOJIS = {
    game: process.env.EMOJI_GAME_ID || '5368324170671202286',
    sparkle: process.env.EMOJI_SPARKLE_ID || '',
    lightning: process.env.EMOJI_LIGHTNING_ID || '',
    shield: process.env.EMOJI_SHIELD_ID || '',
    card: process.env.EMOJI_CARD_ID || '',
    down: process.env.EMOJI_DOWN_ID || '',
    rocket: process.env.EMOJI_ROCKET_ID || ''
  };

  function formatTgEmoji(emojiId, char) {
    if (emojiId && /^\d+$/.test(String(emojiId))) {
      return `<tg-emoji emoji-id="${emojiId}">${char}</tg-emoji>`;
    }
    return char;
  }

  // Caption with Telegram Animated Custom Emojis (using verified IDs)
  function getAnimatedCaption() {
    return `<b>AstorrIOS STORE ${formatTgEmoji(EMOJIS.game, '🎮')}</b>\nសេវាកម្មលឿនរហ័សទាន់ចិត្ត & ទិញស្វ័យប្រវត្តិ ២៤/៧\n\n${formatTgEmoji(EMOJIS.sparkle, '✨')} <b>Welcome to AstorrIOS!</b>\n• ${formatTgEmoji(EMOJIS.lightning, '⚡️')} <b>ទិញភ្លាមបានភ្លាម</b> (instant Service)\n• ${formatTgEmoji(EMOJIS.shield, '🛡️')} <b>សុវត្ថិភាពខ្ពស់ 100%</b>\n• ${formatTgEmoji(EMOJIS.card, '💳')} <b>ទូទាត់រហ័សតាម KHQR</b> (ABA, Bakong & គ្រប់ធនាគារ)\n\n${formatTgEmoji(EMOJIS.down, '👇')} ចុចប៊ូតុង <b>OPEN STORE</b> ខាងក្រោមដើម្បីចូលទិញទំនិញ៖`;
  }

  // Standard Fallback Caption (Clean without tg-emoji)
  function getStandardCaption() {
    return `<b>AstorrIOS STORE 🎮</b>\nសេវាកម្មលឿនរហ័សទាន់ចិត្ត & ទិញស្វ័យប្រវត្តិ ២៤/៧\n\n✨ <b>Welcome to AstorrIOS!</b>\n• ⚡️ <b>ទិញភ្លាមបានភ្លាម</b> (instant Service)\n• 🛡️ <b>សុវត្ថិភាពខ្ពស់ 100%</b>\n• 💳 <b>ទូទាត់រហ័សតាម KHQR</b> (ABA, Bakong & គ្រប់ធនាគារ)\n\n👇 ចុចប៊ូតុង <b>OPEN STORE</b> ខាងក្រោមដើម្បីចូលទិញទំនិញ៖`;
  }

  function getStartKeyboard(isGroup, userId) {
    const keyboard = [
      [
        isGroup
          ? { text: '🚀 🎮 OPEN STORE ⚡️ ✨', url: `https://t.me/${process.env.BOT_USERNAME || 'AstorrIOS_bot'}`, style: 'success' }
          : { text: '🚀 🎮 OPEN STORE ⚡️ ✨', web_app: { url: WEBAPP_URL }, style: 'success' }
      ],
      [
        { text: '👑 💬 CONTACT ADMIN 💬 👑', url: 'https://t.me/Yur1Uchiha' }
      ]
    ];

    if (isAdmin(userId)) {
      keyboard.push([
        { text: '⚙️ ADMIN CONTROL PANEL', callback_data: 'admin_panel' }
      ]);
    }

    return { inline_keyboard: keyboard };
  }

  async function sendBotMessageWithFallback(chatId, captionWithEmoji, captionFallback, replyMarkup) {
    try {
      if (fs.existsSync(LOGO_PATH)) {
        return await bot.sendPhoto(chatId, LOGO_PATH, {
          caption: captionWithEmoji,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        });
      } else {
        return await bot.sendMessage(chatId, captionWithEmoji, {
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        });
      }
    } catch (err) {
      console.warn('Animated custom emoji delivery rejected by Telegram API, falling back to standard format:', err.message);
      if (fs.existsSync(LOGO_PATH)) {
        return await bot.sendPhoto(chatId, LOGO_PATH, {
          caption: captionFallback,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        });
      } else {
        return await bot.sendMessage(chatId, captionFallback, {
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        });
      }
    }
  }

  // -------------------------------------------------------------
  // /start Command
  // -------------------------------------------------------------
  bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
    const firstName = msg.from.first_name || '';

    // Register user in database
    db.saveUser({
      id: userId,
      username: msg.from.username || '',
      firstName: firstName,
      lastName: msg.from.last_name || ''
    });

    const captionWithEmoji = getAnimatedCaption();
    const captionFallback = getStandardCaption();
    const replyMarkup = getStartKeyboard(isGroup, userId);

    try {
      await sendBotMessageWithFallback(chatId, captionWithEmoji, captionFallback, replyMarkup);
    } catch (err) {
      console.error('Error handling /start:', err.message);
    }
  });

  // -------------------------------------------------------------
  // Animated Custom Emoji Inspector (Sends exact ID when admin sends animated emoji)
  // -------------------------------------------------------------
  bot.on('message', async (msg) => {
    if (!isAdmin(msg.from?.id)) return;
    if (msg.entities && msg.chat.type === 'private' && !msg.text?.startsWith('/')) {
      const customEmojis = msg.entities.filter(e => e.type === 'custom_emoji');
      if (customEmojis.length > 0) {
        let reply = `✨ <b>រកឃើញ Animated Custom Emoji!</b>\n━━━━━━━━━━━━━━━━━━━━━\n`;
        customEmojis.forEach((e, idx) => {
          const char = (msg.text || '').substring(e.offset, e.offset + e.length);
          reply += `${idx + 1}. <tg-emoji emoji-id="${e.custom_emoji_id}">${char}</tg-emoji> ID: <code>${e.custom_emoji_id}</code>\n`;
        });
        reply += `\n💡 <i>អ្នកអាចចម្លង ID ទាំងនេះដាក់ក្នុង .env (ឧទាហរណ៍៖ EMOJI_LIGHTNING_ID=...) ដើម្បីប្តូររូបភ្លាមៗ!</i>`;
        bot.sendMessage(msg.chat.id, reply, { parse_mode: 'HTML' });
      }
    }
  });

  // -------------------------------------------------------------
  // /admin, /menu, or typing 'admin' in group
  // -------------------------------------------------------------
  bot.onText(/(\/(admin|menu|store|start)|^(admin|menu)$)/i, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';

    if (isAdmin(userId)) {
      sendAdminDashboard(chatId, userId);
    } else if (isGroup) {
      bot.sendMessage(chatId, `👋 សួស្តី! ចុចទីនេះដើម្បីបើកមើលទំនិញ៖`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 🎮 𝐎𝐏𝐄𝐍 𝐒𝐓𝐎𝐑𝐄 ⚡️ ✨', web_app: { url: WEBAPP_URL } }]
          ]
        }
      });
    }
  });

  // -------------------------------------------------------------
  // /broadcast Command: /broadcast <message>
  // -------------------------------------------------------------
  bot.onText(/\/broadcast (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) return;

    const textToBroadcast = match[1];
    executeBroadcast(chatId, textToBroadcast);
  });

  // -------------------------------------------------------------
  // Admin Dashboard Interface
  // -------------------------------------------------------------
  function sendAdminDashboard(chatId, userId) {
    const stats = db.getStats();
    const isGroup = chatId < 0;
    const text = `
👑 <b>AstorrIOS — ADMIN CONTROL CENTER</b>
━━━━━━━━━━━━━━━━━━━━━
👥 <b>អតិថិជនសរុប (Users):</b> ${stats.totalUsers} នាក់
📦 <b>ទំនិញក្នុងស្តុក (Products):</b> ${stats.totalProducts} មុខ
🛒 <b>ការកុម្ម៉ង់សរុប (Orders):</b> ${stats.totalOrders}
💵 <b>ចំណូលសរុប (Revenue):</b> $${stats.totalRevenue.toFixed(2)} USD
━━━━━━━━━━━━━━━━━━━━━
សូមជ្រើសរើសមុខងារខាងក្រោម៖
    `;

    const adminWebBtn = isGroup
      ? { text: '🌐 បើក Admin WebApp', url: `https://t.me/${process.env.BOT_USERNAME || 'AstorrIOS_bot'}?start=admin` }
      : { text: '🌐 បើក Admin WebApp', web_app: { url: `${WEBAPP_URL}?admin=true` } };

    const markup = {
      inline_keyboard: [
        [
          { text: '➕ បន្ថែមទំនិញថ្មី (Add Product)', callback_data: 'admin_add_prod' },
          { text: '📦 បញ្ជីទំនិញ (Manage Products)', callback_data: 'admin_list_prod' }
        ],
        [
          { text: '📢 ផ្សាយដំណឹង (Broadcast)', callback_data: 'admin_broadcast_prompt' },
          { text: '📊 ស្ថិតិហាង (Analytics)', callback_data: 'admin_stats' }
        ],
        [adminWebBtn]
      ]
    };

    bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: markup
    });
  }

  // -------------------------------------------------------------
  // Callback Query Handler
  // -------------------------------------------------------------
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (!isAdmin(userId) && (data.startsWith('admin_') || data.startsWith('reseller_'))) {
      return bot.answerCallbackQuery(query.id, { text: 'Admin only!', show_alert: true });
    }

    // Handle Admin Group Reseller Approval
    if (data.startsWith('reseller_accept_')) {
      const targetUserId = data.replace('reseller_accept_', '');
      const updatedUser = db.setResellerStatus(targetUserId, 'approved');
      const adminName = query.from.first_name || 'Admin';

      const updatedGroupMsg = `
👑 <b>សំណើសុំធ្វើជា RESELLER — បានអនុម័ត! (APPROVED) ✅</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>អតិថិជន៖</b> ${updatedUser.firstName || 'Customer'} ${updatedUser.lastName || ''}
🆔 <b>Telegram ID៖</b> <code>${targetUserId}</code>
🔗 <b>Username៖</b> ${updatedUser.username ? '@' + updatedUser.username : 'គ្មាន'}
✅ <b>ស្ថានភាព៖</b> បានក្លាយជា VIP Reseller រួចរាល់!
👨‍💻 <b>អនុម័តដោយ Admin៖</b> ${adminName}
📅 <b>កាលបរិច្ឆេទ៖</b> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' })}
━━━━━━━━━━━━━━━━━━━━━
⚡ <b>AstorrIOS STORE — Reseller System</b>
      `;

      try {
        await bot.editMessageText(updatedGroupMsg, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'HTML'
        });
      } catch (err) {
        console.error('Error updating group message for reseller accept:', err.message);
      }

      // Send direct notification to User on Telegram
      try {
        const userNotice = `
🎉 <b>អបអរសាទរ! សំណើ Reseller របស់អ្នកត្រូវបានអនុម័ត! (APPROVED)</b>
━━━━━━━━━━━━━━━━━━━━━
🌟 គណនីរបស់អ្នកត្រូវបានដំឡើងជា <b>VIP Reseller</b> ផ្លូវការហើយ!
💎 ចាប់ពីពេលនេះទៅ អ្នកនឹងទទួលបានតម្លៃពិសេស (Reseller Price) រាល់មុខទំនិញទាំងអស់ក្នុង AstorrIOS Store!
⚡ រីករាយជាមួយការកុម្ម៉ង់ទំនិញក្នុងតម្លៃទាបបំផុត និងការដឹកជញ្ជូនរហ័ស ២៤/៧!

👇 ចុចប៊ូតុងខាងក្រោមដើម្បីចូលមើលតម្លៃពិសេស Reseller របស់អ្នក៖
        `;

        await bot.sendMessage(targetUserId, userNotice, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 💎 𝐎𝐏𝐄𝐍 𝐒𝐓𝐎𝐑𝐄 (មើលតម្លៃ Reseller) ✨', web_app: { url: WEBAPP_URL } }],
              [{ text: '💬 👑 ទាក់ទង Admin', url: 'https://t.me/Yur1Uchiha' }]
            ]
          }
        });
      } catch (err) {
        console.error('Error sending approval DM to user:', err.message);
      }

      return bot.answerCallbackQuery(query.id, { text: '✅ បានអនុម័តជា Reseller ជោគជ័យ!', show_alert: true });
    }

    // Handle Admin Group Reseller Cancellation
    if (data.startsWith('reseller_reject_')) {
      const targetUserId = data.replace('reseller_reject_', '');
      const updatedUser = db.setResellerStatus(targetUserId, 'rejected');
      const adminName = query.from.first_name || 'Admin';

      const updatedGroupMsg = `
👑 <b>សំណើសុំធ្វើជា RESELLER — បានបដិសេធ (CANCELLED) ❌</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>អតិថិជន៖</b> ${updatedUser.firstName || 'Customer'} ${updatedUser.lastName || ''}
🆔 <b>Telegram ID៖</b> <code>${targetUserId}</code>
🔗 <b>Username៖</b> ${updatedUser.username ? '@' + updatedUser.username : 'គ្មាន'}
❌ <b>ស្ថានភាព៖</b> Admin បាន Cancel/បដិសេធសំណើនេះ។
👨‍💻 <b>ដោយ Admin៖</b> ${adminName}
📅 <b>កាលបរិច្ឆេទ៖</b> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' })}
━━━━━━━━━━━━━━━━━━━━━
⚡ <b>AstorrIOS STORE — Reseller System</b>
      `;

      try {
        await bot.editMessageText(updatedGroupMsg, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'HTML'
        });
      } catch (err) {
        console.error('Error updating group message for reseller reject:', err.message);
      }

      // Send direct notification to User on Telegram
      try {
        const userNotice = `
⚠️ <b>សេចក្តីជូនដំណឹងអំពីសំណើសុំធ្វើជា Reseller</b>
━━━━━━━━━━━━━━━━━━━━━
សួស្តី! Admin បាន Cancel/បដិសេធសំណើសុំធ្វើជា Reseller របស់អ្នកក្នុងពេលនេះ។
💬 ប្រសិនបើអ្នកមានចម្ងល់ ឬចង់សាកសួរលក្ខខណ្ឌបន្ថែម សូមទាក់ទង Admin ដោយផ្ទាល់៖
👉 <b>Admin Contact៖</b> @Yur1Uchiha
        `;

        await bot.sendMessage(targetUserId, userNotice, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💬 👑 ទាក់ទង Admin (@Yur1Uchiha)', url: 'https://t.me/Yur1Uchiha' }],
              [{ text: '🚀 🎮 𝐎𝐏𝐄𝐍 𝐒𝐓𝐎𝐑𝐄 ⚡️ ✨', web_app: { url: WEBAPP_URL } }]
            ]
          }
        });
      } catch (err) {
        console.error('Error sending rejection DM to user:', err.message);
      }

      return bot.answerCallbackQuery(query.id, { text: '❌ បាន Cancel សំណើ Reseller រួចរាល់!', show_alert: true });
    }

    if (data === 'admin_panel') {
      sendAdminDashboard(chatId, userId);
      return bot.answerCallbackQuery(query.id);
    }

    if (data === 'view_reseller_info') {
      const resellerMsg = `╔════════════════════════════════════════╗
  👑 <b>កម្មវិធី VIP RESELLER — AstorrIOS</b> 👑
╚════════════════════════════════════════╝

🌟 <b>អត្ថប្រយោជន៍ពិសេសសម្រាប់សមាជិក Reseller៖</b>
• 💰 <b>តម្លៃបោះដុំពិសេស៖</b> ទទួលបានការបញ្ចុះតម្លៃពិសេស (Reseller Price) លើគ្រប់មុខទំនិញ
• ⚡ <b>ស្វ័យប្រវត្តិ ២៤/៧៖</b> ទទួលបាន License Key និងសេវាកម្មភ្លាមៗ
• 📈 <b>បង្កើនប្រាក់ចំណេញ៖</b> ងាយស្រួលលក់បន្ត និងគ្រប់គ្រងសមតុល្យ

👉 <i>ចុចប៊ូតុងខាងក្រោមដើម្បីចូលហាង និងស្នើសុំសិទ្ធិជា Reseller ដោយឥតគិតថ្លៃ!</i>`;
      bot.sendMessage(chatId, resellerMsg, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 ចូលហាងដើម្បីស្នើសុំ Reseller', web_app: { url: WEBAPP_URL }, style: 'success' }],
            [{ text: '🔙 ត្រឡប់ក្រោយ (Main Menu)', callback_data: 'back_to_main' }]
          ]
        }
      });
      return bot.answerCallbackQuery(query.id);
    }

    if (data === 'back_to_main') {
      const isGroup = query.message.chat.type === 'group' || query.message.chat.type === 'supergroup';
      const firstName = query.from.first_name || '';
      bot.sendMessage(chatId, getMainMenuCaption(firstName), {
        parse_mode: 'HTML',
        reply_markup: getMainMenuKeyboard(isGroup, userId)
      });
      return bot.answerCallbackQuery(query.id);
    }

    if (data === 'admin_add_prod') {
      adminSessions[userId] = {
        action: 'add_product',
        step: 'name',
        data: {}
      };
      bot.sendMessage(chatId, `
📝 <b>ជំហានទី 1/7: ឈ្មោះទំនិញ (Product Name)</b>
━━━━━━━━━━━━━━━━━━━━━
សូមវាយបញ្ចូលឈ្មោះទំនិញ VIP របស់អ្នក៖
<i>ឧទាហរណ៍៖ DRIP WIRE for iOS & Android</i>

(ចុច /cancel ដើម្បីបោះបង់)
      `, { parse_mode: 'HTML' });
      return bot.answerCallbackQuery(query.id);
    }

    if (data === 'admin_list_prod') {
      const products = db.getProducts();
      if (products.length === 0) {
        bot.sendMessage(chatId, '📦 មិនទាន់មានទំនិញក្នុងស្តុកនៅឡើយទេ');
        return bot.answerCallbackQuery(query.id);
      }

      let text = `📦 <b>បញ្ជីទំនិញទាំងអស់ (${products.length}):</b>\n━━━━━━━━━━━━━━━━━━━━━\n`;
      const buttons = [];

      products.forEach((p, index) => {
        const stock = Array.isArray(p.keys) ? p.keys.length : 0;
        text += `${index + 1}. <b>${p.name}</b>\n   💵 តម្លៃ: $${p.price.toFixed(2)} | ស្តុក: ${stock} keys\n\n`;
        buttons.push([
          { text: `🔑 ថែម Key: ${p.name.substring(0, 18)}...`, callback_data: `admin_add_keys_${p.id}` },
          { text: `❌ លុប`, callback_data: `admin_del_prod_${p.id}` }
        ]);
      });

      buttons.push([{ text: '🔙 ត្រឡប់ក្រោយ (Back)', callback_data: 'admin_panel' }]);

      bot.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
      });
      return bot.answerCallbackQuery(query.id);
    }

    if (data.startsWith('admin_add_keys_')) {
      const prodId = data.replace('admin_add_keys_', '');
      const prod = db.getProductById(prodId);
      if (!prod) return bot.answerCallbackQuery(query.id, { text: 'Product not found', show_alert: true });

      adminSessions[userId] = {
        action: 'add_keys',
        productId: prodId
      };

      bot.sendMessage(chatId, `
🔑 <b>បន្ថែម License Keys សម្រាប់៖ ${prod.name}</b>
━━━━━━━━━━━━━━━━━━━━━
សូមផ្ញើ License Keys ដោយចុះបន្ទាត់មួយ Key មួយបន្ទាត់៖
<i>ឧទាហរណ៍៖
KEY-ASTORR-1234
KEY-ASTORR-5678
KEY-ASTORR-9999</i>

(ចុច /cancel ដើម្បីបោះបង់)
      `, { parse_mode: 'HTML' });
      return bot.answerCallbackQuery(query.id);
    }

    if (data.startsWith('admin_del_prod_')) {
      const prodId = data.replace('admin_del_prod_', '');
      db.deleteProduct(prodId);
      bot.sendMessage(chatId, `✅ បានលុបទំនិញជោគជ័យ!`);
      return bot.answerCallbackQuery(query.id, { text: 'Deleted' });
    }

    if (data === 'admin_broadcast_prompt') {
      adminSessions[userId] = { action: 'broadcast' };
      bot.sendMessage(chatId, `
📢 <b>ផ្សាយដំណឹង (Broadcast Announcement)</b>
━━━━━━━━━━━━━━━━━━━━━
សូមផ្ញើសារ ឬរូបភាពដែលចង់ផ្សាយទៅកាន់អ្នកប្រើប្រាស់ទាំងអស់ដែលបានចុច Start ក្នុង Bot៖
<i>(អាចប្រើប្រាស់អក្សរ HTML/Markdown បាន)</i>

(ចុច /cancel ដើម្បីបោះបង់)
      `, { parse_mode: 'HTML' });
      return bot.answerCallbackQuery(query.id);
    }

    if (data === 'admin_stats') {
      const stats = db.getStats();
      bot.sendMessage(chatId, `
📊 <b>ស្ថិតិហាង AstorrIOS STORE</b>
━━━━━━━━━━━━━━━━━━━━━
👥 សមាជិកសរុប៖ <b>${stats.totalUsers}</b>
📦 មុខទំនិញ៖ <b>${stats.totalProducts}</b>
🛒 ការទិញបានសម្រេច៖ <b>${stats.paidOrders} / ${stats.totalOrders}</b>
💰 ចំណូលសរុប៖ <b>$${stats.totalRevenue.toFixed(2)} USD</b>
      `, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 ត្រឡប់ក្រោយ (Back)', callback_data: 'admin_panel' }]]
        }
      });
      return bot.answerCallbackQuery(query.id);
    }
  });

  // -------------------------------------------------------------
  // Text Message Handler (for Admin step-by-step product wizard & broadcast)
  // -------------------------------------------------------------
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!text && !msg.photo) return;
    if (text === '/cancel') {
      if (adminSessions[userId]) {
        delete adminSessions[userId];
        return bot.sendMessage(chatId, '🚫 បានបោះបង់ប្រតិបត្តិការ!');
      }
    }

    const session = adminSessions[userId];
    if (!session) return;

    // Broadcast session
    if (session.action === 'broadcast') {
      delete adminSessions[userId];
      if (msg.photo && msg.photo.length > 0) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const caption = msg.caption || '';
        executeBroadcastPhoto(chatId, photoId, caption);
      } else {
        executeBroadcast(chatId, text);
      }
      return;
    }

    // Add keys session
    if (session.action === 'add_keys') {
      const newKeys = text.split('\n').map(k => k.trim()).filter(Boolean);
      db.addKeysToProduct(session.productId, newKeys);
      delete adminSessions[userId];
      return bot.sendMessage(chatId, `✅ បានបញ្ចូល ${newKeys.length} keys ទៅក្នុងទំនិញជោគជ័យ!`);
    }

    // Add product wizard
    if (session.action === 'add_product') {
      const step = session.step;

      if (step === 'name') {
        session.data.name = text;
        session.step = 'category';
        return bot.sendMessage(chatId, `
🏷️ <b>ជំហានទី 2/7: ប្រភេទ និង Platform (Category & Platform)</b>
━━━━━━━━━━━━━━━━━━━━━
សូមវាយបញ្ចូលប្រភេទ៖
<i>ឧទាហរណ៍៖ VIP MOD | iOS & Android (ឬ VIP MOD, E-SIGN, VPN FREE, AIM HACK)</i>
        `, { parse_mode: 'HTML' });
      }

      if (step === 'category') {
        const parts = text.split('|').map(s => s.trim());
        session.data.category = parts[0] || 'VIP MOD';
        session.data.platform = parts[1] || 'iOS & Android';
        session.step = 'price';
        return bot.sendMessage(chatId, `
💵 <b>ជំហានទី 3/7: តម្លៃទំនិញ (Price USD)</b>
━━━━━━━━━━━━━━━━━━━━━
សូមវាយបញ្ចូលតម្លៃជាដុល្លារ៖
<i>ឧទាហរណ៍៖ 0.99 ឬ 3.00</i>
        `, { parse_mode: 'HTML' });
      }

      if (step === 'price') {
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) {
          return bot.sendMessage(chatId, '❌ សូមវាយតម្លៃជាលេខឱ្យត្រឹមត្រូវ (ឧទាហរណ៍: 1.50)៖');
        }
        session.data.price = price;
        session.step = 'description';
        return bot.sendMessage(chatId, `
📄 <b>ជំហានទី 4/7: ការពិពណ៌នា (Description)</b>
━━━━━━━━━━━━━━━━━━━━━
សូមវាយបញ្ចូលលក្ខណៈពិសេស ឬព័ត៌មានលម្អិតនៃទំនិញ៖
<i>ឧទាហរណ៍៖ VIP Anti-Ban 100%, Auto Headshot, 120 FPS</i>
        `, { parse_mode: 'HTML' });
      }

      if (step === 'description') {
        session.data.description = text;
        session.step = 'groupLink';
        return bot.sendMessage(chatId, `
👥 <b>ជំហានទី 5/7: តំណភ្ជាប់គ្រុប VIP (Group Link)</b>
━━━━━━━━━━━━━━━━━━━━━
សូមផ្ញើតំណភ្ជាប់ Telegram VIP Group សម្រាប់អ្នកទិញ៖
<i>ឧទាហរណ៍៖ https://t.me/+AstorrIOS_VIP_Group</i>
        `, { parse_mode: 'HTML' });
      }

      if (step === 'groupLink') {
        session.data.groupLink = text;
        session.step = 'image';
        return bot.sendMessage(chatId, `
🖼️ <b>ជំហានទី 6/7: រូបភាពទំនិញ (Logo / Image)</b>
━━━━━━━━━━━━━━━━━━━━━
សូមផ្ញើរូបភាព (Send Photo) ឬវាយបញ្ចូល Image URL៖
(បើចង់យករូប Logo ដើម សូមវាយ <b>default</b>)
        `, { parse_mode: 'HTML' });
      }

      if (step === 'image') {
        let imageUrl = '/assets/logo.jpg';
        if (msg.photo && msg.photo.length > 0) {
          try {
            const fileId = msg.photo[msg.photo.length - 1].file_id;
            const fileLink = await bot.getFileLink(fileId);
            imageUrl = fileLink;
          } catch (e) {
            imageUrl = '/assets/logo.jpg';
          }
        } else if (text && text.toLowerCase() !== 'default') {
          imageUrl = text;
        }
        session.data.image = imageUrl;
        session.step = 'keys';

        return bot.sendMessage(chatId, `
🔑 <b>ជំហានទី 7/7: License Keys (ស្តុកទំនិញ)</b>
━━━━━━━━━━━━━━━━━━━━━
សូមផ្ញើ License Keys ដែលត្រូវប្រគល់ជូនអតិថិជន (មួយបន្ទាត់មួយ Key)៖
<i>ឬវាយពាក្យ <b>GENERATE</b> ប្រសិនបើចង់ឱ្យប្រព័ន្ធបង្កើត Key ស្វ័យប្រវត្តិ។</i>
        `, { parse_mode: 'HTML' });
      }

      if (step === 'keys') {
        let keys = [];
        if (text.toUpperCase() === 'GENERATE') {
          keys = [
            `ASTORR-KEY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            `ASTORR-KEY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          ];
        } else {
          keys = text.split('\n').map(k => k.trim()).filter(Boolean);
        }

        const newProduct = db.addProduct({
          name: session.data.name,
          category: session.data.category,
          platform: session.data.platform,
          price: session.data.price,
          description: session.data.description,
          groupLink: session.data.groupLink,
          image: session.data.image,
          keys: keys
        });

        delete adminSessions[userId];

        bot.sendMessage(chatId, `
🎉 <b>បានបង្កើតទំនិញជោគជ័យ! (PRODUCT CREATED!)</b>
━━━━━━━━━━━━━━━━━━━━━
📦 <b>ឈ្មោះ៖</b> ${newProduct.name}
🏷️ <b>ប្រភេទ៖</b> ${newProduct.category} (${newProduct.platform})
💵 <b>តម្លៃ៖</b> $${newProduct.price.toFixed(2)} USD
🔑 <b>ចំនួនស្តុក Keys៖</b> ${keys.length} keys
👥 <b>VIP Group៖</b> ${newProduct.groupLink}
━━━━━━━━━━━━━━━━━━━━━
✨ ឥឡូវនេះទំនិញនេះកំពុងបង្ហាញផ្ទាល់នៅលើ <b>AstorrIOS Mini App</b> សម្រាប់អតិថិជនទាំងអស់!
        `, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                chatId < 0
                  ? { text: '🎮 បើកមើលក្នុង STORE', url: `https://t.me/${process.env.BOT_USERNAME || 'AstorrIOS_bot'}` }
                  : { text: '🎮 បើកមើលក្នុង STORE', web_app: { url: WEBAPP_URL } }
              ],
              [{ text: '👑 ត្រឡប់ទៅ Admin Panel', callback_data: 'admin_panel' }]
            ]
          }
        });
      }
    }
  });

  // -------------------------------------------------------------
  // Helper: Broadcast Functions
  // -------------------------------------------------------------
  async function executeBroadcast(adminChatId, broadcastMessage) {
    const allUsers = db.getAllUsers();
    bot.sendMessage(adminChatId, `⏳ កំពុងផ្សាយដំណឹងទៅកាន់អ្នកប្រើប្រាស់ចំនួន ${allUsers.length} នាក់...`);

    let sent = 0;
    let failed = 0;

    for (const u of allUsers) {
      try {
        await bot.sendMessage(u.id, `📢 <b>AstorrIOS STORE — សេចក្តីជូនដំណឹង</b>\n━━━━━━━━━━━━━━━━━━━━━\n${broadcastMessage}`, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: '🚀 🎮 𝐎𝐏𝐄𝐍 𝐒𝐓𝐎𝐑𝐄 ⚡️ ✨', web_app: { url: WEBAPP_URL } }]]
          }
        });
        sent++;
      } catch (e) {
        failed++;
      }
    }

    bot.sendMessage(adminChatId, `
✅ <b>ការផ្សាយដំណឹងបានបញ្ចប់! (Broadcast Completed)</b>
━━━━━━━━━━━━━━━━━━━━━
📤 បានផ្ញើជោគជ័យ៖ <b>${sent}</b> នាក់
⚠️ មិនជោគជ័យ (Blocked/Error)៖ <b>${failed}</b> នាក់
    `, { parse_mode: 'HTML' });
  }

  async function executeBroadcastPhoto(adminChatId, photoId, caption) {
    const allUsers = db.getAllUsers();
    bot.sendMessage(adminChatId, `⏳ កំពុងផ្សាយដំណឹងជាមួយរូបភាពទៅកាន់ ${allUsers.length} នាក់...`);

    let sent = 0;
    let failed = 0;

    for (const u of allUsers) {
      try {
        await bot.sendPhoto(u.id, photoId, {
          caption: `📢 <b>AstorrIOS STORE</b>\n━━━━━━━━━━━━━━━━━━━━━\n${caption}`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: '🚀 🎮 𝐎𝐏𝐄𝐍 𝐒𝐓𝐎𝐑𝐄 ⚡️ ✨', web_app: { url: WEBAPP_URL } }]]
          }
        });
        sent++;
      } catch (e) {
        failed++;
      }
    }

    bot.sendMessage(adminChatId, `
✅ <b>ការផ្សាយដំណឹងបានបញ្ចប់! (Broadcast Completed)</b>
━━━━━━━━━━━━━━━━━━━━━
📤 បានផ្ញើជោគជ័យ៖ <b>${sent}</b> នាក់
⚠️ មិនជោគជ័យ៖ <b>${failed}</b> នាក់
    `, { parse_mode: 'HTML' });
  }

  return bot;
}

module.exports = { initBot };

if (require.main === module) {
  initBot();
}
