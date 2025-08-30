// utils/telegramQueue.js
import { sendTelegramMessage } from "./telegram.js";

let messageQueue = [];
let sending = false;

const processQueue = async () => {
  if (sending || messageQueue.length === 0) return;
  sending = true;

  const message = messageQueue.shift();
  try {
    await sendTelegramMessage(message); // send the actual message
  } catch (err) {
    console.error("Telegram send error:", err.message);
  }

  sending = false;

  if (messageQueue.length > 0) {
    setTimeout(processQueue, 1000); // wait 1 second before next message
  }
};

// Function to queue messages
export const queueTelegramMessage = (msg) => {
  messageQueue.push(msg);
  processQueue();
};
