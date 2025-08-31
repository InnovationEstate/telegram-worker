

// import { getDatabase, ref, onChildAdded, onChildChanged, get } from "firebase/database";
// import { app } from "./lib/firebase.js"; // your existing firebase.js
// import { queueTelegramMessage } from "./utils/telegramQueue.js"; // use queue
// import cron from "node-cron";

// // Firebase DB
// const db = getDatabase(app);

// // ======================
// // Fetch employees
// // ======================
// let employeesData = [];

// const fetchEmployees = async () => {
//   const snapshot = await get(ref(db, "employees"));
//   let data = snapshot.val() || {};
//   if (!Array.isArray(data)) data = Object.values(data);
//   employeesData = data;
//   console.log("Employees loaded:", employeesData.length);
// };

// const getEmployeeByEmail = (email) => {
//   if (!email) return null;
//   const cleanEmail = email.trim().toLowerCase();
//   const emp = employeesData.find((e) => e.email?.trim().toLowerCase() === cleanEmail);
//   if (!emp) console.warn(`Employee not found for email: "${email}"`);
//   return emp || null;
// };

// // ======================
// // Initialize notifications
// // ======================
// const initNotifications = async () => {
//   await fetchEmployees();
//   console.log("Notification worker started ✅");

//   // Leave requests
//   const leaveRef = ref(db, "leaveRequests");
//   onChildAdded(leaveRef, (snapshot) => {
//     const leave = snapshot.val();
//     const emp = getEmployeeByEmail(leave.email);
//     const message = `📝 New Leave Request:
// Employee: ${emp?.name || "N/A"}
// Employee ID: ${emp?.id || "N/A"}
// Email: ${emp?.email || leave.email}
// Date: ${leave.date}
// Type: ${leave.type || "N/A"}
// Reason: ${leave.reason}
// Status: ${leave.status}`;
//     queueTelegramMessage(message);
//   });

//   onChildChanged(leaveRef, (snapshot) => {
//     const leave = snapshot.val();
//     const emp = getEmployeeByEmail(leave.email);
//     const message = `✏️ Leave Request Updated:
// Employee: ${emp?.name || "N/A"}
// Employee ID: ${emp?.id || "N/A"}
// Email: ${emp?.email || leave.email}
// Date: ${leave.date}
// Type: ${leave.type || "N/A"}
// Reason: ${leave.reason}
// Status: ${leave.status}`;
//     queueTelegramMessage(message);
//   });

//   // Employee logins
//   const loginRef = ref(db, "attendance");
//   onChildAdded(loginRef, (snapshot) => {
//     const date = snapshot.key;
//     const employeesLogged = snapshot.val() || {};
//     Object.entries(employeesLogged).forEach(([empKey, data]) => {
//       const emp = getEmployeeByEmail(data.email);
//       const locationAddress =
//         typeof data.location === "string" ? data.location : data.location?.address || "N/A";
//       const message = `✅ Employee Login:
// Employee: ${emp?.name || "N/A"}
// Employee ID: ${emp?.id || "N/A"}
// Email: ${emp?.email || data.email || empKey}
// Date: ${data.date || date}
// Time: ${data.istLoginTime || "N/A"}
// Location: ${locationAddress}
// Device: ${data.device || "N/A"}`;
//       queueTelegramMessage(message);
//     });
//   });

//   // Birthday notifications at 9 AM
//   cron.schedule("0 9 * * *", async () => {
//     try {
//       const birthdaysSnapshot = await get(ref(db, "birthdays"));
//       const birthdays = birthdaysSnapshot.val() || {};
//       const today = new Date();
//       const todayDay = today.getDate();
//       const todayMonth = today.getMonth();
//       Object.entries(birthdays).forEach(([empKey, data]) => {
//         if (!data.birthday) return;
//         const dob = new Date(data.birthday);
//         if (dob.getDate() === todayDay && dob.getMonth() === todayMonth) {
//           const emp = getEmployeeByEmail(data.email || empKey);
//           const message = `🎉 Happy Birthday!
// Employee: ${emp?.name || "N/A"}
// Employee ID: ${emp?.id || "N/A"}
// Email: ${emp?.email || empKey} 🎂`;
//           queueTelegramMessage(message);
//         }
//       });
//     } catch (err) {
//       console.error("Birthday check error:", err.message);
//     }
//   });

//   // Week off changes
//   const weekOffRef = ref(db, "weekOff");
//   onChildAdded(weekOffRef, (snapshot) => {
//     const day = snapshot.val();
//     employeesData.forEach((emp) => {
//       const message = `📅 Week Off Changed:
// Employee: ${emp.name}
// Employee ID: ${emp.id}
// Email: ${emp.email}
// New Week Off: ${day}`;
//       queueTelegramMessage(message);
//     });
//   });

//   // Optional: refresh employees every 30 minutes
//   cron.schedule("*/30 * * * *", async () => {
//     console.log("Refreshing employees list...");
//     await fetchEmployees();
//   });
// };

// // Start the worker
// initNotifications();

// export { initNotifications };


// worker.js
import { 
  getDatabase, 
  ref, 
  onChildAdded, 
  onChildChanged, 
  get 
} from "firebase/database";
import { app } from "./lib/firebase.js";
import { queueTelegramMessage } from "./utils/telegramQueue.js";
import cron from "node-cron";

// Firebase DB
const db = getDatabase(app);

// ======================
// Employee data cache
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
// Setup Attendance Watcher (per day)
// ======================
const setupLoginWatcher = () => {
  const today = new Date().toISOString().split("T")[0]; // e.g. 2025-08-31
  const loginRef = ref(db, `attendance/${today}`);

  console.log(`Watching logins for date: ${today}`);

  // New login (child added)
  onChildAdded(loginRef, (snapshot) => {
    const data = snapshot.val() || {};
    const emp = getEmployeeByEmail(data.email);

    const locationAddress =
      typeof data.location === "string"
        ? data.location
        : data.location?.address || "N/A";

    const message = `✅ Employee Login:
Employee: ${emp?.name || "N/A"}
Employee ID: ${emp?.id || "N/A"}
Email: ${emp?.email || data.email || snapshot.key}
Date: ${data.date || today}
Time: ${data.istLoginTime || "N/A"}
Location: ${locationAddress}
Device: ${data.device || "N/A"}`;

    console.log("Login detected:", message);
    queueTelegramMessage(message);
  });

  // If login details change (time, location, device)
  onChildChanged(loginRef, (snapshot) => {
    const data = snapshot.val() || {};
    const emp = getEmployeeByEmail(data.email);

    const message = `✏️ Employee Login Updated:
Employee: ${emp?.name || "N/A"}
Employee ID: ${emp?.id || "N/A"}
Email: ${emp?.email || data.email || snapshot.key}
Date: ${data.date || today}
Time: ${data.istLoginTime || "N/A"}
Location: ${data.location?.address || data.location || "N/A"}
Device: ${data.device || "N/A"}`;

    console.log("Login updated:", message);
    queueTelegramMessage(message);
  });
};

// ======================
// Initialize Notifications
// ======================
const initNotifications = async () => {
  await fetchEmployees();
  console.log("Notification worker started ✅");

  // --- Leave Requests ---
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
    queueTelegramMessage(message);
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
    queueTelegramMessage(message);
  });

  // --- Employee Logins (today only, refreshed daily) ---
  setupLoginWatcher();
  cron.schedule("0 0 * * *", () => {
    console.log("Midnight reset → setting up new login watcher...");
    setupLoginWatcher();
  });

  // --- Birthday Notifications (9 AM) ---
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
          queueTelegramMessage(message);
        }
      });
    } catch (err) {
      console.error("Birthday check error:", err.message);
    }
  });

  // --- Week off changes ---
  const weekOffRef = ref(db, "weekOff");
  onChildAdded(weekOffRef, (snapshot) => {
    const day = snapshot.val();
    employeesData.forEach((emp) => {
      const message = `📅 Week Off Changed:
Employee: ${emp.name}
Employee ID: ${emp.id}
Email: ${emp.email}
New Week Off: ${day}`;
      queueTelegramMessage(message);
    });
  });

  // --- Refresh employees list every 30 minutes ---
  cron.schedule("*/30 * * * *", async () => {
    console.log("Refreshing employees list...");
    await fetchEmployees();
  });
};

// Start the worker
initNotifications();

export { initNotifications };
