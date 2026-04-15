
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const PRIZES = [0, 5, 10, 15, 20, 25, 30];
const WEIGHTS = {
  0: 500,
  5: 200,
  10: 30,
  15: 20,
  20: 10,
  25: 10,
  30: 1,
};

function generateToken(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function weightedRandom() {
  const pool = [];
  Object.entries(WEIGHTS).forEach(([prize, weight]) => {
    for (let i = 0; i < weight; i++) {
      pool.push(Number(prize));
    }
  });
  return pool[Math.floor(Math.random() * pool.length)];
}

function pageStyle() {
  return {
    minHeight: "100vh",
    background: "#f5f5f5",
    padding: 16,
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  };
}

function cardStyle() {
  return {
    background: "#fff",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    marginBottom: 16,
  };
}

function buttonStyle(primary = true) {
  return {
    background: primary ? "#111827" : "#fff",
    color: primary ? "#fff" : "#111827",
    border: primary ? "none" : "1px solid #d1d5db",
    borderRadius: 12,
    padding: "12px 14px",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  };
}

function inputStyle() {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    marginTop: 8,
    marginBottom: 12,
    boxSizing: "border-box",
  };
}

function badgeStyle() {
  return {
    display: "inline-block",
    background: "#e5e7eb",
    padding: "8px 10px",
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
    fontWeight: 700,
  };
}

function Header() {
  return (
    <div style={{ ...cardStyle(), display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800 }}>Roleta de Premiação</div>
        <div style={{ color: "#6b7280", marginTop: 4 }}>Admin + cliente com Supabase</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link to="/" style={{ textDecoration: "none" }}><button style={{ ...buttonStyle(false), width: "auto" }}>Início</button></Link>
        <Link to="/admin" style={{ textDecoration: "none" }}><button style={{ ...buttonStyle(false), width: "auto" }}>Admin</button></Link>
        <Link to="/roleta" style={{ textDecoration: "none" }}><button style={{ ...buttonStyle(false), width: "auto" }}>Roleta</button></Link>
        <Link to="/setup" style={{ textDecoration: "none" }}><button style={{ ...buttonStyle(false), width: "auto" }}>Setup</button></Link>
      </div>
    </div>
  );
}

function Layout({ children }) {
  return (
    <div style={pageStyle()}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Header />
        {children}
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <Layout>
      <div style={{ ...cardStyle() }}>
        <h2 style={{ marginTop: 0 }}>Sistema pronto</h2>
        <p>Rotas:</p>
        <div style={{ lineHeight: 1.8 }}>
          <div><strong>/admin</strong> → painel protegido por login do Supabase</div>
          <div><strong>/roleta?token=CODIGO</strong> → página do cliente para usar 1 vez</div>
          <div><strong>/setup</strong> → instruções de configuração</div>
        </div>
      </div>
    </Layout>
  );
}

function AdminLogin({ onLogged }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!supabase) {
      alert("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Netlify.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      alert(error.message || "Erro ao entrar.");
      return;
    }
    onLogged();
  }

  return (
    <Layout>
      <div style={{ ...cardStyle(), maxWidth: 520, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>Entrar no admin</h2>
        <input style={inputStyle()} type="email" placeholder="Seu e-mail admin" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={inputStyle()} type="password" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button style={buttonStyle(true)} onClick={handleLogin} disabled={loading || !email || !password}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </Layout>
  );
}

function AdminPage() {
  const [checked, setChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setChecked(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setAuthorized(!!data.session);
      setChecked(true);
      if (data.session) fetchTokens();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthorized(!!session);
      setChecked(true);
      if (session) fetchTokens();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchTokens() {
    if (!supabase) return;
    setLoadingTokens(true);
    const { data, error } = await supabase
      .from("tokens")
      .select("*")
      .order("created_at", { ascending: false });
    setLoadingTokens(false);

    if (error) {
      console.error(error);
      alert("Erro ao carregar tokens. Veja se a tabela 'tokens' foi criada no Supabase.");
      return;
    }
    setTokens(data || []);
  }

  async function createToken() {
    if (!participantName.trim() || !supabase) return;
    setCreating(true);

    const payload = {
      name: participantName.trim(),
      token: generateToken(),
      used: false,
      prize: null,
    };

    const { error } = await supabase.from("tokens").insert([payload]);
    setCreating(false);

    if (error) {
      console.error(error);
      alert("Erro ao criar token.");
      return;
    }

    setParticipantName("");
    fetchTokens();
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthorized(false);
  }

  async function copyLink(token) {
    const link = `${window.location.origin}/roleta?token=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      alert("Link copiado.");
    } catch {
      alert(link);
    }
  }

  if (!checked) {
    return (
      <Layout>
        <div style={cardStyle()}>Verificando acesso...</div>
      </Layout>
    );
  }

  if (!authorized) return <AdminLogin onLogged={() => setAuthorized(true)} />;

  return (
    <Layout>
      <div style={cardStyle()}>
        <h2 style={{ marginTop: 0 }}>Painel admin</h2>
        <label>Nome do participante</label>
        <input style={inputStyle()} placeholder="Ex.: Maria" value={participantName} onChange={(e) => setParticipantName(e.target.value)} />
        <button style={buttonStyle(true)} onClick={createToken} disabled={!participantName.trim() || creating}>
          {creating ? "Gerando..." : "Gerar token para a roleta"}
        </button>
        <div style={{ height: 10 }} />
        <button style={buttonStyle(false)} onClick={handleLogout}>Sair do admin</button>
      </div>

      <div style={cardStyle()}>
        <h3 style={{ marginTop: 0 }}>Probabilidades</h3>
        {PRIZES.map((value) => (
          <span key={value} style={badgeStyle()}>
            R$ {value} → {WEIGHTS[value]}/1000
          </span>
        ))}
      </div>

      <div style={cardStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Tokens gerados</h3>
          <button style={{ ...buttonStyle(false), width: "auto" }} onClick={fetchTokens}>
            Atualizar
          </button>
        </div>

        {loadingTokens && <p>Carregando...</p>}

        {!loadingTokens && tokens.length === 0 && (
          <p>Nenhum token criado ainda.</p>
        )}

        {!loadingTokens && tokens.map((item) => (
          <div key={item.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 800 }}>{item.name}</div>
            <div style={{ color: "#6b7280", marginTop: 4 }}>Token: {item.token}</div>
            <div style={{ color: "#6b7280", marginTop: 4 }}>
              Status: {item.used ? `Usado • R$ ${item.prize}` : "Disponível"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button style={{ ...buttonStyle(false), width: "auto" }} onClick={() => copyLink(item.token)}>Copiar link</button>
              <a href={`/roleta?token=${item.token}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <button style={{ ...buttonStyle(false), width: "auto" }}>Abrir página do cliente</button>
              </a>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

function WheelVisual({ spinning, result }) {
  return (
    <div style={{ ...cardStyle(), textAlign: "center" }}>
      <div
        style={{
          width: 280,
          height: 280,
          margin: "0 auto 16px",
          borderRadius: "50%",
          border: "10px solid #111827",
          background:
            "conic-gradient(#dbeafe 0deg 51deg, #fee2e2 51deg 102deg, #dcfce7 102deg 153deg, #fef3c7 153deg 204deg, #ede9fe 204deg 255deg, #fce7f3 255deg 306deg, #e5e7eb 306deg 360deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 28,
          transform: spinning ? "rotate(1440deg)" : "rotate(0deg)",
          transition: spinning ? "transform 4s ease-out" : "none",
        }}
      >
        R$
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
        {PRIZES.map((value) => (
          <span key={value} style={badgeStyle()}>R$ {value}</span>
        ))}
      </div>
      {result !== null && <div style={{ marginTop: 16, fontSize: 22, fontWeight: 800 }}>Prêmio: R$ {result}</div>}
    </div>
  );
}

function RoletaPage() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [spinning, setSpinning] = useState(false);

  async function fetchToken() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    if (!tokenParam) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("tokens")
      .select("*")
      .eq("token", tokenParam)
      .maybeSingle();

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Erro ao consultar token.");
      return;
    }

    setRecord(data || null);
  }

  useEffect(() => {
    fetchToken();
  }, [tokenParam]);

  async function spinWheel() {
    if (!record || record.used || spinning || !supabase) return;

    setSpinning(true);
    const prize = weightedRandom();

    setTimeout(async () => {
      const { data, error } = await supabase
        .from("tokens")
        .update({
          used: true,
          prize,
          used_at: new Date().toISOString(),
        })
        .eq("token", tokenParam)
        .eq("used", false)
        .select()
        .maybeSingle();

      setSpinning(false);

      if (error) {
        console.error(error);
        alert("Erro ao salvar prêmio.");
        return;
      }

      if (!data) {
        alert("Esse token já foi usado.");
        fetchToken();
        return;
      }

      setRecord(data);
    }, 4000);
  }

  return (
    <Layout>
      {!tokenParam && (
        <div style={cardStyle()}>
          Abra esta página com um token válido.
        </div>
      )}

      {loading && <div style={cardStyle()}>Carregando...</div>}

      {!loading && tokenParam && !record && (
        <div style={cardStyle()}>
          <h2 style={{ marginTop: 0 }}>Token inválido</h2>
          <p>Esse link não foi encontrado.</p>
        </div>
      )}

      {!loading && record && (
        <>
          <div style={cardStyle()}>
            <h2 style={{ marginTop: 0 }}>Sua roleta de prêmio</h2>
            <div><strong>Participante:</strong> {record.name}</div>
            <div style={{ marginTop: 6, color: "#6b7280" }}><strong>Token:</strong> {record.token}</div>
            <div style={{ marginTop: 6, color: "#6b7280" }}>
              <strong>Status:</strong> {record.used ? "Roleta já utilizada" : "Disponível para 1 giro"}
            </div>
          </div>

          <WheelVisual spinning={spinning} result={record.prize ?? null} />

          <div style={cardStyle()}>
            {!record.used ? (
              <button style={buttonStyle(true)} onClick={spinWheel} disabled={spinning}>
                {spinning ? "Girando..." : "Girar roleta"}
              </button>
            ) : (
              <div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>Roleta concluída</div>
                <div style={{ marginTop: 10 }}>Seu prêmio foi: <strong>R$ {record.prize}</strong></div>
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}

function SetupPage() {
  return (
    <Layout>
      <div style={cardStyle()}>
        <h2 style={{ marginTop: 0 }}>Configuração do Supabase</h2>
        <ol style={{ lineHeight: 1.8, paddingLeft: 20 }}>
          <li>Crie um projeto no Supabase.</li>
          <li>Em Authentication, crie seu usuário admin com e-mail e senha.</li>
          <li>No Netlify, adicione <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong>.</li>
          <li>Crie a tabela <strong>tokens</strong>.</li>
        </ol>
        <div style={{ background: "#f3f4f6", borderRadius: 12, padding: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
{`create table if not exists public.tokens (
  id bigint generated by default as identity primary key,
  name text not null,
  token text not null unique,
  used boolean default false,
  prize integer,
  created_at timestamp with time zone default now(),
  used_at timestamp with time zone
);`}
        </div>
      </div>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/roleta" element={<RoletaPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
