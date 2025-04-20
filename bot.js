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

app.get('/', (req, res) => {
    res.send('🤖 Бот работает!');
});

app.listen(PORT, () => {
    console.log(`Express-сервер запущен на порту ${PORT}`);
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
            inline_keyboard: [
                [
                    { text: '🧠 Психология 🟣', callback_data: 'psychology' },
                    { text: '🧘 Гимнастика 🔵', callback_data: 'gymnastics' }
                ],
                [
                    { text: '🥗 Нутрициология 🟢', callback_data: 'nutrition' }
                ]
            ]
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

        return bot.sendMessage(chatId, saleMessage, { parse_mode: 'Markdown' });
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
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📚 Хочу курс!', callback_data: 'want_course' }]
            ]
        }
    };

    bot.sendMessage(chatId, lessonMessage, options);
});


function sendDailyBroadcast() {
    const message = `🌟 Не пропусти полезные советы и практики!

Подписывайся на мой Telegram-канал, чтобы получать регулярную поддержку 🙌`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔔 Перейти в канал', url: 'https://t.me/ksenia_kmensky' }]
            ]
        }
    };

    subscribedChats.forEach((chatId) => {
        bot.sendMessage(chatId, message, options).catch((err) => {
            console.error(`Ошибка при отправке в чат ${chatId}:`, err.message);
        });
    });
}

setInterval(sendDailyBroadcast, 6 * 60 * 60 * 1000);
