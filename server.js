require("dotenv").config();
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const token = process.env.TOKEN; // Замените на свой токен
const baseUrl = process.env.BASE_URL; // Замените на базовый URL вашего сервера

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Отправляем запрос на сервер
    sendRequestToServer(msg.from)
        .then(() => {
            bot.sendMessage(chatId, 'Запрос успешно отправлен на сервер.');
        })
        .catch((error) => {
            console.error('Ошибка при отправке запроса на сервер:', error);
            bot.sendMessage(chatId, 'Произошла ошибка при отправке запроса на сервер.');
        });
});

async function sendRequestToServer(user) {
    try {
        let dataSend = {
            name: user.first_name,
            telegram: user.username,
        };

        const res = await fetch(`${baseUrl}/email/sendEmail`, {
            method: 'POST',
            body: JSON.stringify(dataSend),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            throw new Error(`Ошибка: ${res.status} - ${res.statusText}`);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        throw error;
    }
}
