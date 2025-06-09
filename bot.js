import express from 'express';
import bodyParser from 'body-parser';
import {config} from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';

import db, {admin} from './firebase.js';

config();

const TOKEN = process.env.TELEGRAM_TOKEN;
const URL = process.env.RENDER_EXTERNAL_URL;
const PORT = process.env.PORT || 3000;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME; // 👈 Добавлено

// === Firebase ===
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(FIREBASE_SERVICE_KEY),
    });
}

// === Bot Init ===
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${URL}/bot${TOKEN}`);

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// === Webhook Route ===
app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// === Homepage Route ===
app.get('/', (req, res) => {
    res.send(`<h1 style="color:white; text-align:center; background:#282828; padding:100px">Bot is running!</h1>`);
});

// === Start Server ===
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));

// === Firestore Utils ===
const updateUserStep = async (chatId, step) => {
    const ref = db.collection('users').doc(String(chatId));
    const doc = await ref.get();
    if (!doc.exists) {
        await ref.set({
            name: null,
            startedAt: new Date(),
            isSubscribed: null,
            steps: [step],
        });
    } else {
        await ref.update({
            steps: admin.firestore.FieldValue.arrayUnion(step),
        });
    }
};

const setUserName = async (chatId, name) => {
    await db.collection('users').doc(String(chatId)).update({name});
};

const setSubscriptionStatus = async (chatId, status) => {
    await db.collection('users').doc(String(chatId)).update({isSubscribed: status});
};

const getAllUserStats = async () => {
    const snapshot = await db.collection('users').get();
    return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
};

// === Bot Dialog ===
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;

    await updateUserStep(chatId, 'start');
    await setUserName(chatId, firstName);

    const welcomeMessage = `Привет, ${firstName}! 👋\n\nЯ Ксения — эксперт по здоровью и балансу.\n\nХочешь получить бесплатный видеоурок?\n\nВыбери, что тебе ближе 👇`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    {text: '🧠 Психология 🟣', callback_data: 'psychology'},
                    {text: '🧘 Гимнастика 🔵', callback_data: 'gymnastics'},
                ],
                [{text: '🥗 Нутрициология 🟢', callback_data: 'nutrition'}],
            ],
        },
    };

    bot.sendMessage(chatId, welcomeMessage, options);
});

bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== ADMIN_CHAT_ID) return;

    const users = await getAllUserStats();
    if (!users.length) return bot.sendMessage(chatId, '📭 Статистика пуста');

    let report = '📊 Статистика пользователей:\n\n';
    users.forEach(user => {
        report += `👤 ${user.name || 'Без имени'} (${user.id})\n`;
        report += `⏰ С начала: ${new Date(user.startedAt._seconds * 1000).toLocaleString()}\n`;
        report += `🧾 Действия: ${user.steps?.join(', ') || 'нет'}\n`;
        report += `🔔 Подписка: ${user.isSubscribed === true ? '✅' : '❌'}\n\n`;
    });

    bot.sendMessage(chatId, report);
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const name = query.from.first_name;
    const userId = query.from.id;

    await updateUserStep(chatId, data);
    await setUserName(chatId, name);

    try {
        const channelUsername = `@${process.env.CHANNEL_USERNAME.replace('@', '')}`;
        const member = await bot.getChatMember(channelUsername, userId);
        const isSubscribed = ['member', 'creator', 'administrator'].includes(member.status);
        await setSubscriptionStatus(chatId, isSubscribed);

        if (!isSubscribed) {
            return bot.sendMessage(chatId,
                `🔒 Чтобы получить доступ к видеоуроку, пожалуйста, подпишись на канал ${channelUsername}\n\n` +
                `После подписки нажми повторно на кнопку.`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{text: '📲 Подписаться', url: `https://t.me/${channelUsername.replace('@', '')}`}],
                            [{text: '🔄 Проверить подписку', callback_data: data}]
                        ]
                    }
                }
            );
        }
    } catch (error) {
        console.error('Ошибка при проверке подписки:', error);
        return bot.sendMessage(chatId, '🚫 Произошла ошибка при проверке подписки. Попробуй позже.');
    }

    if (data === 'want_course') {
        await updateUserStep(chatId, 'want_course');

        return bot.sendMessage(
            chatId,
            `✨ *Запишись на курс!*\n\n🔹 Уникальная программа\n🔹 Обратная связь от Ксении\n🔹 Поддержка и сообщество\n\n💳 Стоимость: *990₽*`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💸 Оплатить курс', callback_data: 'mock_payment' }],
                    ],
                },
            }
        );
    }

    if (data === 'mock_payment') {
        await updateUserStep(chatId, 'mock_payment');

        bot.sendMessage(chatId, '💳 Начинаем "оплату"... ⏳');

        setTimeout(() => {
            bot.sendMessage(chatId, '✅ Оплата прошла успешно! 🎉 Доступ открыт.');
            bot.sendMessage(chatId, '📦 Вот ссылка на курс: https://web.telegram.org/k/#-2689228807');
        }, 2000);

        return;
    }

    const lessonLinks = {
        psychology: 'https://www.youtube.com/watch?v=iLlrIi9-NfQ',
        gymnastics: 'https://www.youtube.com/watch?v=-wqLcfcA_ig',
        nutrition: 'https://www.youtube.com/watch?v=-e-4Kx5px_I',
    };

    const messages = {
        psychology: '🧠 *Психология*\n\nВот видеоурок, который поможет тебе разобраться в себе и обрести внутренний баланс.',
        gymnastics: '🧘 *Славянская гимнастика*\n\nПопробуй древние практики для здоровья и женственности.',
        nutrition: '🥗 *Нутрициология*\n\nНаучись питаться осознанно и чувствовать себя лучше каждый день.',
    };

    const msg = `${messages[data]}\n\n👉 [Просмотреть видео](${lessonLinks[data]})`;

    bot.sendMessage(chatId, msg, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{text: '📚 Хочу курс!', callback_data: 'want_course'}]],
        },
    });
});
