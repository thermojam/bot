const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(TOKEN);

const URL = process.env.RENDER_EXTERNAL_URL || 'https://bot-gupk.onrender.com';
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Установка Webhook
bot.setWebHook(`${URL}/bot${TOKEN}`);

// Webhook endpoint
app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Проверка, что сервер работает
app.get('/', (req, res) => {
    res.send('🤖 Бот работает!');
});

app.listen(PORT, () => {
    console.log(`Express-сервер запущен на порту ${PORT}`);
});

// ====== Логика бота ======

let userData = {};
let subscribedChats = new Set(); // для рассылки

// 1. Приветствие и выбор
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;

    userData[chatId] = {};
    subscribedChats.add(chatId); // добавляем в рассылку

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

// 2. Обработка callback'ов
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    bot.answerCallbackQuery(callbackQuery.id).catch((err) => {
        console.error('Ошибка при answerCallbackQuery:', err.message);
    });

    if (data === 'want_lesson') {
        // Мини-опрос
        const surveyMessage = `🎉 Отлично! Чтобы урок был полезным, ответь:\n\nЧто тебя беспокоит больше всего?`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '💔 Боли в душе', callback_data: 'back_pain' },
                        { text: '⚡ Нет энергии', callback_data: 'no_energy' },
                        { text: '😟 Стресс', callback_data: 'stress' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, surveyMessage, options);

    } else if (data === 'no_lesson') {
        // Отказ
        bot.sendMessage(chatId, 'Хорошо! Если передумаешь — напиши «/start» 😊');

    } else if (['back_pain', 'no_energy', 'stress'].includes(data)) {
        // Сохраняем ответ
        userData[chatId].concern = data;

        // Урок
        const lessonMessage = `🎬 Вот твой бесплатный урок! 

🔹 [Просмотреть видео](https://www.youtube.com/watch?v=zmxPXaeEXBU)

Попробуй прямо сейчас! А после напиши, как ощущения 😊

P.S. Если хочешь получить полный курс с обратной связью, жми кнопку «Хочу курс!» после урока.`;

        const options = {
            parse_mode: 'Markdown',
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
        const saleMessage = `✨ *Как тебе упражнения?* 😊

Если хочешь:
✅ Избавиться от болей в душе,
✅ Вернуть энергию и лёгкость,
✅ Работать в группе с моей поддержкой —

*Стартует курс «Славянская гимнастика: 5 шагов к здоровью»!*`;

        bot.sendMessage(chatId, saleMessage, { parse_mode: 'Markdown' });
    }
});

// ====== Рассылка ======

function sendDailyBroadcast() {
    const message = `🌟 Не пропусти полезные советы и практики!

Подписывайся на мой Telegram-канал, чтобы получать регулярную поддержку 🙌`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔔 Перейти в канал', url: 'https://t.me/ksenia_kmensky' } // ← Укажи ссылку на канал
                ]
            ]
        }
    };

    subscribedChats.forEach((chatId) => {
        bot.sendMessage(chatId, message, options).catch((err) => {
            console.error(`Ошибка при отправке в чат ${chatId}:`, err.message);
        });
    });
}

// 🔁 Запускаем каждые 24 часа
setInterval(sendDailyBroadcast, 10000);
