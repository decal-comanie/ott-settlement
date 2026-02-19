// src/pages/SettlementPage.js
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
  Toolbar,
} from "@mui/material";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

const SettlementPage = () => {
  const [members, setMembers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState([]);

  const navigate = useNavigate();

  // 1️⃣ 모든 데이터 가져오기
  const fetchData = async () => {
    const memberSnap = await getDocs(collection(db, "members"));
    const settlementSnap = await getDocs(collection(db, "settlements"));

    setMembers(memberSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setSettlements(
      settlementSnap.docs.map((d) => ({
        id: d.id,
        memberId: d.data().memberId,
        ottId: d.data().ottId,
        ottName: d.data().ottName || "", // UI용
        amount: d.data().amount,
        status: d.data().status,
        createdAt:
          d.data().createdAt?.toDate?.() || new Date(d.data().createdAt),
        yearMonth: d.data().yearMonth,
      })),
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2️⃣ 카드 펼치기
  const toggleExpand = (memberId, type) => {
    setExpanded({
      ...expanded,
      [memberId]: expanded[memberId] === type ? null : type,
    });
    setSelected([]);
  };

  // 3️⃣ 체크박스 선택
  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // 4️⃣ 정산 완료 / 취소 처리
  const processSettlement = async (status) => {
    for (let id of selected) {
      await updateDoc(doc(db, "settlements", id), {
        status,
        completedAt: status === "completed" ? new Date() : null,
      });
    }
    setSelected([]);
    fetchData();
  };

  // 5️⃣ 멤버별 데이터 필터링
  const getMemberSettlements = (memberId, status) =>
    settlements
      .filter((s) => s.memberId === memberId && s.status === status)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const getTotalPending = (memberId) =>
    getMemberSettlements(memberId, "pending").reduce(
      (sum, item) => sum + item.amount,
      0,
    );

  const getTotalAll = (memberId) =>
    settlements
      .filter((s) => s.memberId === memberId)
      .reduce((sum, item) => sum + item.amount, 0);

  // 월 계산
  const getMonthString = () => {
    const today = new Date();
    return `${today.getMonth() + 1}월`;
  };

  // 1️⃣ 간단 복사
  const copySimple = () => {
    const month = getMonthString();
    let text = `${month} 정산입니다.\n`;

    members.forEach((member) => {
      const memberItems = settlements.filter(
        (s) => s.memberId === member.id && s.status === "pending",
      );
      const total = memberItems.reduce((sum, item) => sum + item.amount, 0);
      text += `${member.name} : ${total.toLocaleString()}원\n`;
    });

    navigator.clipboard.writeText(text);
  };

  // 2️⃣ 상세 복사
  const copyDetail = () => {
    const month = getMonthString();
    let text = `${month} 정산입니다.\n`;

    members.forEach((member) => {
      const memberItems = settlements.filter(
        (s) => s.memberId === member.id && s.status === "pending",
      );
      const total = memberItems.reduce((sum, item) => sum + item.amount, 0);
      text += `${member.name} : ${total.toLocaleString()}원\n`;

      memberItems.forEach((item) => {
        text += `- ${item.ottName} : ${item.amount.toLocaleString()}원\n`;
      });
    });

    navigator.clipboard.writeText(text);
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Container fullWidth sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          onClick={() => {
            navigate("/manage");
          }}
        >
          관리페이지
        </Button>
      </Container>
      <Toolbar>
        <Typography variant="h6">OTT 정산 페이지</Typography>
      </Toolbar>
      <Box display="flex" justifyContent="space-around" gap={2} mb={2}>
        <Button variant="contained" onClick={copySimple}>
          간단 복사
        </Button>
        <Button variant="contained" onClick={copyDetail}>
          상세 복사
        </Button>
      </Box>
      <Grid container spacing={3}>
        {members.map((member) => {
          const pendingList = getMemberSettlements(member.id, "pending");
          const allList = settlements
            .filter((s) => s.memberId === member.id)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          const totalPending = getTotalPending(member.id);
          const totalAll = getTotalAll(member.id);

          return (
            <Grid item size={{ xs: 12, md: 6 }} key={member.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="h6">{member.name}</Typography>
                    <Typography variant="h5" color="error">
                      {totalPending.toLocaleString()}원
                    </Typography>
                  </Box>

                  <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
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
                              checked={selected.includes(item.id)}
                              onChange={() => toggleSelect(item.id)}
                            />
                            <ListItemText
                              primary={item.ottName || item.ottId}
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

                  {/* 총 내역 */}
                  <Collapse in={expanded[member.id] === "all"}>
                    <Box mt={2}>
                      <Divider />
                      <List>
                        {allList.map((item) => (
                          <ListItem key={item.id}>
                            <Checkbox
                              checked={selected.includes(item.id)}
                              onChange={() => toggleSelect(item.id)}
                            />
                            <ListItemText
                              primary={item.ottName || item.ottId}
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
