require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TOKEN; // Замените на свой токен
const adminUserIds = [709027639, 456141628];
const bot = new TelegramBot(token, { polling: true });
const userStates = {}; // Объект для хранения состояний пользователей

// Добавьте функцию для эмуляции печати
function simulateTyping(chatId) {
    bot.sendChatAction(chatId, 'typing');
}

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Проверяем, есть ли у пользователя контекст, если нет - создаем
    const context = userStates[userId] || { step: 0, data: {}, completed: false };
    userStates[userId] = context;

    simulateTyping(chatId);

    switch (context.step) {
        case 0:
            bot.sendMessage(chatId, 'Привет! Как к вам обращаться?');

            // Ожидаем ответа на первый вопрос
            bot.once('message', (msg) => {
                if (context && context.step === 0) {
                    context.data.name = msg.text;
                    context.step++;

                    simulateTyping(chatId);
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

// Обработчик ввода возраста
function handleAgeInput(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const context = userStates[userId] || { step: 0, data: {}, completed: false };

    simulateTyping(chatId);

    const age = parseInt(msg.text, 10);

    if (isNaN(age) || age < 0) {
        simulateTyping(chatId);
        bot.sendMessage(chatId, 'Пожалуйста, введите корректный возраст.');

        // Возвращаемся на предыдущий шаг
        context.step--;

        // Ожидаем ответа на текущий вопрос
        bot.once('message', handleAgeInput);
    } else {
        context.data.age = age;
        context.step++;
        simulateTyping(chatId);
        bot.sendMessage(chatId, 'Был ли у вас опыт работы на OnlyFans?');

        // Ожидаем ответа на третий вопрос
        bot.once('message', handleExperienceInput);
    }
}

// Обработчик ввода опыта работы на OnlyFans
function handleExperienceInput(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const context = userStates[userId] || { step: 0, data: {}, completed: false };

    // Обрабатываем ответ пользователя
    context.data.hasExperience = msg.text;
    context.step++;
    simulateTyping(chatId);
    bot.sendMessage(chatId, 'Теперь отправьте ваше фото.');

    // Ожидаем ответа на четвертый вопрос
    bot.once('message', handlePhotoInput);
}

// Обработчик ввода фото
function handlePhotoInput(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const context = userStates[userId] || { step: 0, data: {}, completed: false };

    simulateTyping(chatId);

    // Обрабатываем ответ пользователя
    if (msg.photo && msg.photo.length > 0) {
        const photo = msg.photo[0];
        const fileId = photo.file_id;
        context.data.photoFileId = fileId;
        context.step++;
        simulateTyping(chatId);
        bot.sendMessage(chatId, `Ваша заявка отправлена.\nНапишите @llthmngr менеджеру номер своей заявки (№${userId}), и вам ответят в ближайшее время.`);
        sendNotificationToAdmins(userId, context.data);
        context.completed = true;
    } else {
        simulateTyping(chatId);
        bot.sendMessage(chatId, 'Пожалуйста, отправьте фото.');

        // Возвращаемся на предыдущий шаг
        context.step--;

        // Ожидаем ответа на текущий вопрос
        bot.once('message', handlePhotoInput);
    }
}

// Отправка уведомления админам
function sendNotificationToAdmins(userId, userData) {
    try {
        adminUserIds.forEach((adminUserId) => {
            const userUsername = userData.username ? `@${userData.username}` : '(@пусто)';
            const adminMessage = `Заявка от пользователя - ${userData.name}, ${userUsername};\n(ID: ${userId});\nВозраст: ${userData.age};\nОпыт в OnlyFans: ${userData.hasExperience};`;
            bot.sendMessage(adminUserId, adminMessage);
            bot.sendPhoto(adminUserId, userData.photoFileId, { caption: `Фото модели: ${userData.name}` });
        });
    } catch (error) {
        console.error('Ошибка при отправке уведомления администраторам:', error);
    }
}
