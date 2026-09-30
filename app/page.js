'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { getCurrentUser, signOut } from '../lib/auth';
import HotbarCliente from './components/HotbarCliente';

export default function LandingPage() {
  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try { setUsuario(await getCurrentUser()); } catch {}
      setVerificando(false);
    }
    carregar();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessao) => {
      setUsuario(sessao?.user || null);
      setVerificando(false);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  async function sair() {
    await signOut();
    window.location.href = '/';
  }

  return (
    <>
      {/* ===== HEADER ===== */}
      <header className="nav landing-nav">
        <div className="container">
          <Link href="/" className="nav-logo">PlayDrop</Link>
          <nav className="nav-links landing-links">
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/pedido">Pedido</Link>
            <Link href="/devolucoes">Devoluções</Link>
            <Link href="/dashboard" className="landing-botao-dash">📊 Dashboard</Link>
            {!verificando && (
              usuario ? (
                <button className="btn btn-sm btn-outline landing-botao-sair"
                  style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }} onClick={sair}>Sair</button>
              ) : (
                <Link href="/login" className="btn btn-sm btn-outline"
                  style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}>Entrar</Link>
              )
            )}
          </nav>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="landing-hero">
        <div className="landing-bolha b1"></div>
        <div className="landing-bolha b2"></div>
        <div className="landing-bolha b3"></div>
        <div className="container landing-hero-conteudo">
          <span className="landing-badge">🚀 Feito para revendedores</span>
          <h1 className="landing-titulo">
            Camisetas estampadas para revenda, <span>sem estoque</span>
          </h1>
          <p className="landing-sub">
            Escolha as camisetas, monte seu pedido em segundos e acompanhe tudo pelo
            seu painel: pedidos, devoluções e seus dados em um só lugar.
          </p>
          <div className="landing-hero-botoes">
            <Link href="/dashboard" className="landing-btn-primario">📊 Acessar dashboard</Link>
            <Link href="/catalogo" className="landing-btn-secundario">Ver catálogo →</Link>
          </div>
          <div className="landing-stats">
            <div className="landing-stat"><strong>∞</strong><span>Produtos</span></div>
            <div className="landing-stat"><strong>100%</strong><span>Online</span></div>
            <div className="landing-stat"><strong>24h</strong><span>Painel ativo</span></div>
          </div>
        </div>
      </section>

      {/* ===== RECURSOS ===== */}
      <section className="container landing-secao">
        <h2 className="landing-h2">Tudo que você precisa para vender</h2>
        <p className="landing-sub-secao">Catálogo, pedidos, devoluções e conta — em qualquer tela.</p>
        <div className="landing-grid">
          <div className="landing-card">
            <span className="landing-card-icone">🛍️</span>
            <h3>Catálogo moderno</h3>
            <p>Explore camisetas com fotos, cores e tamanhos, prontas para revenda com margem real.</p>
          </div>
          <div className="landing-card">
            <span className="landing-card-icone">📦</span>
            <h3>Pedidos rápidos</h3>
            <p>Monte o carrinho e finalize em segundos — seus dados já ficam salvos na sua conta.</p>
          </div>
          <div className="landing-card">
            <span className="landing-card-icone">↩️</span>
            <h3>Devoluções</h3>
            <p>Solicite devolução pelo site e acompanhe o status (pendente, aprovada, concluída).</p>
          </div>
          <div className="landing-card">
            <span className="landing-card-icone">📊</span>
            <h3>Dashboard</h3>
            <p>Veja estatísticas, últimos pedidos e tudo da sua conta num painel limpo.</p>
          </div>
          <div className="landing-card">
            <span className="landing-card-icone">👤</span>
            <h3>Minha conta</h3>
            <p>Nome e WhatsApp salvos, já preenchidos na hora de finalizar o pedido.</p>
          </div>
          <div className="landing-card">
            <span className="landing-card-icone">📋</span>
            <h3>Planilha UpSeller</h3>
            <p>Baixe a planilha pronta com fotos, títulos e descrições para vender nos marketplaces.</p>
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section className="container landing-secao">
        <h2 className="landing-h2">Como funciona</h2>
        <div className="landing-passos">
          <div className="landing-passo">
            <span className="landing-numero">1</span>
            <h4>Crie sua conta</h4>
            <p>Cadastre seu nome e WhatsApp em segundos.</p>
          </div>
          <div className="landing-passo">
            <span className="landing-numero">2</span>
            <h4>Escolha no catálogo</h4>
            <p>Monte seu carrinho com as camisetas que quer revender.</p>
          </div>
          <div className="landing-passo">
            <span className="landing-numero">3</span>
            <h4>Finalize o pedido</h4>
            <p>Seus dados já vêm preenchidos. Envie e pronto.</p>
          </div>
          <div className="landing-passo">
            <span className="landing-numero">4</span>
            <h4>Acompanhe tudo</h4>
            <p>Status do pedido e devoluções no seu dashboard.</p>
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="container landing-secao landing-cta">
        <h2>Pronto para revender sem estoque?</h2>
        <p>Crie sua conta grátis e comece agora.</p>
        <div className="landing-hero-botoes" style={{ justifyContent: 'center' }}>
          <Link href="/registre" className="landing-btn-primario">Criar conta grátis</Link>
          <Link href="/dashboard" className="landing-btn-secundario">📊 Ver dashboard</Link>
        </div>
      </section>

      {/* ===== RODAPÉ ===== */}
      <footer className="landing-footer">
        <div className="container">
          <span>© 2026 PlayDrop · Camisetas para revenda</span>
          <nav>
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/devolucoes">Devoluções</Link>
          </nav>
        </div>
      </footer>

      <HotbarCliente />
    </>
  );
}
