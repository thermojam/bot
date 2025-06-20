import dotenv from 'dotenv';
dotenv.config();

export default function setupPayments(bot, updateUserStep) {
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        if (data === 'buy_course') {
            const invoice = {
                chat_id: chatId,
                title: 'Курс от Ксении',
                description: 'Полный доступ к курсу, сообществу и обратной связи.',
                payload: 'course-payload',
                provider_token: process.env.PROVIDER_TOKEN,
                start_parameter: 'pay_course',
                currency: 'RUB',
                prices: [
                    { label: 'Курс', amount: 3990000 }, // 39900.00 руб
                ],
            };

            try {
                await bot.sendInvoice(
                    invoice.chat_id,
                    invoice.title,
                    invoice.description,
                    invoice.payload,
                    invoice.provider_token,
                    invoice.start_parameter,
                    invoice.currency,
                    invoice.prices // ✅ без stringify
                );
                await updateUserStep(chatId, 'invoice_sent');
            } catch (error) {
                console.error('Ошибка отправки счёта:', error.message);
                await bot.sendMessage(chatId, '❌ Ошибка при создании счёта. Попробуй позже.');
            }
        }
    });

    bot.on('pre_checkout_query', async (query) => {
        await bot.answerPreCheckoutQuery(query.id, true);
    });

    bot.on('successful_payment', async (msg) => {
        const chatId = msg.chat.id;
        await updateUserStep(chatId, 'successful_payment');
        await bot.sendMessage(chatId, '✅ Оплата прошла успешно! Спасибо! 🎉');
        await bot.sendMessage(chatId, '📦 Вот ссылка на курс: https://t.me/ksenia_kmensky');
    });
}

