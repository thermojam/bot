const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');

const app = express();

const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(TOKEN);

const URL = process.env.RENDER_EXTERNAL_URL || 'https://bot-gupk.onrender.com';
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
bot.setWebHook(`${URL}/bot${TOKEN}`);

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

// === Логика бота ===
let userData = {};
let subscribedUsers = new Set(); // для рассылки

// 1️⃣ Приветствие и кнопки
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;

    if (!userData[chatId]) {
        userData[chatId] = {};
    }

    subscribedUsers.add(chatId); // добавляем в список подписанных

    const welcomeMessage = `
👋 Привет, <b>${firstName}</b>!
Я — Ксения, эксперт по славянской гимнастике.

🎁 Хочешь получить бесплатный урок:
<b>«3 упражнения для снятия усталости за 10 минут»</b>?

Нажми на кнопку ниже:
    `;

    const options = {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Да, хочу урок!', callback_data: 'want_lesson' },
                    { text: '❌ Пока нет', callback_data: 'no_lesson' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, welcomeMessage, options);
});

// 2️⃣ Callback обработка
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    bot.answerCallbackQuery(callbackQuery.id).catch(console.error);

    if (data === 'want_lesson') {
        const surveyMessage = `
📝 <b>Мини-опрос:</b>
Что беспокоит тебя больше всего?
        `;

        const options = {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '💔 Боли в спине', callback_data: 'back_pain' },
                        { text: '⚡ Нет энергии', callback_data: 'no_energy' }
                    ],
                    [
                        { text: '😟 Стресс', callback_data: 'stress' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, surveyMessage, options);

    } else if (data === 'no_lesson') {
        bot.sendMessage(chatId, 'Хорошо 😊 Если передумаешь — просто напиши /start.');

    } else if (['back_pain', 'no_energy', 'stress'].includes(data)) {
        userData[chatId].concern = data;

        const lessonMessage = `
🎬 <b>Твой бесплатный видео-урок:</b>

🔹 <a href="https://www.youtube.com/watch?v=IT94xC35u6k">Просмотреть видео</a>

Попробуй упражнения прямо сейчас, а после напиши, как ощущения 😊

P.S. Хочешь получить полный курс с моей поддержкой?
Жми кнопку ниже 👇
        `;

        const options = {
            parse_mode: 'HTML',
            disable_web_page_preview: false,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📚 Хочу курс!', callback_data: 'want_course' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, lessonMessage, options);

    } else if (data === 'want_course') {
        const saleMessage = `
✨ <b>Как тебе упражнения?</b>

Хочешь:
✅ Избавиться от болей в спине
✅ Вернуть энергию и лёгкость
✅ Работать в группе с моей поддержкой

📦 Стартует курс: <b>«Славянская гимнастика: 5 шагов к здоровью»</b>
Напиши мне, чтобы узнать подробности 💌
        `;

        bot.sendMessage(chatId, saleMessage, { parse_mode: 'HTML' });
    }
});

// 3️⃣ Авторассылка каждые 24 часа
cron.schedule('0 9 * * *', () => {
    subscribedUsers.forEach((chatId) => {
        bot.sendMessage(chatId, `
🔔 <b>Не пропусти важное!</b>

Подпишись на наш Telegram-канал, чтобы получать советы по здоровью, упражнения и вдохновение каждый день.

👉 <a href="https://t.me/xenia_kamensky ">Перейти в канал</a>
        `, { parse_mode: 'HTML' }).catch(console.error);
    });
}, {
    timezone: 'Europe/Moscow' 
});
