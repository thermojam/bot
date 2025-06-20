import dotenv from 'dotenv';
dotenv.config();

export default function setupPayments(bot, updateUserStep) {
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        if (data === 'mock_payment') {
            const invoice = {
                chat_id: chatId,
                title: 'Курс от Ксении',
                description: 'Доступ к курсу и сообществу. С обратной связью от Ксении.',
                payload: 'course-payload',
                provider_token: process.env.PROVIDER_TOKEN,
                currency: 'RUB',
                prices: [
                    { label: 'Курс', amount: 3990000 } // 39900.00 RUB
                ],
                start_parameter: 'pay_course'
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
                    invoice.prices
                );
                await updateUserStep(chatId, 'invoice_sent');
            } catch (err) {
                console.error('Ошибка отправки счёта:', err);
                await bot.sendMessage(chatId, '❌ Не удалось отправить счёт. Попробуйте позже.');
            }
        }
    });

    bot.on('pre_checkout_query', (query) => {
        bot.answerPreCheckoutQuery(query.id, true);
    });

    bot.on('successful_payment', async (msg) => {
        const chatId = msg.chat.id;
        await updateUserStep(chatId, 'successful_payment');
        await bot.sendMessage(chatId, '✅ Оплата прошла успешно! 🎉 Доступ открыт.');
        await bot.sendMessage(chatId, '📦 Вот ссылка на курс: https://t.me/ksenia_kmensky');
    });
}
