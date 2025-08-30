import { getDatabase, ref, onChildAdded, onChildChanged, get } from "firebase/database";
import {app} from "./lib/firebase.js"      // your existing firebase.js
import { sendTelegramMessage } from "./utils/telegram.js"; // your existing telegram.js
import cron from "node-cron";

// Firebase DB
const db = getDatabase(app);

// ======================
// Fetch employees
// ======================
let employeesData = [];

const fetchEmployees = async () => {
  const snapshot = await get(ref(db, "employees"));
  let data = snapshot.val() || {};
  if (!Array.isArray(data)) data = Object.values(data);
  employeesData = data;
  console.log("Employees loaded:", employeesData.length);
};

const getEmployeeByEmail = (email) => {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const emp = employeesData.find((e) => e.email?.trim().toLowerCase() === cleanEmail);
  if (!emp) console.warn(`Employee not found for email: "${email}"`);
  return emp || null;
};

// ======================
// Initialize notifications
// ======================
const initNotifications = async () => {
  await fetchEmployees();
  console.log("Notification worker started ✅");

  // Leave requests
  const leaveRef = ref(db, "leaveRequests");
  onChildAdded(leaveRef, (snapshot) => {
    const leave = snapshot.val();
    const emp = getEmployeeByEmail(leave.email);
    const message = `📝 New Leave Request:
Employee: ${emp?.name || "N/A"}
Employee ID: ${emp?.id || "N/A"}
Email: ${emp?.email || leave.email}
Date: ${leave.date}
Type: ${leave.type || "N/A"}
Reason: ${leave.reason}
Status: ${leave.status}`;
    sendTelegramMessage(message);
  });

  onChildChanged(leaveRef, (snapshot) => {
    const leave = snapshot.val();
    const emp = getEmployeeByEmail(leave.email);
    const message = `✏️ Leave Request Updated:
Employee: ${emp?.name || "N/A"}
Employee ID: ${emp?.id || "N/A"}
Email: ${emp?.email || leave.email}
Date: ${leave.date}
Type: ${leave.type || "N/A"}
Reason: ${leave.reason}
Status: ${leave.status}`;
    sendTelegramMessage(message);
  });

  // Employee logins
  const loginRef = ref(db, "attendance");
  onChildAdded(loginRef, (snapshot) => {
    const date = snapshot.key;
    const employeesLogged = snapshot.val() || {};
    Object.entries(employeesLogged).forEach(([empKey, data]) => {
      const emp = getEmployeeByEmail(data.email);
      const locationAddress =
        typeof data.location === "string" ? data.location : data.location?.address || "N/A";
      const message = `✅ Employee Login:
Employee: ${emp?.name || "N/A"}
Employee ID: ${emp?.id || "N/A"}
Email: ${emp?.email || data.email || empKey}
Date: ${data.date || date}
Time: ${data.istLoginTime || "N/A"}
Location: ${locationAddress}
Device: ${data.device || "N/A"}`;
      sendTelegramMessage(message);
    });
  });

  // Birthday notifications at 9 AM
  cron.schedule("0 9 * * *", async () => {
    try {
      const birthdaysSnapshot = await get(ref(db, "birthdays"));
      const birthdays = birthdaysSnapshot.val() || {};
      const today = new Date();
      const todayDay = today.getDate();
      const todayMonth = today.getMonth();
      Object.entries(birthdays).forEach(([empKey, data]) => {
        if (!data.birthday) return;
        const dob = new Date(data.birthday);
        if (dob.getDate() === todayDay && dob.getMonth() === todayMonth) {
          const emp = getEmployeeByEmail(data.email || empKey);
          const message = `🎉 Happy Birthday!
Employee: ${emp?.name || "N/A"}
Employee ID: ${emp?.id || "N/A"}
Email: ${emp?.email || empKey} 🎂`;
          sendTelegramMessage(message);
        }
      });
    } catch (err) {
      console.error("Birthday check error:", err.message);
    }
  });

  // Week off changes
  const weekOffRef = ref(db, "weekOff");
  onChildAdded(weekOffRef, (snapshot) => {
    const day = snapshot.val();
    employeesData.forEach((emp) => {
      const message = `📅 Week Off Changed:
Employee: ${emp.name}
Employee ID: ${emp.id}
Email: ${emp.email}
New Week Off: ${day}`;
      sendTelegramMessage(message);
    });
  });

  // Optional: refresh employees every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    console.log("Refreshing employees list...");
    await fetchEmployees();
  });
};

// Start the worker
initNotifications();

export { initNotifications };
