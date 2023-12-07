require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TOKEN;
const adminUserIds = [709027639, 456141628];
const bot = new TelegramBot(token, { polling: true });
const userStates = {};
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    if (userStates[userId] && userStates[userId].completed) {
        await bot.sendMessage(chatId, 'Заявка № уже отправлена. Ожидайте ответа.');
        return;
    }
    const languageKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Русский', callback_data: 'ru' }],
                [{ text: 'Українська', callback_data: 'ua' }],
            ],
        },
    };

    // Отправляем сообщение с инлайн-клавиатурой для выбора языка
    await bot.sendMessage(chatId, 'Выберите язык | Оберіть мову', languageKeyboard);
});
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const chosenLanguage = callbackQuery.data;

    // Определяем выбранный язык и сохраняем его в контексте пользователя
    const language = chosenLanguage === 'ru' ? 'ru' : 'ua';
    const context = userStates[userId] || { step: 0, data: {}, completed: false, language };
    userStates[userId] = context;

    // Продолжаем разговор
    await bot.answerCallbackQuery(callbackQuery.id);
    await bot.deleteMessage(chatId, callbackQuery.message.message_id);

    // Отправляем приветственное сообщение на выбранном языке
    if (language === 'ru') {
        await simulateTypingAndSendMessage(chatId, 'Привет! Как к вам обращаться?');
    } else {
        await simulateTypingAndSendMessage(chatId, 'Вітаємо! Як до вас звертатися?');
    }
    const nameResponse = await waitForMessage(chatId, userId);
    await handleNameInput(nameResponse);
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
    const agePrompt = context.language === 'ru' ? `Отлично, ${context.data.name}! Теперь ведите ваш возраст.` : `Чудово, ${context.data.name}! Тепер введіть ваш вік.`;
    await simulateTypingAndSendMessage(chatId, agePrompt);

    const ageResponse = await waitForMessage(chatId, userId);
    await handleAgeInput(ageResponse);
}
async function handleAgeInput(response) {
    const chatId = response.chat.id;
    const userId = response.from.id;
    const context = userStates[userId] || { step: 0, data: {}, completed: false };

    const age = parseInt(response.text, 10);

    if (isNaN(age) || age < 0) {
        const ageError = context.language === 'ru' ? "Пожалуйста, введите корректный возраст." : "Будь ласка, введіть коректний вік."
        await simulateTypingAndSendMessage(chatId, ageError);

        // Возвращаемся на предыдущий шаг
        context.step--;

        // Ожидаем ответа на текущий вопрос
        const ageResponse = await waitForMessage(chatId, userId);
        await handleAgeInput(ageResponse);
    } else {
        context.data.age = age;
        context.step++;
        const experiencePromt = context.language === 'ru' ? "Был ли у вас опыт работы на OnlyFans?" : "Чи був у вас досвід роботи на OnlyFans?"
        await simulateTypingAndSendMessage(chatId, experiencePromt);

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
        const photoPromt = context.language === 'ru' ? "Теперь отправьте ваше фото." : "Тепер надішліть ваше фото."
        await simulateTypingAndSendMessage(chatId, photoPromt);
        const photoResponse = await waitForMessage(chatId, userId);
        await handlePhotoInput(photoResponse);
    } else {
        const experienceError = context.language === 'ru' ? "Пожалуйста, введите текстовый ответ." : "Будь ласка, введіть текстову відповідь."
        await simulateTypingAndSendMessage(chatId, experienceError);
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
        const acceptPromt = context.language === 'ru' ? `Ваша заявка отправлена.\nНапишите @llthmngr менеджеру номер своей заявки "№${userId}", и вам ответят в ближайшее время.` : `Вашу заявку відправлено.\nНапишіть @llthmngr менеджеру номер своєї заявки "№${userId}", і вам дадуть відповідь найближчим часом.`
        await simulateTypingAndSendMessage(chatId, acceptPromt);
        await sendNotificationToAdmins(userId, context.data, username);
        context.completed = true;
    } else {
        const photoError = context.language === 'ru' ? "Пожалуйста, отправьте ваше фото." : "Будь ласка, надішліть ваше фото."
        await simulateTypingAndSendMessage(chatId, photoError);

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
            const adminMessage = `Заявка от пользователя: ${userData.name};\nTG: ${userUsername};\nID: "${userId}";\nВозраст: ${userData.age};\nОпыт: ${userData.hasExperience};`;
            await simulateTypingAndSendMessage(adminUserId, adminMessage);
            if (userData.photoFileId) {
                await bot.sendPhoto(adminUserId, userData.photoFileId, { caption: `Фото: ${userData.name}` });
            }
        }
    } catch (error) {
        console.error('Ошибка при отправке уведомления администраторам:', error);
    }
}
