/**
 * scripts/autoSettlement.js
 *
 * GitHub Actions에서 매일 실행용
 * Firebase REST API를 사용해 settlements 자동 생성
 */

import fetch from "node-fetch";
import jwt from "jsonwebtoken";

// 환경변수 가져오기
const { FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID } =
  process.env;

// 🔹 private key 줄바꿈 문제 해결
const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

// 🔹 OAuth 토큰 생성
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    sub: FIREBASE_CLIENT_EMAIL,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/datastore",
  };

  const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: token,
    }),
  });

  const data = await res.json();
  return data.access_token;
}

// 🔹 Firestore REST 호출
async function firestoreRequest(path, method = "GET", body, accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json();
}

// 🔹 메인 실행 함수
async function run() {
  const accessToken = await getAccessToken();

  const today = new Date();
  const todayDate = today.getDate();
  const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM

  // 🔹 OTT 가져오기
  const otts = await firestoreRequest("otts", "GET", null, accessToken);
  console.log("OTTS response: ", JSON.stringify(otts, null, 2));
  if (!otts.documents) return console.log("OTT 문서 없음");

  for (const ottDoc of otts.documents) {
    const ottId = ottDoc.name.split("/").pop();
    const fields = ottDoc.fields;

    const paymentDay = parseInt(fields.paymentDay.integerValue);
    const price = parseInt(fields.monthlyFee.integerValue);
    const ottName = fields.name.stringValue;
    const isRecurring = fields.isRecurring.booleanValue;

    if (!isRecurring) continue;
    if (paymentDay !== todayDate) continue;

    // 🔹 멤버 조회
    const members = await firestoreRequest("members", "GET", null, accessToken);
    if (!members.documents) continue;

    const activeMembers = members.documents.filter(
      (m) => m.fields.isParticipating.booleanValue === true,
    );

    const memberCount = activeMembers.length;
    if (memberCount === 0) continue;

    const amountPerPerson = Math.floor(price / memberCount);

    for (const member of activeMembers) {
      const memberId = member.name.split("/").pop();

      // 🔹 문서 ID 고정 -> 중복 방지
      const docId = `${memberId}_${ottId}_${currentMonth}`;

      await firestoreRequest(
        `settlements?documentId=${docId}`,
        "POST",
        {
          fields: {
            memberId: { stringValue: memberId },
            ottId: { stringValue: ottId },
            ottName: { stringValue: ottName },
            amount: { integerValue: amountPerPerson },
            status: { stringValue: "unsettled" },
            paymentMonth: { stringValue: currentMonth },
            createdAt: { timestampValue: new Date().toISOString() },
            settledAt: { nullValue: null },
          },
        },
        accessToken,
      );
    }
  }

  console.log("자동 정산 완료");
}

run().catch((err) => {
  console.error("자동 정산 에러:", err);
  process.exit(1);
});
