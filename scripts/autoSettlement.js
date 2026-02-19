// scripts/autoSettlement.js
import fetch from "node-fetch";
import jwt from "jsonwebtoken";

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } =
  process.env;
const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

// Firebase OAuth 토큰 발급
async function getAccessToken() {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
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
  const today = new Date();
  const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  // 1️⃣ OTT 문서 가져오기
  const ottsRes = await firestoreRequest("otts", "GET", null, token);
  if (ottsRes.error) return console.error("OTTs 조회 실패:", ottsRes.error);
  const otts = ottsRes.documents || [];

  if (!otts.length) return console.log("OTT 문서 없음");

  // 2️⃣ Subscriptions 문서 가져오기
  const subsRes = await firestoreRequest("subscriptions", "GET", null, token);
  if (subsRes.error)
    return console.error("Subscriptions 조회 실패:", subsRes.error);
  const subs = subsRes.documents || [];

  for (const ottDoc of otts) {
    const ottId = ottDoc.name.split("/").pop();
    const ottData = ottDoc.fields;
    const billingDay = parseInt(ottData.billingDay.integerValue || "1", 10);
    if (today.getDate() !== billingDay) continue;

    const price = parseInt(ottData.price.integerValue, 10);
    const ottName = ottData.name.stringValue;

    // 3️⃣ 해당 OTT에 active 참여자만 선택
    const participants = subs
      .filter((sub) => {
        const subFields = sub.fields;
        return (
          subFields.ottId.stringValue === ottId &&
          subFields.active.booleanValue === true
        );
      })
      .map((sub) => sub.fields.memberId.stringValue);

    if (!participants.length) continue;

    const shareAmount = Math.ceil(price / participants.length);

    // 4️⃣ 각 참여자별 settlement 항목 생성
    for (const memberId of participants) {
      const itemDoc = {
        fields: {
          ottId: { stringValue: ottId },
          ottName: { stringValue: ottName },
          price: { integerValue: shareAmount },
          status: { stringValue: "pending" }, // 미정산
          createdAt: { timestampValue: today.toISOString() },
        },
      };
      const path = `settlements/${yearMonth}/members/${memberId}/items`;
      const res = await firestoreRequest(path, "POST", itemDoc, token);
      console.log(
        `자동 정산 생성: ${ottName} -> ${memberId} (${yearMonth})`,
        res.name || "",
      );
    }
  }
}

autoSettlement().catch((err) => console.error("자동 정산 에러:", err));
