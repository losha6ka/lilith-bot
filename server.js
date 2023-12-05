require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TOKEN;
const adminUserIds = [709027639, 456141628];
const bot = new TelegramBot(token, { polling: true });
const userStates = {};

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;
    // Проверяем, была ли уже отправлена заявка от пользователя
    if (userStates[userId] && userStates[userId].completed) {
        await bot.sendMessage(chatId, `Заявка "№${userId}" уже отправлена.\nОжидайте ответа.`);
        return;
    }

    const context = userStates[userId] || { step: 0, data: {}, completed: false };
    userStates[userId] = context;

    switch (context.step) {
        case 0:
            await simulateTypingAndSendMessage(chatId, 'Привет! Как к вам обращаться?');
            const nameResponse = await waitForMessage(chatId, userId);
            await handleNameInput(nameResponse);
            break;

        default:
            // Если пользователь завершил цепочку, игнорируем сообщения
            break;
    }
});
async function simulateTypingAndSendMessage(chatId, message) {
    const typingDuration = 1000; // Длительность симуляции в миллисекундах (1 секунда)

    const startTypingTime = new Date().getTime();
    await bot.sendChatAction(chatId, 'typing');

    // Дожидаемся окончания симуляции или до отправки реального сообщения
    while (new Date().getTime() - startTypingTime < typingDuration) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Регулируем интервал проверки
    }

    // Отправляем реальное сообщение после симуляции
    await bot.sendMessage(chatId, message);
}

async function waitForMessage(chatId, userId) {
    return new Promise((resolve) => {
        bot.on('message', (msg) => {
            if (msg.chat.id === chatId && msg.from.id === userId) {
                resolve(msg);
            }
        });
    });
}

async function handleNameInput(response) {
    const chatId = response.chat.id;
    const userId = response.from.id;
    const context = userStates[userId] || { step: 0, data: {}, completed: false };

    context.data.name = response.text;
    context.step++;

    await simulateTypingAndSendMessage(chatId, `Отлично, ${context.data.name}! Теперь введите ваш возраст.`);

    const ageResponse = await waitForMessage(chatId, userId);
    await handleAgeInput(ageResponse);
}

// Остальной код остается без изменений

async function handleAgeInput(response) {
    const chatId = response.chat.id;
    const userId = response.from.id;
    const context = userStates[userId] || { step: 0, data: {}, completed: false };

    const age = parseInt(response.text, 10);

    if (isNaN(age) || age < 0) {
        await simulateTypingAndSendMessage(chatId, 'Пожалуйста, введите корректный возраст.');

        // Возвращаемся на предыдущий шаг
        context.step--;

        // Ожидаем ответа на текущий вопрос
        const ageResponse = await waitForMessage(chatId, userId);
        await handleAgeInput(ageResponse);
    } else {
        context.data.age = age;
        context.step++;
        await simulateTypingAndSendMessage(chatId, 'Был ли у вас опыт работы на OnlyFans?');

        const experienceResponse = await waitForMessage(chatId, userId);
        await handleExperienceInput(experienceResponse);
    }
}

async function handleExperienceInput(response) {
    const chatId = response.chat.id;
    const userId = response.from.id;
    const context = userStates[userId] || { step: 0, data: {}, completed: false };

    // Проверяем, что ответ пользователя - только текст
    if (response.text) {
        // Обрабатываем ответ пользователя
        context.data.hasExperience = response.text;
        context.step++;

        await simulateTypingAndSendMessage(chatId, 'Теперь отправьте ваше фото.');
        const photoResponse = await waitForMessage(chatId, userId);
        await handlePhotoInput(photoResponse);
    } else {
        // Если ответ пользователя не является текстом, запрашиваем ответ еще раз
        await simulateTypingAndSendMessage(chatId, 'Пожалуйста, введите текстовый ответ.');
        const experienceResponse = await waitForMessage(chatId, userId);
        await handleExperienceInput(experienceResponse);
    }
}
async function handlePhotoInput(response) {
    const chatId = response.chat.id;
    const userId = response.from.id;
    const username = response.from.username;
    const context = userStates[userId] || { step: 0, data: {}, completed: false };

    // Обрабатываем ответ пользователя
    if (response.photo && response.photo.length > 0) {
        const photo = response.photo[0];
        const fileId = photo.file_id;
        context.data.photoFileId = fileId;
        context.step++;
        await simulateTypingAndSendMessage(chatId, `Ваша заявка отправлена.\nНапишите @llthmngr менеджеру номер своей заявки "№${userId}", и вам ответят в ближайшее время.`);
        await sendNotificationToAdmins(userId, context.data, username);
        context.completed = true;
    } else {
        await simulateTypingAndSendMessage(chatId, 'Пожалуйста, отправьте фото.');

        // Возвращаемся на предыдущий шаг
        context.step--;

        // Ожидаем ответа на текущий вопрос
        const photoResponse = await waitForMessage(chatId, userId);
        await handlePhotoInput(photoResponse);
    }
}

async function sendNotificationToAdmins(userId, userData, username) {
    try {
        for (const adminUserId of adminUserIds) {
            const userUsername = username ? `@${username}` : '@пусто';
            const adminMessage = `Заявка от пользователя - "${userData.name}", ${userUsername};\n(ID: ${userId});\nВозраст: ${userData.age};\nОпыт в OnlyFans: ${userData.hasExperience};`;
            await simulateTypingAndSendMessage(adminUserId, adminMessage);
            if (userData.photoFileId) {
                await bot.sendPhoto(adminUserId, userData.photoFileId, { caption: `Фото модели: ${userData.name}` });
            }
        }
    } catch (error) {
        console.error('Ошибка при отправке уведомления администраторам:', error);
    }
}
