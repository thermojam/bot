import express from 'express';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import db, { admin } from './firebase.js';
import yookassa from './yookassa.js';

config();

const TOKEN = process.env.TELEGRAM_TOKEN;
const URL = process.env.RENDER_EXTERNAL_URL;
const PORT = process.env.PORT || 3000;
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME;
const BOT_USERNAME = process.env.BOT_USERNAME;

const FIREBASE_SERVICE_KEY = JSON.parse(process.env.FIREBASE_SERVICE_KEY);
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(FIREBASE_SERVICE_KEY),
    });
}

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${URL}/bot${TOKEN}`);

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.get('/', (req, res) => {
    res.send(`<h1 style="color:#27ff8c; text-align:center; background:#282828; padding:100px">Bot is running!</h1>`);
});

app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));

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
    await db.collection('users').doc(String(chatId)).update({ name });
};

const setSubscriptionStatus = async (chatId, status) => {
    await db.collection('users').doc(String(chatId)).update({ isSubscribed: status });
};

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
                    { text: '🧠 Психология 🟣', callback_data: 'psychology' },
                    { text: '🧘 Гимнастика 🔵', callback_data: 'gymnastics' },
                ],
                [{ text: '🥗 Нутрициология 🟢', callback_data: 'nutrition' }],
            ],
        },
    };

    bot.sendMessage(chatId, welcomeMessage, options);
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const name = query.from.first_name;
    const userId = query.from.id;

    await updateUserStep(chatId, data);
    await setUserName(chatId, name);

    try {
        const channelUsername = `@${CHANNEL_USERNAME.replace('@', '')}`;
        const member = await bot.getChatMember(channelUsername, userId);
        const isSubscribed = ['member', 'creator', 'administrator'].includes(member.status);
        await setSubscriptionStatus(chatId, isSubscribed);

        if (!isSubscribed) {
            return bot.sendMessage(chatId,
                `🔒 Чтобы получить доступ к видеоуроку, подпишись на канал ${channelUsername}\n\n` +
                `После подписки нажми повторно на кнопку.`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📲 Подписаться', url: `https://t.me/${channelUsername.replace('@', '')}` }],
                            [{ text: '🔄 Проверить подписку', callback_data: data }]
                        ]
                    }
                }
            );
        }
    } catch (error) {
        console.error('Ошибка при проверке подписки:', error);
        return bot.sendMessage(chatId, '🚫 Ошибка при проверке подписки. Попробуй позже.');
    }

    if (data === 'want_course') {
        await updateUserStep(chatId, 'want_course');
        return bot.sendMessage(
            chatId,
            `✨ *Запишись на курс!*\n\n🔹 Уникальная программа\n🔹 Обратная связь от Ксении\n🔹 Поддержка и сообщество\n\n💳 Стоимость: *39900₽*`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{ text: '💸 Перейти к оплате', callback_data: 'buy_course' }]],
                },
            }
        );
    }

    if (data === 'buy_course') {
        try {
            const payment = await yookassa.createPayment({
                amount: {
                    value: '39900.00',
                    currency: 'RUB',
                },
                confirmation: {
                    type: 'redirect',
                    return_url: `https://t.me/${BOT_USERNAME}`,
                },
                capture: true,
                description: 'Курс от Ксении',
                metadata: {
                    telegram_chat_id: chatId
                }
            });

            await updateUserStep(chatId, 'payment_created');
            bot.sendMessage(chatId, `💳 Перейди по ссылке для оплаты: ${payment.confirmation.confirmation_url}`);
        } catch (error) {
            console.error('Ошибка при создании платежа:', error);
            bot.sendMessage(chatId, '❌ Не удалось создать платёж. Попробуйте позже.');
        }
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

    if (messages[data]) {
        const msg = `${messages[data]}\n\n👉 [Просмотреть видео](${lessonLinks[data]})`;
        bot.sendMessage(chatId, msg, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: '📚 Хочу курс!', callback_data: 'want_course' }]],
            },
        });
    }
});
