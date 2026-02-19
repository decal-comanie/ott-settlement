import { db } from "./firebase";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";

export const runAutoSettlement = async () => {
  try {
    const today = new Date();
    const todayDate = today.getDate();

    const ottSnap = await getDocs(collection(db, "otts"));
    const subSnap = await getDocs(collection(db, "subscriptions"));
    const settlementSnap = await getDocs(collection(db, "settlements"));

    const otts = ottSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const subs = subSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const settlements = settlementSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    for (let ott of otts) {
      if (ott.billingDay !== todayDate) continue;

      const activeSubs = subs.filter(
        (s) => s.ottId === ott.id && s.active === true,
      );

      if (activeSubs.length === 0) continue;

      const perPerson = Math.floor(ott.price / activeSubs.length);

      for (let sub of activeSubs) {
        // 🔥 같은 날짜에 이미 생성됐는지 확인 (중복 방지)
        const alreadyExists = settlements.find(
          (s) =>
            s.memberId === sub.memberId &&
            s.ottName === ott.name &&
            new Date(s.createdAt.seconds * 1000).toDateString() ===
              today.toDateString(),
        );

        if (alreadyExists) continue;

        await addDoc(collection(db, "settlements"), {
          memberId: sub.memberId,
          ottName: ott.name,
          amount: perPerson,
          status: "pending",
          createdAt: new Date(),
        });

        console.log(`${ott.name} - 자동 정산 생성`);
      }
    }

    console.log("✅ 자동 정산 완료");
  } catch (error) {
    console.error("❌ 자동 정산 오류:", error);
  }
};
