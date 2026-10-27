require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');
const db = require('./data/db');
const { tgEmoji, stripTgEmoji, makeBtn } = require('./config/emojis');

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
  function getAnimatedCaption() {
    return `<b>AstorrIOS STORE ${tgEmoji('game')}</b>\nសេវាកម្មលឿនរហ័សទាន់ចិត្ត & ទិញស្វ័យប្រវត្តិ ២៤/៧\n\n${tgEmoji('sparkle')} <b>Welcome to AstorrIOS!</b>\n• ${tgEmoji('lightning')} <b>ទិញភ្លាមបានភ្លាម</b> (instant Service)\n• ${tgEmoji('shield')} <b>សុវត្ថិភាពខ្ពស់ 100%</b>\n• ${tgEmoji('card')} <b>ទូទាត់រហ័សតាម KHQR</b> (ABA, Bakong & គ្រប់ធនាគារ)\n\n${tgEmoji('down')} ចុចប៊ូតុង <b>OPEN STORE</b> ខាងក្រោមដើម្បីចូលទិញទំនិញ៖`;
  }

  // Standard Fallback Caption (Clean without tg-emoji)
  function getStandardCaption() {
    return `<b>AstorrIOS STORE 🎮</b>\nសេវាកម្មលឿនរហ័សទាន់ចិត្ត & ទិញស្វ័យប្រវត្តិ ២៤/៧\n\n✨ <b>Welcome to AstorrIOS!</b>\n• ⚡️ <b>ទិញភ្លាមបានភ្លាម</b> (instant Service)\n• 🛡️ <b>សុវត្ថិភាពខ្ពស់ 100%</b>\n• 💳 <b>ទូទាត់រហ័សតាម KHQR</b> (ABA, Bakong & គ្រប់ធនាគារ)\n\n👇 ចុចប៊ូតុង <b>OPEN STORE</b> ខាងក្រោមដើម្បីចូលទិញទំនិញ៖`;
  }

  function getStartKeyboard(isGroup, userId) {
    const keyboard = [
      [
        isGroup
          ? makeBtn('OPEN STORE', { url: `https://t.me/${process.env.BOT_USERNAME || 'AstorrIOS_bot'}` }, 'success', 'game')
          : makeBtn('OPEN STORE', { web_app: { url: WEBAPP_URL } }, 'success', 'game')
      ],
      [
        makeBtn('CONTACT ADMIN', { url: 'https://t.me/AstorrIOS' }, 'primary', 'support')
      ]
    ];

    if (isAdmin(userId)) {
      keyboard.push([
        makeBtn('ADMIN CONTROL PANEL', { callback_data: 'admin_panel' }, 'primary', 'gear')
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
            [makeBtn('OPEN STORE', { web_app: { url: WEBAPP_URL } }, 'success', 'game')]
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
    executeBroadcastText(chatId, textToBroadcast);
  });

  // -------------------------------------------------------------
  // Admin Dashboard Interface
  // -------------------------------------------------------------
  function sendAdminDashboard(chatId, userId) {
    const stats = db.getStats();
    const isGroup = chatId < 0;
    const text = `
${tgEmoji('crown')} <b>AstorrIOS — ADMIN CONTROL CENTER</b>
━━━━━━━━━━━━━━━━━━━━━
${tgEmoji('users')} <b>អតិថិជនសរុប (Users):</b> ${stats.totalUsers} នាក់
${tgEmoji('box')} <b>ទំនិញក្នុងស្តុក (Products):</b> ${stats.totalProducts} មុខ
${tgEmoji('chart')} <b>ការកុម្ម៉ង់សរុប (Orders):</b> ${stats.totalOrders}
${tgEmoji('money')} <b>ចំណូលសរុប (Revenue):</b> $${stats.totalRevenue.toFixed(2)} USD
━━━━━━━━━━━━━━━━━━━━━
សូមជ្រើសរើសមុខងារខាងក្រោម៖
    `;

    const adminWebBtn = isGroup
      ? makeBtn('បើក Admin WebApp', { url: `https://t.me/${process.env.BOT_USERNAME || 'AstorrIOS_bot'}?start=admin` }, 'primary', 'rocket')
      : makeBtn('បើក Admin WebApp', { web_app: { url: `${WEBAPP_URL}?admin=true` } }, 'primary', 'rocket');

    const markup = {
      inline_keyboard: [
        [
          makeBtn('បន្ថែមទំនិញថ្មី (Add Product)', { callback_data: 'admin_add_prod' }, 'success', 'sparkle'),
          makeBtn('បញ្ជីទំនិញ (Manage Products)', { callback_data: 'admin_list_prod' }, 'primary', 'box')
        ],
        [
          makeBtn('ផ្សាយដំណឹង (Broadcast)', { callback_data: 'admin_broadcast_prompt' }, 'primary', 'bell'),
          makeBtn('ស្ថិតិហាង (Analytics)', { callback_data: 'admin_stats' }, 'primary', 'chart')
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
${tgEmoji('party')} <b>អបអរសាទរ! សំណើ Reseller របស់អ្នកត្រូវបានអនុម័ត! (APPROVED)</b>
━━━━━━━━━━━━━━━━━━━━━
${tgEmoji('crown')} គណនីរបស់អ្នកត្រូវបានដំឡើងជា <b>VIP Reseller</b> ផ្លូវការហើយ!
${tgEmoji('diamond')} ចាប់ពីពេលនេះទៅ អ្នកនឹងទទួលបានតម្លៃពិសេស (Reseller Price) រាល់មុខទំនិញទាំងអស់ក្នុង AstorrIOS Store!
${tgEmoji('lightning')} រីករាយជាមួយការកុម្ម៉ង់ទំនិញក្នុងតម្លៃទាបបំផុត និងការដឹកជញ្ជូនរហ័ស ២៤/៧!

${tgEmoji('down')} ចុចប៊ូតុងខាងក្រោមដើម្បីចូលមើលតម្លៃពិសេស Reseller របស់អ្នក៖
        `;

        await bot.sendMessage(targetUserId, userNotice, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [makeBtn('OPEN STORE (មើលតម្លៃ Reseller)', { web_app: { url: WEBAPP_URL } }, 'success', 'diamond')],
              [makeBtn('ទាក់ទង Admin (@AstorrIOS)', { url: 'https://t.me/AstorrIOS' }, 'primary', 'support')]
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
${tgEmoji('crown')} <b>សំណើសុំធ្វើជា RESELLER — បានបដិសេធ (CANCELLED) ❌</b>
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
${tgEmoji('alert')} <b>សេចក្តីជូនដំណឹងអំពីសំណើសុំធ្វើជា Reseller</b>
━━━━━━━━━━━━━━━━━━━━━
សួស្តី! Admin បាន Cancel/បដិសេធសំណើសុំធ្វើជា Reseller របស់អ្នកក្នុងពេលនេះ។
${tgEmoji('support')} ប្រសិនបើអ្នកមានចម្ងល់ ឬចង់សាកសួរលក្ខខណ្ឌបន្ថែម សូមទាក់ទង Admin ដោយផ្ទាល់៖
👉 <b>Admin Contact៖</b> @AstorrIOS
        `;

        await bot.sendMessage(targetUserId, userNotice, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [makeBtn('ទាក់ទង Admin (@AstorrIOS)', { url: 'https://t.me/AstorrIOS' }, 'primary', 'support')],
              [makeBtn('OPEN STORE', { web_app: { url: WEBAPP_URL } }, 'success', 'game')]
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
  ${tgEmoji('crown')} <b>កម្មវិធី VIP RESELLER — AstorrIOS</b> ${tgEmoji('crown')}
╚════════════════════════════════════════╝

${tgEmoji('sparkle')} <b>អត្ថប្រយោជន៍ពិសេសសម្រាប់សមាជិក Reseller៖</b>
• ${tgEmoji('money')} <b>តម្លៃបោះដុំពិសេស៖</b> ទទួលបានការបញ្ចុះតម្លៃពិសេស (Reseller Price) លើគ្រប់មុខទំនិញ
• ${tgEmoji('lightning')} <b>ស្វ័យប្រវត្តិ ២៤/៧៖</b> ទទួលបាន License Key និងសេវាកម្មភ្លាមៗ
• ${tgEmoji('chart')} <b>បង្កើនប្រាក់ចំណេញ៖</b> ងាយស្រួលលក់បន្ត និងគ្រប់គ្រងសមតុល្យ

👉 <i>ចុចប៊ូតុងខាងក្រោមដើម្បីចូលហាង និងស្នើសុំសិទ្ធិជា Reseller ដោយឥតគិតថ្លៃ!</i>`;
      bot.sendMessage(chatId, resellerMsg, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [makeBtn('ចូលហាងដើម្បីស្នើសុំ Reseller', { web_app: { url: WEBAPP_URL } }, 'success', 'crown')],
            [makeBtn('ត្រឡប់ក្រោយ (Main Menu)', { callback_data: 'back_to_main' }, 'primary', 'pointer')]
          ]
        }
      });
      return bot.answerCallbackQuery(query.id);
    }

    if (data === 'back_to_main') {
      const isGroup = query.message.chat.type === 'group' || query.message.chat.type === 'supergroup';
      bot.sendMessage(chatId, getAnimatedCaption(), {
        parse_mode: 'HTML',
        reply_markup: getStartKeyboard(isGroup, userId)
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
          makeBtn(`ថែម Key: ${p.name.substring(0, 18)}...`, { callback_data: `admin_add_keys_${p.id}` }, 'primary', 'key'),
          makeBtn(`លុប`, { callback_data: `admin_del_prod_${p.id}` }, 'danger')
        ]);
      });

      buttons.push([makeBtn('ត្រឡប់ក្រោយ (Back)', { callback_data: 'admin_panel' }, 'primary', 'pointer')]);

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
សូមផ្ញើសារដែលអ្នកចង់ផ្សាយទៅកាន់អ្នកប្រើប្រាស់ទាំងអស់៖
• <b>សារអក្សរ (Text)</b>
• <b>រូបភាព (Photo)</b>
• <b>សារសំឡេង (Voice Note 🎤)</b>
• <b>ឯកសារសំឡេង (Audio File 🎧)</b>

<i>(អាចភ្ជាប់ Caption អក្សរ HTML/Markdown ជាមួយរូបភាព ឬសារសំឡេងបាន)</i>

(ចុច /cancel ដើម្បីបោះបង់)
      `, { parse_mode: 'HTML' });
      return bot.answerCallbackQuery(query.id);
    }

    if (data === 'admin_stats') {
      const stats = db.getStats();
      bot.sendMessage(chatId, `
${tgEmoji('chart')} <b>ស្ថិតិហាង AstorrIOS STORE</b>
━━━━━━━━━━━━━━━━━━━━━
${tgEmoji('users')} សមាជិកសរុប៖ <b>${stats.totalUsers}</b>
${tgEmoji('box')} មុខទំនិញ៖ <b>${stats.totalProducts}</b>
${tgEmoji('verified')} ការទិញបានសម្រេច៖ <b>${stats.paidOrders} / ${stats.totalOrders}</b>
${tgEmoji('money')} ចំណូលសរុប៖ <b>$${stats.totalRevenue.toFixed(2)} USD</b>
      `, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[makeBtn('ត្រឡប់ក្រោយ (Back)', { callback_data: 'admin_panel' }, 'primary', 'pointer')]]
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
    const userId = msg.from?.id;
    const text = msg.text;

    // Track user in database whenever they interact with the bot in private chat
    if (userId && msg.chat.type === 'private') {
      db.saveUser({
        id: userId,
        username: msg.from.username || '',
        firstName: msg.from.first_name || '',
        lastName: msg.from.last_name || ''
      });
    }

    if (!text && !msg.photo && !msg.voice && !msg.audio) return;
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
      if (msg.voice) {
        executeBroadcastVoice(chatId, msg.voice.file_id, msg.caption);
      } else if (msg.audio) {
        executeBroadcastAudio(chatId, msg.audio.file_id, msg.caption);
      } else if (msg.photo && msg.photo.length > 0) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const caption = msg.caption || '';
        executeBroadcastPhoto(chatId, photoId, caption);
      } else if (text) {
        executeBroadcastText(chatId, text);
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
                  ? makeBtn('បើកមើលក្នុង STORE', { url: `https://t.me/${process.env.BOT_USERNAME || 'AstorrIOS_bot'}` }, 'success', 'game')
                  : makeBtn('បើកមើលក្នុង STORE', { web_app: { url: WEBAPP_URL } }, 'success', 'game')
              ],
              [makeBtn('ត្រឡប់ទៅ Admin Panel', { callback_data: 'admin_panel' }, 'primary', 'gear')]
            ]
          }
        });
      }
    }
  });

  // -------------------------------------------------------------
  // Resilient Multi-User Broadcast Helper
  // Handles 40ms throttling, 429 flood wait retries, and 403 blocked users
  // -------------------------------------------------------------
  async function broadcastToAllUsers(adminChatId, sendUserFn, mediaTitle = 'សារ') {
    const allUsers = db.getAllUsers();
    await bot.sendMessage(adminChatId, `⏳ <b>កំពុងចាប់ផ្តើមផ្សាយ${mediaTitle}ទៅកាន់អ្នកប្រើប្រាស់ ${allUsers.length} នាក់...</b>\n<i>(ដំណើរការជាមួយ Throttling & Anti-Block Rate Limiter)</i>`, { parse_mode: 'HTML' });

    let sent = 0;
    let blocked = 0;
    let failed = 0;

    for (let i = 0; i < allUsers.length; i++) {
      const u = allUsers[i];
      if (!u || !u.id) continue;

      let attempts = 0;
      let success = false;

      while (attempts < 3 && !success) {
        attempts++;
        try {
          await sendUserFn(u.id);
          sent++;
          success = true;
        } catch (err) {
          const errMsg = String(err?.message || err);

          // 1. User blocked the bot or account deactivated: count as blocked, do NOT halt or retry
          if (errMsg.includes('blocked') || errMsg.includes('deactivated') || errMsg.includes('chat not found') || err?.response?.statusCode === 403) {
            blocked++;
            success = true; // Mark done for this user and continue
            break;
          }

          // 2. Telegram Rate Limit (429 FLOOD_WAIT): wait required time and retry
          if (errMsg.includes('429') || errMsg.includes('retry after') || err?.response?.statusCode === 429) {
            const match = errMsg.match(/retry after (\d+)/i);
            const waitSec = match ? parseInt(match[1], 10) : (err?.response?.body?.parameters?.retry_after || 3);
            console.warn(`[Broadcast] Rate limit 429 hit. Waiting ${waitSec}s before retrying user ${u.id}...`);
            await new Promise(r => setTimeout(r, (waitSec + 1) * 1000));
            continue;
          }

          // 3. Other network error: backoff briefly and retry
          if (attempts < 3) {
            await new Promise(r => setTimeout(r, 600));
          } else {
            failed++;
            console.error(`[Broadcast] Error sending to user ${u.id}:`, errMsg);
          }
        }
      }

      // Safe pause between users (~25 messages/sec)
      await new Promise(r => setTimeout(r, 40));
    }

    const summaryMsg = `
${tgEmoji('verified')} <b>ការផ្សាយដំណឹងបានបញ្ចប់ជោគជ័យ!</b>
━━━━━━━━━━━━━━━━━━━━━
${tgEmoji('users')} <b>អ្នកទទួលសរុប (Total Users):</b> ${allUsers.length} នាក់
${tgEmoji('sparkle')} <b>បានផ្ញើជោគជ័យ (Sent):</b> ${sent} នាក់
${tgEmoji('alert')} <b>បាន Block Bot (Blocked):</b> ${blocked} នាក់
${tgEmoji('chart')} <b>បរាជ័យផ្សេងៗ (Failed):</b> ${failed} នាក់
━━━━━━━━━━━━━━━━━━━━━
⚡ <i>AstorrIOS STORE — High Performance Broadcast Engine</i>
    `;

    await bot.sendMessage(adminChatId, summaryMsg, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [makeBtn('ADMIN CONTROL PANEL', { callback_data: 'admin_panel' }, 'primary', 'gear')]
        ]
      }
    });

    return { total: allUsers.length, sent, blocked, failed };
  }

  // 1. Text Broadcast
  async function executeBroadcastText(adminChatId, broadcastMessage) {
    const markup = {
      inline_keyboard: [
        [makeBtn('OPEN STORE', { web_app: { url: WEBAPP_URL } }, 'success', 'game')]
      ]
    };
    const caption = `📢 <b>AstorrIOS STORE — សេចក្តីជូនដំណឹង</b>\n━━━━━━━━━━━━━━━━━━━━━\n${broadcastMessage}`;
    return await broadcastToAllUsers(adminChatId, (userId) => {
      return bot.sendMessage(userId, caption, {
        parse_mode: 'HTML',
        reply_markup: markup
      });
    }, 'សារអក្សរ');
  }

  // 2. Photo Broadcast
  async function executeBroadcastPhoto(adminChatId, photoId, caption) {
    const markup = {
      inline_keyboard: [
        [makeBtn('OPEN STORE', { web_app: { url: WEBAPP_URL } }, 'success', 'game')]
      ]
    };
    const photoCaption = caption
      ? `📢 <b>AstorrIOS STORE</b>\n━━━━━━━━━━━━━━━━━━━━━\n${caption}`
      : `📢 <b>AstorrIOS STORE — សេចក្តីជូនដំណឹង</b>`;
    return await broadcastToAllUsers(adminChatId, (userId) => {
      return bot.sendPhoto(userId, photoId, {
        caption: photoCaption,
        parse_mode: 'HTML',
        reply_markup: markup
      });
    }, 'រូបភាព Banner');
  }

  // 3. Voice Note Broadcast
  async function executeBroadcastVoice(adminChatId, voiceId, caption) {
    const markup = {
      inline_keyboard: [
        [makeBtn('OPEN STORE', { web_app: { url: WEBAPP_URL } }, 'success', 'game')]
      ]
    };
    const voiceCaption = caption
      ? `🎤 <b>សារសំឡេងពី AstorrIOS STORE</b>\n━━━━━━━━━━━━━━━━━━━━━\n${caption}`
      : `🎤 <b>សារសំឡេងពី AstorrIOS STORE</b>`;
    return await broadcastToAllUsers(adminChatId, (userId) => {
      return bot.sendVoice(userId, voiceId, {
        caption: voiceCaption,
        parse_mode: 'HTML',
        reply_markup: markup
      });
    }, 'សារសំឡេង (Voice Note)');
  }

  // 4. Audio File Broadcast
  async function executeBroadcastAudio(adminChatId, audioId, caption) {
    const markup = {
      inline_keyboard: [
        [makeBtn('OPEN STORE', { web_app: { url: WEBAPP_URL } }, 'success', 'game')]
      ]
    };
    const audioCaption = caption
      ? `🎧 <b>ឯកសារសំឡេងពី AstorrIOS STORE</b>\n━━━━━━━━━━━━━━━━━━━━━\n${caption}`
      : `🎧 <b>ឯកសារសំឡេងពី AstorrIOS STORE</b>`;
    return await broadcastToAllUsers(adminChatId, (userId) => {
      return bot.sendAudio(userId, audioId, {
        caption: audioCaption,
        parse_mode: 'HTML',
        reply_markup: markup
      });
    }, 'ឯកសារសំឡេង (Audio)');
  }

  return bot;
}

module.exports = { initBot };

if (require.main === module) {
  initBot();
}
