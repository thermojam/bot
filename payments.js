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
                description: 'Доступ к курсу, материалам и чату поддержки.',
                payload: 'course_payload_test',
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
                    invoice.prices
                );
                await updateUserStep(chatId, 'invoice_sent');
            } catch (error) {
                console.error('Ошибка отправки счёта:', error);
                await bot.sendMessage(chatId, '❌ Не удалось создать платёж. Попробуйте позже.');
            }
        }
    });

    bot.on('pre_checkout_query', (query) => {
        bot.answerPreCheckoutQuery(query.id, true);
    });

    bot.on('successful_payment', async (msg) => {
        const chatId = msg.chat.id;
        await updateUserStep(chatId, 'payment_success');
        await bot.sendMessage(chatId, '✅ Оплата прошла успешно! Доступ открыт.');
        await bot.sendMessage(chatId, '📦 Ссылка на курс: https://t.me/ksenia_kmensky');
    });
}
