import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, MessageCircle } from "lucide-react";
import Papa from "papaparse";
/*
=====================================================================
                     SKIN VALUE LIST APP  —  v6.0
=====================================================================
📌 Layout refactor — chat panel now sits on the **right‑hand side** of the page
   (collapsible on mobile). No functional changes to chat logic.
---------------------------------------------------------------------
*/
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue, query, limitToLast, orderByChild } from "firebase/database";
// Firebase config...
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DB_URL",
  projectId: "YOUR_PID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
const PLACEHOLDER_RE = /^YOUR_/;
function isFirebaseConfigured(cfg) {
  return cfg && Object.values(cfg).every((v) => typeof v === "string" && v.length && !PLACEHOLDER_RE.test(v));
}
let db = null;
let chatEnabled = false;
if (isFirebaseConfigured(firebaseConfig)) {
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getDatabase(firebaseApp);
    chatEnabled = true;
  } catch (err) {
    console.warn("[SVL] Firebase disabled →", err.message);
  }
} else {
  console.info("[SVL] Firebase keys not provided – chat disabled");
}
const SHEET_ID = "1xNhBxfDLWQ8Us6etTn-jek5bp_dBH_g5H9Q_J57VGGE";
const SHEET_GID = 0;
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
export const rarityOrder = ["Legendary", "Epic", "Rare", "Uncommon", "Common", "Unknown"];
function ensureRarityInOrder(rarity) {
  if (!rarityOrder.includes(rarity)) rarityOrder.push(rarity);
}
export function rarityRank(rarity = "Unknown") {
  ensureRarityInOrder(rarity);
  return rarityOrder.indexOf(rarity);
}
const rarityColors = {
  Legendary: "bg-yellow-500",
  Epic: "bg-purple-500",
  Rare: "bg-blue-500",
  Uncommon: "bg-green-500",
  Common: "bg-gray-500",
  Unknown: "bg-gray-400",
};
function ucfirst(str = "") {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
export function filterSkinsByQuery(skins, query) {
  const q = (query || "").toLowerCase();
  if (!q) return skins;
  return skins.filter((s) =>
    `${(s.name || "")} ${(s.weapon || "")} ${(s.caseSource || "")}`.toLowerCase().includes(q)
  );
}
const PRESENCE_KEY_PREFIX = "svl_presence_";
const PRESENCE_TIMEOUT = 20000;
const PRESENCE_UPDATE_INTERVAL = 5000;
function useOnlineUsers() {
  const [online, setOnline] = useState(1);
  useEffect(() => {
    let sessionId = sessionStorage.getItem("svl_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      sessionStorage.setItem("svl_session_id", sessionId);
    }
    const key = `${PRESENCE_KEY_PREFIX}${sessionId}`;
    const cleanup = () => {
      const now = Date.now();
      for (const k in localStorage) {
        if (k.startsWith(PRESENCE_KEY_PREFIX)) {
          const ts = Number(localStorage.getItem(k) || 0);
          if (now - ts > PRESENCE_TIMEOUT) localStorage.removeItem(k);
        }
      }
    };
    const countOnline = () => {
      const now = Date.now();
      let count = 0;
      for (const k in localStorage) {
        if (k.startsWith(PRESENCE_KEY_PREFIX)) {
          const ts = Number(localStorage.getItem(k) || 0);
          if (now - ts <= PRESENCE_TIMEOUT) count += 1;
        }
      }
      return count;
    };
    const updatePresence = () => {
      localStorage.setItem(key, Date.now().toString());
      cleanup();
      setOnline(countOnline());
    };
    updatePresence();
    const interval = setInterval(updatePresence, PRESENCE_UPDATE_INTERVAL);
    const onStorage = (e) => {
      if (e.key && e.key.startsWith(PRESENCE_KEY_PREFIX)) setOnline(countOnline());
    };
    window.addEventListener("storage", onStorage);
    const onUnload = () => localStorage.removeItem(key);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("beforeunload", onUnload);
      localStorage.removeItem(key);
    };
  }, []);
  return online;
}
function useChatMessages(limit = 100) {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    if (!chatEnabled) return;
    const msgQuery = query(ref(db, "messages"), orderByChild("timestamp"), limitToLast(limit));
    return onValue(msgQuery, (snap) => {
      const list = [];
      snap.forEach((child) => list.push({ id: child.key, ...child.val() }));
      setMessages(list);
    });
  }, [limit]);
  return messages;
}
function sendChat(text, nickname) {
  if (!chatEnabled) return;
  if (!text.trim()) return;
  push(ref(db, "messages"), {
    nickname,
    text: text.trim(),
    timestamp: Date.now(),
  });
}
export default function SkinValueListApp() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [skins, setSkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const onlineUsers = useOnlineUsers();
  const messages = useChatMessages();
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [nickname, setNickname] = useState(localStorage.getItem("svl_nickname") || "");
  useEffect(() => {
    if (!nickname) {
      const nick = prompt("Choisissez un pseudo pour le chat :");
      const cleaned = (nick || "Invité").slice(0, 20);
      setNickname(cleaned);
      localStorage.setItem("svl_nickname", cleaned);
    }
  }, [nickname]);
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    const fetchCsv = async () => {
      try {
        const res = await fetch(CSV_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const csvText = await res.text();
        const { data } = Papa.parse(csvText.trim(), { header: false, skipEmptyLines: true });
        const rows = data[0]?.[0]?.toLowerCase?.().includes("rar") ? data.slice(1) : data;
        const parsed = rows
          .map((row, i) => {
            const safe = [...row, "", "", "", "", "", "", "", "", ""];
            const rarity = ucfirst(safe[0] || "Unknown");
            ensureRarityInOrder(rarity);
            return {
              id: i,
              rarity,
              caseSource: safe[1] || "",
              weapon: safe[2] || "",
              name: safe[3] || "",
              valueCoins: Number(safe[4]) || 0,
              valueKT: Number(safe[5]) || 0,
              valueUsd: Number(safe[6]) || 0,
              popularity: safe[7] || "",
              demand: safe[8] || "",
              demandKT: safe[9] || "",
            };
          })
          .filter((s) => s.name.trim().length);
        setSkins(parsed);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCsv();
  }, []);
  const filtered = useMemo(() => filterSkinsByQuery(skins, query), [query, skins]);
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === "value") return b.valueCoins - a.valueCoins;
      if (sort === "rarity")
        return rarityRank(a.rarity) - rarityRank(b.rarity) || b.valueCoins - a.valueCoins;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, sort]);

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-2 text-center">Skin Value List</h1>
      <p className="text-sm text-gray-600 text-center mb-4">
        {onlineUsers} utilisateur(s) en ligne
      </p>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
            <Input
              placeholder="Rechercher un skin..."
              className="w-full sm:w-1/2"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">A–Z</SelectItem>
                <SelectItem value="value">Valeur (coins)</SelectItem>
                <SelectItem value="rarity">Rareté</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading && (
            <div className="flex justify-center py-10 animate-spin text-gray-500">
              <Loader2 className="w-6 h-6" />
            </div>
          )}
          {error && <p className="text-center text-red-500">Erreur de chargement : {error}</p>}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {sorted.map((skin) => (
                  <motion.div
                    key={skin.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="p-4 shadow-lg flex flex-col gap-3">
                      <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-semibold break-words max-w-[70%]">{skin.name}</h2>
                        <Badge className={rarityColors[skin.rarity] || "bg-gray-400"}>{skin.rarity}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {skin.weapon} • {skin.caseSource}
                      </p>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="font-medium">Valeur (coins) :</span>{" "}
                          {skin.valueCoins.toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">Valeur Kill Track :</span>{" "}
                          {skin.valueKT.toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">Valeur USD :</span>{" $"}
                          {skin.valueUsd.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                        <p>Popularité : {skin.popularity}</p>
                        <p>Demande : {skin.demand}</p>
                        <p>Demande KT : {skin.demandKT}</p>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
        <aside className="md:w-80 w-full border rounded-lg p-4 bg-white shadow-md md:sticky md:top-8 h-fit">
          <div className="flex items-center justify-between mb-4 md:mb-2">
            <h2 className="text-xl font-semibold flex items-center gap-1">
              <MessageCircle className="w-5 h-5" /> Chat
            </h2>
            <button
              className="md:hidden text-sm text-blue-600 underline"
              onClick={() => setChatOpen((o) => !o)}
            >
              {chatOpen ? "Fermer" : "Ouvrir"}
            </button>
          </div>
          <div className={`md:block ${chatOpen ? "block" : "hidden"}`}>
            {!chatEnabled && (
              <p className="text-center text-orange-500 mb-4">
                Chat désactivé (Firebase non configuré ou indisponible).
              </p>
            )}
            {chatEnabled && (
              <>
                <div className="h-64 overflow-y-auto border rounded-md p-3 bg-gray-50" id="chat-box">
                  {messages.map((m) => (
                    <div key={m.id} className="mb-2 text-sm">
                      <span className="font-semibold">{m.nickname || "Invité"} :</span> {m.text}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form
                  className="flex gap-2 mt-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendChat(chatInput, nickname);
                    setChatInput("");
                  }}
                >
                  <Input
                    className="flex-1"
                    placeholder="Votre message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <Button type="submit" className="flex gap-1 items-center">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                <p className="text-xs text-center text-gray-500 mt-2">
                  Connecté en tant que : {nickname}
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
      <div className="text-xs text-center mt-6 text-gray-500">
        Données mises à jour depuis Google Sheets (gid : {SHEET_GID}).
      </div>
    </div>
  );
}
