// import React, { useEffect, useState } from "react";
// import {
//   Container,
//   Card,
//   CardContent,
//   Typography,
//   Grid,
//   Button,
//   Box,
//   Collapse,
//   List,
//   ListItem,
//   ListItemText,
//   Checkbox,
//   Divider,
// } from "@mui/material";

// import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

// import { db } from "../firebase";

// const SettlementPage = () => {
//   const [members, setMembers] = useState([]);
//   const [settlements, setSettlements] = useState([]);
//   const [expanded, setExpanded] = useState({});
//   const [selected, setSelected] = useState([]);

//   const fetchData = async () => {
//     const memberSnap = await getDocs(collection(db, "members"));
//     const settlementSnap = await getDocs(collection(db, "settlements"));

//     console.log(
//       "memberSnap",
//       memberSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
//     );
//     console.log(
//       "settlementSnap",
//       settlementSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
//     );

//     setMembers(memberSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
//     setSettlements(settlementSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
//   };

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const toggleExpand = (memberId, type) => {
//     setExpanded({
//       ...expanded,
//       [memberId]: expanded[memberId] === type ? null : type,
//     });
//     setSelected([]);
//   };

//   const toggleSelect = (id) => {
//     setSelected((prev) =>
//       prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
//     );
//   };

//   const processSettlement = async (status) => {
//     for (let id of selected) {
//       await updateDoc(doc(db, "settlements", id), {
//         status,
//         completedAt: status === "completed" ? new Date() : null,
//       });
//     }
//     setSelected([]);
//     fetchData();
//   };

//   const getMemberSettlements = (memberId, status) =>
//     settlements.filter((s) => s.memberId === memberId && s.status === status);

//   const getTotalPending = (memberId) => {
//     return getMemberSettlements(memberId, "pending").reduce(
//       (sum, item) => sum + item.amount,
//       0,
//     );
//   };

//   return (
//     <Container sx={{ mt: 4 }}>
//       <Grid container spacing={3}>
//         {members.map((member) => {
//           const pendingList = getMemberSettlements(member.id, "pending");
//           const allList = settlements.filter((s) => s.memberId === member.id);
//           const totalPending = getTotalPending(member.id);

//           return (
//             <Grid item xs={12} md={6} key={member.id}>
//               <Card>
//                 <CardContent>
//                   <Typography variant="h6">{member.name}</Typography>

//                   <Typography variant="h4" color="error">
//                     {totalPending.toLocaleString()}원
//                   </Typography>

//                   <Box display="flex" gap={2} mt={2}>
//                     <Button
//                       variant="outlined"
//                       onClick={() => toggleExpand(member.id, "pending")}
//                     >
//                       미정산 내역
//                     </Button>
//                     <Button
//                       variant="outlined"
//                       onClick={() => toggleExpand(member.id, "all")}
//                     >
//                       총 정산 내역
//                     </Button>
//                   </Box>

//                   {/* 미정산 */}
//                   <Collapse in={expanded[member.id] === "pending"}>
//                     <Box mt={2}>
//                       <Divider />
//                       <List>
//                         {pendingList.map((item) => (
//                           <ListItem key={item.id}>
//                             <Checkbox
//                               checked={selected.includes(item.id)}
//                               onChange={() => toggleSelect(item.id)}
//                             />
//                             <ListItemText
//                               primary={item.ottName}
//                               secondary={`${item.amount.toLocaleString()}원`}
//                             />
//                           </ListItem>
//                         ))}
//                       </List>

//                       {pendingList.length > 0 && (
//                         <Button
//                           variant="contained"
//                           fullWidth
//                           onClick={() => processSettlement("completed")}
//                         >
//                           선택 정산 완료
//                         </Button>
//                       )}
//                     </Box>
//                   </Collapse>

//                   {/* 총 내역 */}
//                   <Collapse in={expanded[member.id] === "all"}>
//                     <Box mt={2}>
//                       <Divider />
//                       <List>
//                         {allList.map((item) => (
//                           <ListItem key={item.id}>
//                             <Checkbox
//                               checked={selected.includes(item.id)}
//                               onChange={() => toggleSelect(item.id)}
//                             />
//                             <ListItemText
//                               primary={item.ottName}
//                               secondary={`${item.amount.toLocaleString()}원}`}
//                             />
//                             <Typography
//                               color={
//                                 item.status === "completed" ? "green" : "red"
//                               }
//                             >
//                               {item.status === "completed" ? "완료" : "미완료"}
//                             </Typography>
//                           </ListItem>
//                         ))}
//                       </List>

//                       {allList.length > 0 && (
//                         <Button
//                           variant="contained"
//                           color="warning"
//                           fullWidth
//                           onClick={() => processSettlement("pending")}
//                         >
//                           선택 정산 취소
//                         </Button>
//                       )}
//                     </Box>
//                   </Collapse>
//                 </CardContent>
//               </Card>
//             </Grid>
//           );
//         })}
//       </Grid>
//     </Container>
//   );
// };

// export default SettlementPage;

import React, { useEffect, useState } from "react";
import {
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Box,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Divider,
} from "@mui/material";

import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const SettlementPage = () => {
  const [members, setMembers] = useState([]);
  const [settlements, setSettlements] = useState([]); // [{ memberId, items: [] }]
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState([]);

  // 🔹 모든 멤버, 모든 정산 데이터 가져오기
  const fetchData = async () => {
    try {
      // 1️⃣ 멤버 가져오기
      const memberSnap = await getDocs(collection(db, "members"));
      const membersData = memberSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setMembers(membersData);

      console.log("memberSnapDocs", memberSnap);

      // 2️⃣ settlements 모든 yearMonth 문서 가져오기
      const yearMonthSnap = await getDocs(collection(db, "settlements"));
      const allSettlements = [];

      console.log("yearMonthSnap : ", yearMonthSnap);

      console.log("yearMonthSnapDocs", yearMonthSnap.docs);

      for (let ymDoc of yearMonthSnap.docs) {
        const yearMonth = ymDoc.id;

        for (let member of membersData) {
          const memberItemsSnap = await getDocs(
            collection(
              db,
              "settlements",
              yearMonth,
              "members",
              member.id,
              "items",
            ),
          );

          const items = memberItemsSnap.docs.map((d) => ({
            id: d.id,
            yearMonth,
            ...d.data(),
          }));

          if (items.length > 0) {
            allSettlements.push({
              memberId: member.id,
              items,
            });
          }
        }
      }

      console.log("allSettlements", allSettlements);

      setSettlements(allSettlements);
    } catch (err) {
      console.error("정산 데이터 불러오기 실패:", err);
      setSettlements([]);
    }
  };

  const fetchAllSettlements = async () => {
    // 1. settlements 컬렉션의 모든 문서 ID 가져오기
    const settlementsCol = collection(db, "settlements");
    const settlementsSnap = await getDocs(settlementsCol);

    if (settlementsSnap.empty) {
      console.log("settlements 컬렉션에 문서 없음");
      return [];
    }

    const allSettlements = [];

    for (let ymDoc of settlementsSnap.docs) {
      const yearMonth = ymDoc.id;

      // 2. 해당 yearMonth 문서의 members 서브컬렉션 가져오기
      const membersSnap = await getDocs(
        collection(db, "settlements", yearMonth, "members"),
      );
      for (let memberDoc of membersSnap.docs) {
        const memberId = memberDoc.id;

        // 3. member 문서 안의 items 서브컬렉션 가져오기
        const itemsSnap = await getDocs(
          collection(
            db,
            "settlements",
            yearMonth,
            "members",
            memberId,
            "items",
          ),
        );
        const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        if (items.length > 0) {
          allSettlements.push({
            yearMonth,
            memberId,
            items,
          });
        }
      }
    }

    console.log(allSettlements);
    return allSettlements;
  };

  useEffect(() => {
    fetchData();
    fetchAllSettlements();
  }, []);

  // 🔹 카드 확장/축소
  const toggleExpand = (memberId, type) => {
    setExpanded({
      ...expanded,
      [memberId]: expanded[memberId] === type ? null : type,
    });
    setSelected([]);
  };

  // 🔹 체크박스 선택
  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // 🔹 선택한 항목 상태 변경 (정산 완료/취소)
  const processSettlement = async (status) => {
    try {
      for (let sel of selected) {
        const { yearMonth, memberId, id } = sel;

        const itemRef = doc(
          db,
          "settlements",
          yearMonth,
          "members",
          memberId,
          "items",
          id,
        );
        await updateDoc(itemRef, {
          status,
          completedAt: status === "completed" ? new Date() : null,
        });
      }
      setSelected([]);
      fetchData();
    } catch (err) {
      console.error("정산 처리 실패:", err);
    }
  };

  // 🔹 멤버별 정산 아이템 가져오기
  const getMemberItems = (memberId, status) => {
    const memberData = settlements.find((s) => s.memberId === memberId);
    if (!memberData) return [];
    if (status === "all") return memberData.items;
    return memberData.items.filter((i) => i.status === status);
  };

  const getTotalAmount = (memberId, status = "pending") =>
    getMemberItems(memberId, status).reduce(
      (sum, i) => sum + (i.amount || 0),
      0,
    );

  return (
    <Container sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        {members.map((member) => {
          const pendingList = getMemberItems(member.id, "pending");
          const allList = getMemberItems(member.id, "all");
          const totalPending = getTotalAmount(member.id, "pending");

          return (
            <Grid item xs={12} md={6} key={member.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{member.name}</Typography>
                  <Typography variant="h4" color="error">
                    {totalPending.toLocaleString()}원
                  </Typography>

                  <Box display="flex" gap={2} mt={2}>
                    <Button
                      variant="outlined"
                      onClick={() => toggleExpand(member.id, "pending")}
                    >
                      미정산 내역
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => toggleExpand(member.id, "all")}
                    >
                      총 정산 내역
                    </Button>
                  </Box>

                  {/* 미정산 내역 */}
                  <Collapse in={expanded[member.id] === "pending"}>
                    <Box mt={2}>
                      <Divider />
                      <List>
                        {pendingList.map((item) => (
                          <ListItem key={item.id}>
                            <Checkbox
                              checked={selected.some((s) => s.id === item.id)}
                              onChange={() =>
                                toggleSelect({ ...item, memberId: member.id })
                              }
                            />
                            <ListItemText
                              primary={`${item.ottName} (${item.yearMonth})`}
                              secondary={`${item.amount.toLocaleString()}원`}
                            />
                          </ListItem>
                        ))}
                      </List>

                      {pendingList.length > 0 && (
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => processSettlement("completed")}
                        >
                          선택 정산 완료
                        </Button>
                      )}
                    </Box>
                  </Collapse>

                  {/* 총 정산 내역 */}
                  <Collapse in={expanded[member.id] === "all"}>
                    <Box mt={2}>
                      <Divider />
                      <List>
                        {allList.map((item) => (
                          <ListItem key={item.id}>
                            <Checkbox
                              checked={selected.some((s) => s.id === item.id)}
                              onChange={() =>
                                toggleSelect({ ...item, memberId: member.id })
                              }
                            />
                            <ListItemText
                              primary={`${item.ottName} (${item.yearMonth})`}
                              secondary={`${item.amount.toLocaleString()}원`}
                            />
                            <Typography
                              color={
                                item.status === "completed" ? "green" : "red"
                              }
                            >
                              {item.status === "completed" ? "완료" : "미완료"}
                            </Typography>
                          </ListItem>
                        ))}
                      </List>

                      {allList.length > 0 && (
                        <Button
                          variant="contained"
                          color="warning"
                          fullWidth
                          onClick={() => processSettlement("pending")}
                        >
                          선택 정산 취소
                        </Button>
                      )}
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default SettlementPage;
