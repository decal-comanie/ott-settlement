import React, { useEffect, useState } from "react";
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

const ManagePage = () => {
  const [otts, setOtts] = useState([]);
  const [members, setMembers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const [newOtt, setNewOtt] = useState({
    name: "",
    price: "",
    billingDay: "",
  });

  const [newMemberName, setNewMemberName] = useState("");

  const navigate = useNavigate();

  // 데이터 불러오기
  const fetchAll = async () => {
    const ottSnap = await getDocs(collection(db, "otts"));
    const memberSnap = await getDocs(collection(db, "members"));
    const subSnap = await getDocs(collection(db, "subscriptions"));

    console.log(
      "MEMEBERS",
      memberSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    );

    setOtts(ottSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setMembers(memberSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setSubscriptions(subSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // OTT 추가
  const addOtt = async () => {
    if (!newOtt.name || !newOtt.price || !newOtt.billingDay) return;

    await addDoc(collection(db, "otts"), {
      name: newOtt.name,
      price: Number(newOtt.price),
      billingDay: Number(newOtt.billingDay),
      isDeleted: "false",
    });

    setNewOtt({ name: "", price: "", billingDay: "" });
    fetchAll();
  };

  // OTT 삭제
  const removeOtt = async (id) => {
    await updateDoc(doc(db, "otts", id), { isDeleted: "true" });
    fetchAll();
  };

  // 멤버 추가
  const addMember = async () => {
    if (!newMemberName) return;

    await addDoc(collection(db, "members"), {
      name: newMemberName,
      isDeleted: "false",
    });

    setNewMemberName("");
    fetchAll();
  };

  // 멤버 삭제
  const removeMember = async (id) => {
    await updateDoc(doc(db, "members", id), { isDeleted: "true" });
    fetchAll();
  };

  // 참여 토글
  const toggleSubscription = async (ottId, memberId) => {
    const found = subscriptions.find(
      (s) => s.ottId === ottId && s.memberId === memberId,
    );

    if (found) {
      await updateDoc(doc(db, "subscriptions", found.id), {
        active: !found.active,
      });
    } else {
      await addDoc(collection(db, "subscriptions"), {
        ottId,
        memberId,
        active: true,
      });
    }

    fetchAll();
  };

  const isActive = (ottId, memberId) => {
    const found = subscriptions.find(
      (s) => s.ottId === ottId && s.memberId === memberId,
    );
    return found?.active || false;
  };

  return (
    <>
      <Container
        sx={{
          mt: 4,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <Container
          fullWidth
          sx={{ display: "flex", justifyContent: "flex-end" }}
        >
          <Button
            onClick={() => {
              navigate("/settlement");
            }}
          >
            정산페이지
          </Button>
        </Container>
        <Toolbar>
          <Typography variant="h6">OTT 관리자 페이지</Typography>
        </Toolbar>
        {/* OTT 추가 */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6">OTT 추가</Typography>
            <Grid container spacing={2} mt={1}>
              <Grid item size={{ xs: 12, md: 3 }}>
                <TextField
                  label="OTT 이름"
                  fullWidth
                  value={newOtt.name}
                  onChange={(e) =>
                    setNewOtt({ ...newOtt, name: e.target.value })
                  }
                />
              </Grid>
              <Grid item size={{ xs: 12, md: 3 }}>
                <TextField
                  label="가격"
                  type="number"
                  fullWidth
                  value={newOtt.price}
                  onChange={(e) =>
                    setNewOtt({ ...newOtt, price: e.target.value })
                  }
                />
              </Grid>
              <Grid item size={{ xs: 12, md: 3 }}>
                <TextField
                  label="결제일 (1~31)"
                  type="number"
                  fullWidth
                  value={newOtt.billingDay}
                  onChange={(e) =>
                    setNewOtt({ ...newOtt, billingDay: e.target.value })
                  }
                />
              </Grid>
              <Grid item size={{ xs: 12, md: 3 }}>
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ height: "100%" }}
                  onClick={addOtt}
                >
                  추가
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 멤버 추가 */}

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6">멤버 추가</Typography>
            <Grid container spacing={2} mt={1}>
              <Grid item size={{ xs: 12, md: 9 }}>
                <TextField
                  label="멤버 이름"
                  fullWidth
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                />
              </Grid>

              <Grid item size={{ xs: 12, md: 3 }}>
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ height: "100%" }}
                  onClick={addMember}
                >
                  추가
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 멤버 목록 */}
        <Grid container spacing={3}>
          {members
            .filter((member) => member.isDeleted === "false")
            .map((member) => (
              <Grid item size={{ xs: 12, md: 6 }} key={member.id}>
                <Card sx={{ mb: 4 }}>
                  <CardContent
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="h6" alignContent="center">
                      {member.name}
                    </Typography>
                    <Button
                      color="error"
                      onClick={() => {
                        removeMember(member.id);
                        setMembers((prev) =>
                          prev.filter((m) => m.id !== member.id),
                        );
                      }}
                    >
                      삭제
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>

        {/* 참여 토글 영역 */}
        <Grid container spacing={3}>
          {otts
            .filter((ott) => ott.isDeleted === "false")
            .sort((a, b) => a.billingDay - b.billingDay)
            .map((ott) => (
              <Grid item size={{ xs: 12, md: 6 }} key={ott.id}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Box>
                        <Typography variant="h6">
                          {ott.name} ({ott.price.toLocaleString()}원)
                        </Typography>
                        <Typography variant="body2" mb={2}>
                          결제일: 매월 {ott.billingDay}일
                        </Typography>
                      </Box>

                      <Button
                        color="error"
                        onClick={() => {
                          removeOtt(ott.id);
                          setOtts((prev) =>
                            prev.filter((o) => o.id !== ott.id),
                          );
                        }}
                      >
                        삭제
                      </Button>
                    </Box>

                    <Divider />

                    <List>
                      {members.map((member) => (
                        <ListItem key={member.id}>
                          <ListItemText primary={member.name} />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={isActive(ott.id, member.id)}
                                onChange={() =>
                                  toggleSubscription(ott.id, member.id)
                                }
                              />
                            }
                            label="참여"
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      </Container>
    </>
  );
};

export default ManagePage;
