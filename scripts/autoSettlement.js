import fetch from "node-fetch";
import jwt from "jsonwebtoken";

// GitHub Secrets 환경변수
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

// Firestore REST API 요청
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
  if (!otts.length) {
    console.log("OTT 문서 없음");
    return;
  }

  // 2️⃣ 멤버 컬렉션 가져오기
  const membersRes = await firestoreRequest("members", "GET", null, token);
  if (membersRes.error) {
    console.error("Members 조회 실패:", membersRes.error);
    return;
  }
  const members = membersRes.documents || [];
  if (!members.length) {
    console.log("멤버 문서 없음");
    return;
  }

  const today = new Date();
  const day = today.getDate();
  const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  for (const ottDoc of otts) {
    const ottData = ottDoc.fields;
    const paymentDay = parseInt(ottData.billingDay?.integerValue || "1", 10);
    if (day !== paymentDay) continue;

    const ottId = ottDoc.name.split("/").pop();
    const name = ottData.name.stringValue;
    const price = parseInt(ottData.price.integerValue, 10);

    for (const memberDoc of members) {
      const memberId = memberDoc.name.split("/").pop();

      // settlements/{yearMonth}/members/{memberId}/items 컬렉션에 추가
      const itemDoc = {
        fields: {
          ottId: { stringValue: ottId },
          name: { stringValue: name },
          price: { integerValue: price },
          status: { stringValue: "pending" }, // 미정산 상태
          createdAt: { timestampValue: today.toISOString() },
        },
      };

      const path = `settlements/${yearMonth}/members/${memberId}/items`;
      await firestoreRequest(path, "POST", itemDoc, token);
      console.log(`자동 정산 생성: ${name} -> ${memberId} (${yearMonth})`);
    }
  }

  console.log("자동 정산 완료:", yearMonth);
}

autoSettlement().catch((err) => console.error("자동 정산 에러:", err));
