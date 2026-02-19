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
  return data;
}

// 자동 정산 실행
async function autoSettlement() {
  const token = await getAccessToken();

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

  const today = new Date(new Date().getTime() + 1000 * 60 * 6 * 9);
  const yy = String(today.getFullYear()).slice(2); // 2자리 연도
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const datePrefix = `${yy}${mm}${dd}`;

  console.log("오늘날짜 : ", today);
  console.log("오늘날짜2 : ", datePrefix);

  // 2️⃣ 오늘 날짜 기준 OTT 결제일과 일치하는 경우 처리
  for (const ottDoc of otts) {
    const ottData = ottDoc.fields;
    if (ottData.isDeleted.stringValue === "true") continue;
    const paymentDay = parseInt(ottData.billingDay.integerValue || "1", 10);
    if (today.getDate() !== paymentDay) continue;

    // 3️⃣ subscriptions에서 해당 OTT 참여 멤버 가져오기
    const subsRes = await firestoreRequest(`subscriptions`, "GET", null, token);
    const subs = subsRes.documents || [];
    const activeSubs = subs.filter(
      (s) =>
        s.fields.ottId.stringValue === ottDoc.name.split("/").pop() &&
        s.fields.active.booleanValue === true,
    );

    const memberCount = activeSubs.length;
    if (memberCount === 0) continue;

    const price = parseInt(ottData.price.integerValue || "0", 10);
    const shareAmount = Math.floor(price / memberCount);

    for (const sub of activeSubs) {
      const memberId = sub.fields.memberId.stringValue;

      // settlements 컬렉션에 member별로 item 생성
      const settlementDoc = {
        fields: {
          memberId: { stringValue: memberId },
          ottId: { stringValue: ottDoc.name.split("/").pop() },
          ottName: {
            stringValue: `${datePrefix} ${ottData.name.stringValue}`,
          },
          amount: { integerValue: shareAmount },
          status: { stringValue: "pending" },
          createdAt: { timestampValue: today.toISOString() },
        },
      };

      await firestoreRequest("settlements", "POST", settlementDoc, token);
      console.log(
        `자동 정산 생성: ${settlementDoc.fields.ottName.stringValue} (${memberId})`,
      );
    }
  }
}

autoSettlement().catch((err) => {
  console.error("자동 정산 에러:", err);
});
