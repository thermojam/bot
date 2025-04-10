const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// === Настройки окружения ===
const TOKEN = process.env.TELEGRAM_TOKEN;
const URL = process.env.RENDER_EXTERNAL_URL || 'https://bot-gupk.onrender.com';
const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${URL}/bot${TOKEN}`);

// === Подключение express ===
app.use(bodyParser.json());

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
const subscribedChats = new Set();

// Команда /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Предотвращение дублирующих сообщений
    if (userData[chatId]?.started) return;

    const firstName = msg.from.first_name;
    userData[chatId] = { started: true };
    subscribedChats.add(chatId); // Подписываем на рассылку

    const welcomeMessage = `Привет, ${firstName}! \nЯ Ксения — эксперт по славянской гимнастике.\n\n🔹 Хочешь получить бесплатный урок «3 упражнения для снятия усталости за 10 минут»?\n\nНажми кнопку ниже 👇`;

    const options = {
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

// Команда /reset
bot.onText(/\/reset/, (msg) => {
    const chatId = msg.chat.id;
    userData[chatId] = { started: false };
    bot.sendMessage(chatId, '🔄 Диалог сброшен. Напиши /start, чтобы начать сначала.');
});

// Обработка нажатий кнопок
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    bot.answerCallbackQuery(callbackQuery.id).catch((err) => {
        console.error('Ошибка при answerCallbackQuery:', err.message);
    });

    if (data === 'want_lesson') {
        const surveyMessage = `🎉 Отлично! Чтобы урок был полезным, ответь:\n\nЧто тебя беспокоит больше всего?`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '💔 Боли в спине', callback_data: 'back_pain' },
                        { text: '⚡ Нет энергии', callback_data: 'no_energy' },
                        { text: '😟 Стресс', callback_data: 'stress' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, surveyMessage, options);
    } else if (data === 'no_lesson') {
        bot.sendMessage(chatId, 'Хорошо! Если передумаешь — пиши «Старт» 😊');
    } else if (['back_pain', 'no_energy', 'stress'].includes(data)) {
        userData[chatId].concern = data;

        const lessonMessage = `🎬 Вот твой бесплатный урок!\n\n🔹 *3 упражнения для снятия усталости*\n\n[📺 Просмотреть видео](https://www.youtube.com/watch?v=IT94xC35u6k)\n\nПопробуй прямо сейчас! А после напиши, как ощущения 😊\n\nP.S. Если хочешь получить полный курс с обратной связью — жми кнопку ниже!`;

        const options = {
            parse_mode: 'Markdown',
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
        const saleMessage = `✨ *Как тебе упражнения?* 😊\n\nЕсли хочешь:\n✅ Избавиться от болей в спине *насовсем*,\n✅ Вернуть энергию и лёгкость,\n✅ Работать в группе с моей поддержкой —\n\n*Стартует курс «Славянская гимнастика: 5 шагов к здоровью»!*`;

        bot.sendMessage(chatId, saleMessage, { parse_mode: 'Markdown' });
    }
});

// === Рассылка каждые 24 часа ===
setInterval(() => {
    subscribedChats.forEach((chatId) => {
        bot.sendMessage(chatId, '📢 Подпишись на наш Telegram-канал, чтобы не пропускать полезные материалы!\n\n👉 https://t.me/ksenia_kmensky');
    });
}, 24 * 60 * 60 * 1000);
