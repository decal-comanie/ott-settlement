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

  // 데이터 불러오기
  const fetchAll = async () => {
    const ottSnap = await getDocs(collection(db, "otts"));
    const memberSnap = await getDocs(collection(db, "members"));
    const subSnap = await getDocs(collection(db, "subscriptions"));

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
    });

    setNewOtt({ name: "", price: "", billingDay: "" });
    fetchAll();
  };

  // 멤버 추가
  const addMember = async () => {
    if (!newMemberName) return;

    await addDoc(collection(db, "members"), {
      name: newMemberName,
    });

    setNewMemberName("");
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
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">OTT 관리자 페이지</Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        {/* OTT 추가 */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6">OTT 추가</Typography>
            <Grid container spacing={2} mt={1}>
              <Grid item xs={12} md={3}>
                <TextField
                  label="OTT 이름"
                  fullWidth
                  value={newOtt.name}
                  onChange={(e) =>
                    setNewOtt({ ...newOtt, name: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={3}>
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
              <Grid item xs={12} md={3}>
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
              <Grid item xs={12} md={3}>
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
            <Box display="flex" gap={2} mt={2}>
              <TextField
                label="멤버 이름"
                fullWidth
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />
              <Button variant="contained" onClick={addMember}>
                추가
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* 참여 토글 영역 */}
        <Grid container spacing={3}>
          {otts.map((ott) => (
            <Grid item xs={12} md={6} key={ott.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">
                    {ott.name} ({ott.price.toLocaleString()}원)
                  </Typography>
                  <Typography variant="body2" mb={2}>
                    결제일: 매월 {ott.billingDay}일
                  </Typography>
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
