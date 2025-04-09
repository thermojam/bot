const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.TELEGRAM_TOKEN; // Безопасный способ хранения токена
const URL = process.env.RENDER_EXTERNAL_URL || `https://bot-gupk.onrender.com`; // Укажи URL вручную при необходимости

const bot = new TelegramBot(TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

// Нужно для обработки JSON-запросов от Telegram
app.use(express.json());

// Установка вебхука
bot.setWebHook(`${URL}/bot${TOKEN}`);

// Telegram будет слать обновления сюда
app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Проверка, что сервер жив
app.get('/', (req, res) => {
    res.send('Бот работает через вебхук 🚀');
});

app.listen(PORT, () => {
    console.log(`Express-сервер запущен на порту ${PORT}`);
});

// ======== Telegram Logic ========

let userData = {};

// Старт
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;

    userData[chatId] = {};

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

// Обработка кнопок
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    bot.answerCallbackQuery(callbackQuery.id);

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

        const lessonMessage = `🎬 Вот твой бесплатный урок! \n\n🔹 «3 упражнения для снятия усталости»:\n\nПопробуй прямо сейчас! А после напиши, как ощущения 😊\n\nP.S. Если хочешь получить полный курс с обратной связью, жми кнопку «Хочу курс!» после урока.`;

        const options = {
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
