require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const TOKEN = process.env.TELEGRAM_TOKEN;
const URL = process.env.RENDER_EXTERNAL_URL || 'https://bot.onrender.com';
const PORT = process.env.PORT || 3000;
const ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID); // Преобразуем в число

if (!TOKEN || !ADMIN_CHAT_ID) {
    throw new Error('❌ TELEGRAM_TOKEN или ADMIN_CHAT_ID не заданы в .env');
}

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${URL}/bot${TOKEN}`); // IDE может предупреждать, но это корректно

app.use(bodyParser.json());

app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.use(express.static('public'));

app.get('/', (_req, res) => {
    res.send(`<h1 style="color:white; text-align:center; background:#282828; padding:100px">Bot is running!</h1>`);
});

app.listen(PORT, () => {
    console.log(`🚀 Bot is live on port ${PORT}`);
});

const userStats = {};

function updateStats(chatId, key) {
    if (!userStats[chatId]) {
        userStats[chatId] = {
            steps: [],
            startedAt: new Date(),
            isSubscribed: null,
            name: null
        };
    }
    userStats[chatId].steps.push(key);
}

function updateSubscription(chatId, isSubscribed) {
    if (userStats[chatId]) {
        userStats[chatId].isSubscribed = isSubscribed;
    }
}

function setName(chatId, name) {
    if (userStats[chatId]) {
        userStats[chatId].name = name;
    }
}

function logAction(chatId, action) {
    const msg = `📝 ${chatId}: ${action}`;
    bot.sendMessage(ADMIN_CHAT_ID, msg).catch(() => {});
}

async function isUserSubscribed(chatId, userId) {
    try {
        const res = await bot.getChatMember('@ksenia_kmensky', userId);
        return res.status !== 'left' && res.status !== 'kicked';
    } catch (e) {
        console.error(`❌ Ошибка подписки (${chatId}):`, e.message);
        return false;
    }
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;

    updateStats(chatId, 'start');
    setName(chatId, firstName);
    logAction(chatId, `Стартовал бот. Имя: ${firstName}`);

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

// === /stats только для админа ===
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId !== ADMIN_CHAT_ID) return;

    if (Object.keys(userStats).length === 0) {
        return bot.sendMessage(chatId, '📭 Статистика пуста');
    }

    let report = '📊 Статистика пользователей:\n\n';

    for (const [id, user] of Object.entries(userStats)) {
        report += `👤 ${user.name || 'Без имени'} (${id})\n`;
        report += `⏰ С начала: ${user.startedAt.toLocaleString()}\n`;
        report += `🧾 Действия: ${user.steps.join(', ')}\n`;
        report += `🔔 Подписка: ${user.isSubscribed === null ? 'неизвестно' : user.isSubscribed ? '✅' : '❌'}\n\n`;
    }

    bot.sendMessage(chatId, report);
});

// === Обработка кнопок ===
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;
    const userName = callbackQuery.from.first_name;

    updateStats(chatId, data);
    setName(chatId, userName);
    logAction(chatId, `Нажал кнопку: ${data}`);

    if (data === 'want_course') {
        const saleMessage = `✨ *Запишись на курс!*\n\nТы сделала первый шаг. Готова углубиться в знания?\n\n🔹 Уникальная программа\n🔹 Обратная связь от Ксении\n🔹 Поддержка и сообщество`;
        return bot.sendMessage(chatId, saleMessage, { parse_mode: 'Markdown' });
    }

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

    const subscribed = await isUserSubscribed(chatId, userId);
    updateSubscription(chatId, subscribed);
    logAction(chatId, `Подписан на канал: ${subscribed}`);

    if (!subscribed) {
        return bot.sendMessage(chatId, `🚫 Чтобы получить доступ к материалу, подпишись на канал.`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔔 Перейти в канал', url: 'https://t.me/ksenia_kmensky' }],
                    [{ text: '✅ Я подписался', callback_data: data }]
                ]
            }
        });
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
