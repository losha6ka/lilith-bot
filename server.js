require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TOKEN; // Замените на свой токен
const adminUserIds = [709027639, 456141628];
const bot = new TelegramBot(token, { polling: true });
const userStates = {}; // Объект для хранения состояний пользователей

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Проверяем, есть ли у пользователя контекст, если нет - создаем
    const context = userStates[userId] || { step: 0, data: {}, completed: false };
    userStates[userId] = context;

    switch (context.step) {
        case 0:
            bot.sendMessage(chatId, 'Привет! Как к вам обращаться?');

            // Ожидаем ответа на первый вопрос
            bot.once('message', (msg) => {
                if (context && context.step === 0) {
                    context.data.name = msg.text;
                    context.step++;

                    bot.sendMessage(chatId, `Отлично, ${context.data.name}! Теперь введите ваш возраст.`);

                    // Ожидаем ответа на второй вопрос
                    bot.once('message', handleAgeInput);
                }
            });
            break;

        default:
            // Если пользователь завершил цепочку, игнорируем сообщения
            break;
    }
});

// Добавьте обработку других этапов по мере необходимости

function handleAgeInput(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const context = userStates[userId] || { step: 0, data: {}, completed: false };

    const age = parseInt(msg.text, 10);

    if (isNaN(age) || age < 0) {
        bot.sendMessage(chatId, 'Пожалуйста, введите корректный возраст.');

        // Возвращаемся на предыдущий шаг
        context.step--;

        // Ожидаем ответа на текущий вопрос
        bot.once('message', handleAgeInput);
    } else if (age < 18) {
        bot.sendMessage(chatId, 'Извините, но мы работаем только с совершеннолетними.');
        context.completed = true;
    } else {
        context.data.age = age;
        context.step++;
        bot.sendMessage(chatId, 'Есть ли у вас опыт работы в OnlyFans? (да/нет)');

        // Ожидаем ответа на третий вопрос
        bot.once('message', handleExperienceInput);
    }
}

function handleExperienceInput(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const context = userStates[userId] || { step: 0, data: {}, completed: false };

    // Обрабатываем ответ пользователя
    const hasExperience = msg.text.toLowerCase();

    if (['да', 'нет'].includes(hasExperience)) {
        context.data.hasExperience = hasExperience;
        context.step++;
        bot.sendMessage(chatId, 'Теперь отправьте ваше фото.');

        // Ожидаем ответа на четвертый вопрос
        bot.once('message', handlePhotoInput);
    } else {
        bot.sendMessage(chatId, 'Пожалуйста, ответьте "да" или "нет".');

        // Возвращаемся на предыдущий шаг
        context.step--;

        // Ожидаем ответа на текущий вопрос
        bot.once('message', handleExperienceInput);
    }
}

function handlePhotoInput(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const context = userStates[userId] || { step: 0, data: {}, completed: false };

    // Обрабатываем ответ пользователя
    if (msg.photo && msg.photo.length > 0) {
        const photo = msg.photo[0];
        const fileId = photo.file_id;
        context.data.photoFileId = fileId;
        context.step++;
        bot.sendMessage(chatId, 'Ваша заявка отправлена.');
        sendNotificationToAdmins(userId, context.data);
        context.completed = true;
    } else {
        bot.sendMessage(chatId, 'Пожалуйста, отправьте фото.');

        // Возвращаемся на предыдущий шаг
        context.step--;

        // Ожидаем ответа на текущий вопрос
        bot.once('message', handlePhotoInput);
    }
}

function sendNotificationToAdmins(userId, userData) {
    try {
        adminUserIds.forEach((adminUserId) => {
            const userUsername = userData.username ? `@${userData.username}` : '(@)';
            const adminMessage = `Новая заявка от пользователя ${userData.name} ${userUsername} (ID: ${userId}). Возраст: ${userData.age}, Опыт в OnlyFans: ${userData.hasExperience}.`;
            bot.sendMessage(adminUserId, adminMessage);
            if (userData.photoFileId) {
                bot.sendPhoto(adminUserId, userData.photoFileId, { caption: 'Фото пользователя' });
            }
        });
    } catch (error) {
        console.error('Ошибка при отправке уведомления администраторам:', error);
    }
}
