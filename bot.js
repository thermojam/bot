const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

// === Конфигурация ===
const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(TOKEN);
const URL = process.env.RENDER_EXTERNAL_URL || 'https://bot-gupk.onrender.com';
const PORT = process.env.PORT || 3000;

const subscribedChats = new Set();
let userData = {};

// === Webhook настройка ===
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
    console.log(`Express-сервер на порту ${PORT}`);
});

// === Логика бота ===

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;

    userData[chatId] = {};
    subscribedChats.add(chatId); // Добавляем в рассылку

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

        const lessonMessage = `🎬 Вот твой бесплатный урок! \n\n🔹 «3 упражнения для снятия усталости»:\n\n<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">👉 Просмотреть видео</a>\n\nПопробуй прямо сейчас! А после напиши, как ощущения 😊\n\nP.S. Если хочешь получить полный курс с обратной связью, жми кнопку «Хочу курс!» после урока.`;

        const options = {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📚 Хочу курс!', callback_data: 'want_course' },
                        { text: '📄 Скачать PDF', callback_data: 'download_pdf' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, lessonMessage, options);

    } else if (data === 'want_course') {
        const saleMessage = `✨ Как тебе упражнения? 😊\n\nЕсли хочешь:\n✅ Избавиться от болей в спине насовсем,\n✅ Вернуть энергию и лёгкость,\n✅ Работать в группе с моей поддержкой —\n\nСтартует курс «Славянская гимнастика: 5 шагов к здоровью»!`;

        bot.sendMessage(chatId, saleMessage, { parse_mode: 'Markdown' });

    } else if (data === 'download_pdf') {
        const pdfPath = 'https://t.me/ksenia_kmensky/21'; // Путь к PDF

        if (fs.existsSync(pdfPath)) {
            bot.sendDocument(chatId, pdfPath).catch((err) => {
                console.error('Ошибка при отправке PDF:', err.message);
            });
        } else {
            bot.sendMessage(chatId, 'Файл временно недоступен 😔');
        }
    }
});

// ====== Рассылка каждые 24 часа ======

function sendDailyBroadcast() {
    const message = `🌟 Не пропусти полезные советы и практики!

Подписывайся на мой Telegram-канал, чтобы получать регулярную поддержку 🙌`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔔 Перейти в канал', url: 'https://t.me/xenia_kamensky' } // ← ССЫЛКА НА КАНАЛ
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

// 🔁 Каждые 24 часа
setInterval(sendDailyBroadcast, 3 * 60 * 60 * 1000); // 10800000 мс
