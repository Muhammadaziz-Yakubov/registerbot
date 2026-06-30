const TelegramBot = require("node-telegram-bot-api");

// ===================== SOZLAMALAR =====================
const BOT_TOKEN = "8905030193:AAFBK1wcLFYOz5gKvlGE5suLUvuK4qqzgnE";
const CHANNEL_USERNAME = "@yakubovdev"; // Majburiy obuna kanali
const GROUP_ID = -5167494877; // Ma'lumotlar yuboriladigan guruh
// ======================================================

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Foydalanuvchilar holati saqlanadi
const userState = {};

// ===================== OBUNANI TEKSHIRISH =====================
async function checkSubscription(userId) {
  try {
    const member = await bot.getChatMember(CHANNEL_USERNAME, userId);
    const status = member.status;
    return ["member", "administrator", "creator"].includes(status);
  } catch (err) {
    console.error("Obunani tekshirishda xatolik:", err.message);
    return false;
  }
}

// ===================== /start BUYRUG'I =====================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const isSubscribed = await checkSubscription(userId);

  if (!isSubscribed) {
    // Obuna bo'lmagan bo'lsa
    await bot.sendMessage(
      chatId,
      `👋 Salom! Botdan foydalanish uchun avval quyidagi kanalga obuna bo'ling:\n\n📢 <b>@yakubovdev</b>\n\nObuna bo'lgandan so'ng, <b>✅ Tekshirish</b> tugmasini bosing.`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📢 Kanalga o'tish",
                url: "https://t.me/yakubovdev",
              },
            ],
            [
              {
                text: "✅ Tekshirish",
                callback_data: "check_subscription",
              },
            ],
          ],
        },
      }
    );
  } else {
    // Obuna bo'lgan bo'lsa — ro'yxatdan o'tishni boshlash
    startRegistration(chatId, userId);
  }
});

// ===================== CALLBACK QUERY (Tekshirish tugmasi) =====================
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  if (data === "check_subscription") {
    const isSubscribed = await checkSubscription(userId);

    if (!isSubscribed) {
      await bot.answerCallbackQuery(query.id, {
        text: "❌ Siz hali kanalga obuna bo'lmagansiz! Iltimos, avval obuna bo'ling.",
        show_alert: true,
      });
    } else {
      await bot.answerCallbackQuery(query.id, {
        text: "✅ Obuna tasdiqlandi!",
      });

      // Eski xabarni o'chirish
      try {
        await bot.deleteMessage(chatId, query.message.message_id);
      } catch (e) {}

      startRegistration(chatId, userId);
    }
  }
});

// ===================== RO'YXATDAN O'TISHNI BOSHLASH =====================
function startRegistration(chatId, userId) {
  userState[userId] = { step: "name" };

  bot.sendMessage(
    chatId,
    `✅ Ajoyib! Kanalga obuna bo'lgansiz!\n\n📝 Endi ro'yxatdan o'tamiz.\n\n👤 <b>Ism va Familiyangizni</b> kiriting:\n<i>(Masalan: Aziz Karimov)</i>`,
    { parse_mode: "HTML" }
  );
}

// ===================== XABARLARNI QAYTA ISHLASH =====================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  // /start komandasini e'tiborsiz qoldirish
  if (!text || text.startsWith("/")) return;

  const state = userState[userId];
  if (!state) return;

  switch (state.step) {
    // 1. Ism Familiya
    case "name":
      state.name = text;
      state.step = "phone";
      bot.sendMessage(
        chatId,
        `📞 <b>Telefon raqamingizni</b> kiriting:\n<i>(Masalan: +998901234567)</i>`,
        { parse_mode: "HTML" }
      );
      break;

    // 2. Telefon raqam
    case "phone":
      state.phone = text;
      state.step = "parentPhone";
      bot.sendMessage(
        chatId,
        `📞 <b>Ota-ona telefon raqamini</b> kiriting:\n<i>(Masalan: +998901234567)</i>`,
        { parse_mode: "HTML" }
      );
      break;

    // 3. Ota-ona telefon raqami
    case "parentPhone":
      state.parentPhone = text;
      state.step = "group";
      bot.sendMessage(
        chatId,
        `🏫 <b>Guruh nomini</b> kiriting:\n<i>(Masalan: 1-Group, 2-Group va h.k.)</i>`,
        { parse_mode: "HTML" }
      );
      break;

    // 4. Guruh nomi
    case "group":
      state.group = text;
      state.step = "birthdate";
      bot.sendMessage(
        chatId,
        `🎂 <b>Tug'ilgan sanangizni</b> kiriting:\n<i>(Masalan: 15.03.2005)</i>`,
        { parse_mode: "HTML" }
      );
      break;

    // 5. Tug'ilgan sana
    case "birthdate":
      state.birthdate = text;
      state.step = "done";

      // Foydalanuvchiga rahmat xabari
      await bot.sendMessage(
        chatId,
        `🎉 <b>Rahmat!</b> Ma'lumotlaringiz muvaffaqiyatli qabul qilindi! ✅`,
        { parse_mode: "HTML" }
      );

      // Guruhga ma'lumot yuborish
      const telegramUser = `@${msg.from.username || "username yo'q"}`;
      const groupMessage = `
📋 <b>YANGI RO'YXATDAN O'TISH</b>

👤 <b>Ism Familiya:</b> ${state.name}
📞 <b>Telefon raqam:</b> ${state.phone}
👨‍👩‍👦 <b>Ota-ona telefoni:</b> ${state.parentPhone}
🏫 <b>Guruh nomi:</b> ${state.group}
🎂 <b>Tug'ilgan sana:</b> ${state.birthdate}
🔗 <b>Telegram:</b> ${telegramUser}
🆔 <b>User ID:</b> <code>${userId}</code>
      `.trim();

      await bot.sendMessage(GROUP_ID, groupMessage, { parse_mode: "HTML" });

      // Holatni tozalash
      delete userState[userId];
      break;
  }
});

// ===================== XATO USHLASH =====================
bot.on("polling_error", (error) => {
  console.error("Polling xatosi:", error.message);
});

console.log("🤖 Bot ishga tushdi...");
