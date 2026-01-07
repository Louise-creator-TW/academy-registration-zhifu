// src/templates/flex-messages.js

// 1. 報名成功確認卡片
export function createRegistrationConfirmationCard(data) {
  return {
    type: "flex",
    altText: "報名成功通知",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "報名成功", weight: "bold", size: "xl", color: "#FFFFFF" }
        ],
        backgroundColor: "#27AE60"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: data.courseName, weight: "bold", size: "lg", wrap: true },
          { type: "separator", margin: "md" },
          { type: "text", text: `學員：${data.studentName}`, margin: "md" },
          { type: "text", text: `時間：${data.time}` },
          { type: "text", text: `地點：${data.location}` }
        ]
      }
    }
  };
}

// 2. 繳費提醒卡片
export function createPaymentReminderCard(data) {
    return {
        type: "text",
        text: `請匯款 ${data.amount} 元至 ${data.bankName} (${data.accountNumber})`
    };
}