// scripts/autoSettlement.js
import fetch from "node-fetch";
import jwt from "jsonwebtoken";

// GitHub Secrets에서 환경변수 가져오기
const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } =
  process.env;

// private_key 줄바꿈 처리
const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

// Firebase OAuth 토큰 발급
async function getAccessToken() {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600; // 1시간 유효
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    sub: FIREBASE_CLIENT_EMAIL,
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp,
    scope: "https://www.googleapis.com/auth/datastore",
  };
  const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`,
  });
  const data = await res.json();
  if (data.access_token) return data.access_token;
  console.error("AccessToken 발급 실패:", data);
  process.exit(1);
}

// Firestore REST API 요청 함수
async function firestoreRequest(path, method = "GET", body, accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  const data = await res.json();
  console.log(`${method} ${path} response:`, JSON.stringify(data, null, 2));
  return data;
}

// 자동 정산 실행
async function autoSettlement() {
  const token = await getAccessToken();

  console.log("FIREBASE_PROJECT_ID", FIREBASE_PROJECT_ID);
  console.log("FIREBASE_CLIENT_EMAIL", FIREBASE_CLIENT_EMAIL);
  console.log("FIREBASE_PRIVATE_KEY", FIREBASE_PRIVATE_KEY);

  // 1️⃣ OTT 컬렉션 가져오기
  const ottsRes = await firestoreRequest("otts", "GET", null, token);
  if (ottsRes.error) {
    console.error("OTTs 조회 실패:", ottsRes.error);
    return;
  }
  const otts = ottsRes.documents || [];
  if (otts.length === 0) {
    console.log("OTT 문서 없음");
    return;
  }

  // 2️⃣ 오늘 날짜 기준 정산 생성
  const today = new Date();
  const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  for (const ottDoc of otts) {
    const ottData = ottDoc.fields;
    const paymentDay = parseInt(ottData.paymentDay.integerValue || "1", 10);
    if (today.getDate() !== paymentDay) continue;

    // settlements 컬렉션에 문서 생성
    const settlementDoc = {
      fields: {
        ottId: { stringValue: ottDoc.name.split("/").pop() }, // 문서 ID
        yearMonth: { stringValue: yearMonth },
        createdAt: { timestampValue: today.toISOString() },
      },
    };
    await firestoreRequest("settlements", "POST", settlementDoc, token);
    console.log(`자동 정산 생성: ${ottDoc.name} (${yearMonth})`);
  }
}

autoSettlement().catch((err) => {
  console.error("자동 정산 에러:", err);
});
