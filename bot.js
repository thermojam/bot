const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// === Конфигурация ===
const TOKEN = process.env.TELEGRAM_TOKEN;
const URL = process.env.RENDER_EXTERNAL_URL || 'https://bot-gupk.onrender.com';
const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${URL}/bot${TOKEN}`);

app.use(bodyParser.json());

// === Вебхук ===
app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
        <head>
        <meta charset="UTF-8">
        <title>TG-Bot</title>
        <link rel="icon" type="image/x-icon" href="/telegram.svg">
        </head>
        <body style="min-width: 100vh; background-color: #282828;">
            <div style="text-align: center; padding: 180px 0 300px 0; font-family: sans-serif;">
                <h1 style="color: white">TG-Bot <span style="color: #39ccff">Server is running</span> successfully!</h1>
                <img src="/telegram.svg" alt="telegram" width="200" style="margin-top: 20px;" />
             </div>
        </body>
</html>
    `
    );
});

app.listen(PORT, () => {
    console.log(`Peace for all ${PORT}`);
});

// === Хранилище подписчиков ===
const subscribedChats = new Set();

// === Старт ===
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;

    subscribedChats.add(chatId);

    const welcomeMessage = `Привет, ${firstName}! 👋\n\nЯ Ксения — эксперт по здоровью и балансу.\n\nХочешь получить бесплатный видеоурок?\n\nВыбери, что тебе ближе 👇`;

    const options = {
        reply_markup: {
            inline_keyboard: [[{text: '🧠 Психология 🟣', callback_data: 'psychology'}, {
                text: '🧘 Гимнастика 🔵',
                callback_data: 'gymnastics'
            }], [{text: '🥗 Нутрициология 🟢', callback_data: 'nutrition'}]]
        }
    };

    bot.sendMessage(chatId, welcomeMessage, options);
});

// === Обработка выбора ===
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === 'want_course') {
        const saleMessage = `✨ *Запишись на курс!*\n\nТы сделала первый шаг. Готова углубиться в знания?\n\n🔹 Уникальная программа\n🔹 Обратная связь от Ксении\n🔹 Поддержка и сообщество`;

        return bot.sendMessage(chatId, saleMessage, {parse_mode: 'Markdown'});
    }

    // Тематические ветки
    let messageText = '';
    let lessonLink = '';

    switch (data) {
        case 'psychology':
            messageText = `🧠 *Психология*\n\nВот видеоурок, который поможет тебе разобраться в себе и обрести внутренний баланс.`;
            lessonLink = 'https://www.youtube.com/watch?v=iLlrIi9-NfQ';
            break;
        case 'gymnastics':
            messageText = `🧘 *Славянская гимнастика*\n\nПопробуй древние практики для здоровья и женственности.`;
            lessonLink = 'https://www.youtube.com/watch?v=-wqLcfcA_ig';
            break;
        case 'nutrition':
            messageText = `🥗 *Нутрициология*\n\nНаучись питаться осознанно и чувствовать себя лучше каждый день.`;
            lessonLink = 'https://www.youtube.com/watch?v=-e-4Kx5px_I';
            break;
    }

    const lessonMessage = `${messageText}\n\n👉 [Просмотреть видео](${lessonLink})`;

    const options = {
        parse_mode: 'Markdown', reply_markup: {
            inline_keyboard: [[{text: '📚 Хочу курс!', callback_data: 'want_course'}]]
        }
    };

    bot.sendMessage(chatId, lessonMessage, options);
});


function sendDailyBroadcast() {
    const message = `🌟 Не пропусти полезные советы и практики!

Подписывайся на мой Telegram-канал, чтобы получать регулярную поддержку 🙌`;

    const options = {
        reply_markup: {
            inline_keyboard: [[{text: '🔔 Перейти в канал', url: 'https://t.me/ksenia_kmensky'}]]
        }
    };

    subscribedChats.forEach((chatId) => {
        bot.sendMessage(chatId, message, options).catch((err) => {
            console.error(`Ошибка при отправке в чат ${chatId}:`, err.message);
        });
    });
}

setInterval(sendDailyBroadcast, 12 * 60 * 60 * 1000);
