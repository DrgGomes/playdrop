'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUser, getProfile, signOut } from '../../lib/auth';

const ITENS = [
  { href: '/dashboard', label: 'Início', icone: '🏠' },
  { href: '/catalogo', label: 'Catálogo', icone: '🛍️' },
  { href: '/pedido', label: 'Pedido', icone: '📦' },
  { href: '/devolucoes', label: 'Devoluções', icone: '↩️' },
  { href: '/conta', label: 'Minha conta', icone: '👤' },
];

export default function MenuLateral() {
  const pathname = usePathname();
  const [logado, setLogado] = useState(false);
  const [qtdCarrinho, setQtdCarrinho] = useState(0);
  const [nome, setNome] = useState('');

  useEffect(() => {
    let ativo = true;
    getCurrentUser().then(async (user) => {
      if (!ativo) return;
      setLogado(!!user);
      if (user) {
        const { data: perfil } = await getProfile(user.id);
        const meta = user.user_metadata || {};
        const nomeConta = (perfil?.nome || perfil?.nome_completo || meta.nome || meta.name || '').trim();
        if (ativo) setNome(nomeConta);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessao) => {
      if (ativo) setLogado(!!sessao?.user);
    });
    return () => { ativo = false; sub?.subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    function atualizar() {
      try {
        const itens = JSON.parse(localStorage.getItem('playdrop_carrinho') || '[]');
        setQtdCarrinho(itens.reduce((s, i) => s + (Number(i.quantidade) || 1), 0));
      } catch { setQtdCarrinho(0); }
    }
    atualizar();
    window.addEventListener('storage', atualizar);
    window.addEventListener('playdrop_carrinho', atualizar);
    return () => {
      window.removeEventListener('storage', atualizar);
      window.removeEventListener('playdrop_carrinho', atualizar);
    };
  }, []);

  if (!logado) return null;

  const inicial = nome ? nome.trim()[0]?.toUpperCase() : '👤';
  const primeiroNome = nome.split(' ')[0] || 'Cliente';

  async function sair() {
    await signOut();
    window.location.href = '/';
  }

  return (
    <aside className="menu-lateral">
      <Link href="/dashboard" className="menu-logo">
        <span className="menu-logo-marca">PlayDrop</span>
      </Link>

      <nav className="menu-links">
        <span className="menu-secao">Navegação</span>
        {ITENS.map((item, i) => {
          const ativo = pathname === item.href || pathname.startsWith(item.href + '/');
          const isPedido = item.href === '/pedido';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`menu-item${ativo ? ' active' : ''}`}
              title={item.label}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="menu-icone">
                {item.icone}
                {isPedido && qtdCarrinho > 0 && (
                  <span className="menu-badge">{qtdCarrinho}</span>
                )}
              </span>
              <span className="menu-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="menu-rodape">
        <div className="menu-usuario">
          <span className="menu-usuario-avatar">{inicial}</span>
          <span className="menu-usuario-info">
            <strong>{primeiroNome}</strong>
            <small>Cliente</small>
          </span>
        </div>
        <button className="menu-sair" onClick={sair}>
          <span className="menu-icone">🚪</span>
          <span className="menu-label">Sair</span>
        </button>
      </div>
    </aside>
  );
}
