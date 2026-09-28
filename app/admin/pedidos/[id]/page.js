'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentUser, getProfile, signOut } from '../../../../lib/auth';

const STATUS = {
  pendente: { label: 'Pendente', cor: '#f59e0b' },
  confirmado: { label: 'Confirmado', cor: '#3b82f6' },
  em_producao: { label: 'Em produção', cor: '#8b5cf6' },
  enviado: { label: 'Enviado', cor: '#06b6d4' },
  entregue: { label: 'Entregue', cor: '#22c55e' },
  cancelado: { label: 'Cancelado', cor: '#ef4444' },
};

function formatarValor(v) {
  const n = Number(v);
  if (isNaN(n)) return 'R$ 0,00';
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

export default function PedidoDetalheAdminPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [pedido, setPedido] = useState(null);
  const [itens, setItens] = useState([]);
  const [verificando, setVerificando] = useState(true);
  const [erro, setErro] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const barcodeRef = useRef(null);

  useEffect(() => {
    async function iniciar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }
      const { data: perfil } = await getProfile(user.id);
      if (!perfil || perfil.papel !== 'admin') { router.push('/catalogo'); return; }
      setVerificando(false);
      await carregar();
    }
    iniciar();
  }, [id]);

  async function carregar() {
    const { data: ped, error } = await supabase.from('pedidos').select('*').eq('id', id).single();
    if (error || !ped) { setErro('Pedido não encontrado.'); return; }
    setPedido(ped);
    const { data: its } = await supabase.from('pedido_itens').select('*').eq('pedido_id', id).order('id');
    setItens(its || []);
  }

  useEffect(() => {
    if (!pedido) return;
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, 'P' + String(pedido.numero).padStart(6, '0'), {
          format: 'CODE128',
          displayValue: false,
          fontSize: 14,
          height: 42,
        });
      } catch {}
    }
    const textoQr = `PEDIDO #${pedido.numero}\n${pedido.nome_cliente}\nTOTAL ${formatarValor(pedido.total)}`;
    QRCode.toDataURL(textoQr, { width: 110, margin: 1 }).then(setQrUrl).catch(() => {});
  }, [pedido]);

  async function mudarStatus(novo) {
    const { error } = await supabase.from('pedidos').update({ status: novo }).eq('id', id);
    if (error) { setErro('Erro ao atualizar status: ' + error.message); return; }
    setPedido((p) => ({ ...p, status: novo }));
  }

  if (verificando) return <p className="muted center" style={{ padding: 60 }}>Verificando acesso...</p>;

  if (!pedido) {
    return (
      <div className="container" style={{ padding: 60, textAlign: 'center' }}>
        <h1>{erro || 'Pedido não encontrado'}</h1>
        <Link href="/admin/pedidos" className="btn btn-primary" style={{ marginTop: 14 }}>← Voltar aos pedidos</Link>
      </div>
    );
  }

  const st = STATUS[pedido.status] || STATUS.pendente;
  const data = new Date(pedido.criado_em).toLocaleDateString('pt-BR');
  const hora = new Date(pedido.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const zap = (pedido.whatsapp || '').replace(/\D/g, '');

  return (
    <>
      <header className="nav no-print">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/admin">Painel</Link>
            <Link href="/admin/pedidos">Pedidos</Link>
            <Link href="/admin/produtos">Produtos</Link>
            <Link href="/admin/configuracoes">Configurações</Link>
            <Link href="/catalogo">Ver site</Link>
            <button className="btn btn-sm btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}
              onClick={async () => { await signOut(); router.push('/login'); }}>Sair</button>
          </nav>
        </div>
      </header>

      <div className="page-header container no-print">
        <h1>Pedido #{pedido.numero}</h1>
        <p>Detalhes, status e impressão do cupom.</p>
      </div>

      <div className="container" style={{ paddingBottom: 80 }}>
        {erro && <p className="erro">{erro}</p>}

        <div className="ped-detail-grid no-print">
          <div className="ped-cliente">
            <h3>
              Pedido #{pedido.numero}{' '}
              <span className="badge" style={{ background: st.cor + '22', color: st.cor }}>{st.label}</span>
            </h3>
            <div className="linha"><span className="muted">Data</span><span>{data} às {hora}</span></div>
            <div className="linha"><span className="muted">Cliente</span><strong>{pedido.nome_cliente}</strong></div>
            <div className="linha">
              <span className="muted">WhatsApp</span>
              {zap ? (
                <a href={`https://wa.me/55${zap}`} target="_blank" rel="noreferrer">{pedido.whatsapp}</a>
              ) : <span>—</span>}
            </div>
            {pedido.observacoes && (
              <div className="linha"><span className="muted">Obs.</span><span>{pedido.observacoes}</span></div>
            )}
            <div className="linha"><span className="muted">Total</span><strong className="ped-total">{formatarValor(pedido.total)}</strong></div>

            <div className="field" style={{ marginTop: 14 }}>
              <span className="label">Status do pedido</span>
              <select value={pedido.status} onChange={(e) => mudarStatus(e.target.value)}>
                {Object.entries(STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="ped-cliente">
            <h3>Itens ({itens.length})</h3>
            {itens.length === 0 && <p className="muted">Sem itens.</p>}
            {itens.map((i) => (
              <div key={i.id} style={{ borderBottom: '1px dashed var(--border)', padding: '8px 0' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{i.quantidade}x {i.titulo}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  <span style={{ fontFamily: 'monospace' }}>{i.sku}</span> · {i.cor} · {i.tamanho} ·{' '}
                  {formatarValor((Number(i.preco_unitario) || 0) * (Number(i.quantidade) || 1))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cup-acoes no-print">
          <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Imprimir cupom</button>
          <Link href="/admin/pedidos" className="btn btn-outline">← Voltar</Link>
        </div>

        {/* ===== Cupom não fiscal (80mm) — também é o que sai na impressão ===== */}
        <div className="cupom">
          <div className="cup-titulo">PLAYDROP</div>
          <div className="cup-sub">CUPOM NÃO FISCAL</div>
          <div className="cup-sep" />
          <div className="cup-linha"><span className="lbl">Pedido</span><strong>#{pedido.numero}</strong></div>
          <div className="cup-linha"><span className="lbl">Data</span><span>{data} {hora}</span></div>
          <div className="cup-linha"><span className="lbl">Cliente</span><strong>{pedido.nome_cliente}</strong></div>
          {pedido.whatsapp && <div className="cup-linha"><span className="lbl">WhatsApp</span><span>{pedido.whatsapp}</span></div>}
          <div className="cup-sep" />
          {itens.map((i) => (
            <div className="cup-item" key={i.id}>
              <div className="t">{i.quantidade}x {i.titulo}</div>
              <div>{i.sku} | {i.cor} | {i.tamanho}</div>
              <div className="cup-linha">
                <span></span>
                <span>{formatarValor((Number(i.preco_unitario) || 0) * (Number(i.quantidade) || 1))}</span>
              </div>
            </div>
          ))}
          <div className="cup-sep" />
          <div className="cup-linha"><span className="lbl">Status</span><strong>{st.label.toUpperCase()}</strong></div>
          <div className="cup-linha cup-total"><span>TOTAL</span><span>{formatarValor(pedido.total)}</span></div>
          <div className="cup-sep" />
          <div className="cup-codes">
            <div className="code-box">
              {qrUrl && <img src={qrUrl} alt="QR" style={{ width: 84, height: 84 }} />}
              <div>Pedido #{pedido.numero}</div>
            </div>
            <div className="code-box" style={{ flex: 1 }}>
              <svg ref={barcodeRef} style={{ width: '100%', maxWidth: 230 }} />
              <div>{'P' + String(pedido.numero).padStart(6, '0')}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
