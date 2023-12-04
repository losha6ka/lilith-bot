require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TOKEN; // Замените на свой токен
const adminUserIds = [709027639, 456141628];

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Отправляем уведомление администраторам
    sendNotificationToAdmins(msg.from)
        .then(() => {
            bot.sendMessage(chatId, 'Заявка отправлена.');
        })
        .catch((error) => {
            console.error('Ошибка при отправке заявки:', error);
            bot.sendMessage(chatId, 'Произошла ошибка при отправке заявки.');
        });
});

async function sendNotificationToAdmins(user) {
    try {
        // Отправка уведомления администраторам в их ЛС
        adminUserIds.forEach((adminUserId) => {
            bot.sendMessage(adminUserId, `Пользователь ${user.first_name} (@${user.username}).`);
        });
    } catch (error) {
        console.error('Ошибка при отправке заявки:', error);
        throw error;
    }
}
