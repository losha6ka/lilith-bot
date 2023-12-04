require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = process.env.TOKEN; // Замените на свой токен
const adminUserIds = [709027639, 456141628];

const bot = new TelegramBot(token, { polling: true });

const userStates = {}; // Объект для хранения состояний пользователей

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Установим начальное состояние пользователя
    userStates[userId] = {
        step: 1, // текущий этап
        data: {} // объект для хранения данных пользователя
    };

    // Начинаем цепочку действий
    bot.sendMessage(chatId, 'Привет! Как к вам обращаться?');
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userState = userStates[userId];

    switch (userState.step) {
        case 1:
            // Сохраняем имя пользователя и переходим к следующему этапу
            userState.data.name = msg.text;
            userState.step++;
            bot.sendMessage(chatId, `Отлично, ${userState.data.name}! Теперь введите ваш возраст.`);
            break;

        case 2:
            // Проверяем возраст пользователя
            const age = parseInt(msg.text, 10);
            if (isNaN(age) || age < 0) {
                bot.sendMessage(chatId, 'Пожалуйста, введите корректный возраст.');
            } else if (age < 18) {
                bot.sendMessage(chatId, 'Извините, но мы работаем только с совершеннолетними.');
                delete userStates[userId]; // Завершаем цепочку для текущего пользователя
            } else {
                userState.data.age = age;
                userState.step++;
                bot.sendMessage(chatId, 'Есть ли у вас опыт работы в OnlyFans? (да/нет)');
            }
            break;

        case 3:
            // Проверяем ответ на наличие опыта работы в OnlyFans
            const hasExperience = msg.text.toLowerCase();
            if (hasExperience === 'да' || hasExperience === 'нет') {
                userState.data.hasExperience = hasExperience;
                userState.step++;
                bot.sendMessage(chatId, 'Теперь отправьте ваше фото.');
            } else {
                bot.sendMessage(chatId, 'Пожалуйста, ответьте "да" или "нет".');
            }
            break;

        case 4:
            // Проверяем, что пришло фото
            if (msg.photo && msg.photo.length > 0) {
                // Получаем информацию о фото
                const photo = msg.photo[0];
                const fileId = photo.file_id;

                // Сохраняем информацию о фото и завершаем цепочку
                userState.data.photoFileId = fileId;
                userState.step++;
                bot.sendMessage(chatId, 'Ваша заявка отправлена.');
                sendNotificationToAdmins(userId, userState.data);
                delete userStates[userId];
            } else {
                bot.sendMessage(chatId, 'Пожалуйста, отправьте фото.');
            }
            break;

        default:
            // Если пользователь завершил цепочку, игнорируем сообщения
            break;
    }
});

function sendNotificationToAdmins(userId, userData) {
    try {
        adminUserIds.forEach((adminUserId) => {
            const adminMessage = `Новая заявка от пользователя ${userData.name} (ID: ${userId}). Возраст: ${userData.age}, Опыт в OnlyFans: ${userData.hasExperience}.`;
            bot.sendMessage(adminUserId, adminMessage);
        });
    } catch (error) {
        console.error('Ошибка при отправке уведомления администраторам:', error);
    }
}
