'use client';

import HotbarCliente from '../components/HotbarCliente';

export default function NovoTituloPage() {
  return (
    <>
      <div style={{ maxWidth: 720, margin: '64px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>📈</div>
        <h1 style={{ color: '#0a0a0a', fontWeight: 900, margin: 0 }}>Vendas</h1>
        <p style={{ color: '#6b7280', marginTop: 10, fontSize: 15 }}>
          Este módulo está em construção. Em breve você verá tudo por aqui.
        </p>
      </div>
      <HotbarCliente />
    </>
  );
}
