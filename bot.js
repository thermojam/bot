import db from './firebase.js';

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');


const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const URL = process.env.RENDER_EXTERNAL_URL;
const PORT = process.env.PORT || 3000;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${URL}/bot${TOKEN}`);

app.use(bodyParser.json());

app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.use(express.static('public'));
app.get('/', (req, res) => {
    res.send(`<h1 style="color:white; text-align:center; background:#282828; padding:100px">Bot is running!</h1>`);
});

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
            steps: [step]
        });
    } else {
        await ref.update({
            steps: admin.firestore.FieldValue.arrayUnion(step)
        });
    }
};

const setUserName = async (chatId, name) => {
    await db.collection('users').doc(String(chatId)).update({ name });
};

const setSubscriptionStatus = async (chatId, status) => {
    await db.collection('users').doc(String(chatId)).update({ isSubscribed: status });
};

const getAllUserStats = async () => {
    const snapshot = await db.collection('users').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const logAction = (chatId, action) => {
    const msg = `📝 ${chatId}: ${action}`;
    bot.sendMessage(ADMIN_CHAT_ID, msg).catch(() => {});
};

// === Dialog ===
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;

    await updateUserStep(chatId, 'start');
    await setUserName(chatId, firstName);
    logAction(chatId, `Start: ${firstName}`);

    const welcomeMessage = `Привет, ${firstName}! 👋\n\nЯ Ксения — эксперт по здоровью и балансу.\n\nХочешь получить бесплатный видеоурок?\n\nВыбери, что тебе ближе 👇`;

    const options = {
        reply_markup: {
            inline_keyboard: [[
                { text: '🧠 Психология 🟣', callback_data: 'psychology' },
                { text: '🧘 Гимнастика 🔵', callback_data: 'gymnastics' }
            ], [
                { text: '🥗 Нутрициология 🟢', callback_data: 'nutrition' }
            ]]
        }
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

    await updateUserStep(chatId, data);
    await setUserName(chatId, name);
    logAction(chatId, `Нажал кнопку: ${data}`);

    if (data === 'want_course') {
        return bot.sendMessage(chatId, `✨ *Запишись на курс!*\n\n🔹 Уникальная программа\n🔹 Обратная связь от Ксении\n🔹 Поддержка и сообщество`, {
            parse_mode: 'Markdown'
        });
    }

    const lessonLinks = {
        psychology: 'https://www.youtube.com/watch?v=iLlrIi9-NfQ',
        gymnastics: 'https://www.youtube.com/watch?v=-wqLcfcA_ig',
        nutrition: 'https://www.youtube.com/watch?v=-e-4Kx5px_I'
    };

    const messages = {
        psychology: '🧠 *Психология*\n\nВот видеоурок, который поможет тебе разобраться в себе и обрести внутренний баланс.',
        gymnastics: '🧘 *Славянская гимнастика*\n\nПопробуй древние практики для здоровья и женственности.',
        nutrition: '🥗 *Нутрициология*\n\nНаучись питаться осознанно и чувствовать себя лучше каждый день.'
    };

    const msg = `${messages[data]}\n\n👉 [Просмотреть видео](${lessonLinks[data]})`;

    await setSubscriptionStatus(chatId, true); // Упрощенно: всегда пропускаем
    bot.sendMessage(chatId, msg, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{ text: '📚 Хочу курс!', callback_data: 'want_course' }]]
        }
    });
});
