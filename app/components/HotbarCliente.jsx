'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITENS = [
  { href: '/dashboard', label: 'Início', icone: '🏠' },
  { href: '/catalogo', label: 'Catálogo', icone: '🛍️' },
  { href: '/pedido', label: 'Pedido', icone: '📦' },
  { href: '/devolucoes', label: 'Devoluções', icone: '↩️' },
  { href: '/conta', label: 'Conta', icone: '👤' },
];

export default function HotbarCliente() {
  const pathname = usePathname();
  const [qtdCarrinho, setQtdCarrinho] = useState(0);

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

  return (
    <nav className="hotbar">
      {ITENS.map((item) => {
        const ativo = pathname === item.href || pathname.startsWith(item.href + '/');
        const isPedido = item.href === '/pedido';
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`hotbar-item${ativo ? ' active' : ''}`}
          >
            <span className="hotbar-icone">
              {item.icone}
              {isPedido && qtdCarrinho > 0 && (
                <span className="hotbar-badge">{qtdCarrinho}</span>
              )}
            </span>
            <span className="hotbar-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
