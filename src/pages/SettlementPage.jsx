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
  const [settlements, setSettlements] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState([]);

  const fetchData = async () => {
    const memberSnap = await getDocs(collection(db, "members"));
    const settlementSnap = await getDocs(collection(db, "settlements"));

    console.log(
      "memberSnap",
      memberSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    );
    console.log(
      "settlementSnap",
      settlementSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    );

    setMembers(memberSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setSettlements(settlementSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpand = (memberId, type) => {
    setExpanded({
      ...expanded,
      [memberId]: expanded[memberId] === type ? null : type,
    });
    setSelected([]);
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

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

  const getMemberSettlements = (memberId, status) =>
    settlements.filter((s) => s.memberId === memberId && s.status === status);

  const getTotalPending = (memberId) => {
    return getMemberSettlements(memberId, "pending").reduce(
      (sum, item) => sum + item.amount,
      0,
    );
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        {members.map((member) => {
          const pendingList = getMemberSettlements(member.id, "pending");
          const allList = settlements.filter((s) => s.memberId === member.id);
          const totalPending = getTotalPending(member.id);

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

                  {/* 미정산 */}
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
                              primary={item.ottName}
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
                              primary={item.ottName}
                              secondary={`${item.amount.toLocaleString()}원}`}
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
