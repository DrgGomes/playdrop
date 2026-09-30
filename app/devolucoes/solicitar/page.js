'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUser, getProfile } from '../../../lib/auth';
import HotbarCliente from '../../components/HotbarCliente';

export default function SolicitarDevolucaoPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState([]);
  const [pedidoId, setPedidoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    async function iniciar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }
      const { data: perfil } = await getProfile(user.id);
      const meta = user.user_metadata || {};
      const nomeConta = (perfil?.nome || perfil?.nome_completo || meta.nome || '');
      const zapConta = (perfil?.whatsapp || perfil?.telefone || meta.whatsapp || '');
      setNome(nomeConta);
      setWhatsapp(zapConta);

      if (zapConta) {
        const { data } = await supabase
          .from('pedidos')
          .select('id, numero, status, total, criado_em')
          .eq('whatsapp', zapConta)
          .order('criado_em', { ascending: false });
        setPedidos(data || []);
      }
    }
    iniciar();
  }, [router]);

  async function solicitar(e) {
    e.preventDefault();
    setErro('');
    if (!pedidoId) { setErro('Selecione um pedido.'); return; }
    if (!motivo.trim()) { setErro('Informe o motivo.'); return; }
    setEnviando(true);

    const { error } = await supabase.rpc('criar_devolucao', {
      p_pedido_id: pedidoId,
      p_cliente_nome: nome.trim(),
      p_cliente_whatsapp: whatsapp.trim(),
      p_motivo: motivo.trim(),
      p_descricao: descricao.trim(),
    });

    if (error) { setErro('Erro: ' + error.message); setEnviando(false); return; }
    setSucesso(true);
    setEnviando(false);
  }

  if (sucesso) {
    return (
      <>
        <header className="nav">
          <div className="container">
            <span className="nav-logo">PlayDrop</span>
            <nav className="nav-links">
              <Link href="/catalogo">Catálogo</Link>
              <Link href="/devolucoes">↩️ Devoluções</Link>
            </nav>
          </div>
        </header>
        <div className="container" style={{ padding: 60, maxWidth: 560, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>Devolução solicitada!</h1>
          <p style={{ color: 'var(--muted)' }}>Em breve você receberá o retorno sobre sua solicitação.</p>
          <Link href="/devolucoes" className="btn btn-primary" style={{ marginTop: 20 }}>↩️ Ver minhas devoluções</Link>
        </div>
        <HotbarCliente />
      </>
    );
  }

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/devolucoes">↩️ Devoluções</Link>
          </nav>
        </div>
      </header>

      <div className="page-header container">
        <h1>Solicitar devolução</h1>
        <p>Preencha os dados abaixo para solicitar a devolução de um pedido.</p>
      </div>

      <div className="container" style={{ paddingBottom: 80, maxWidth: 560 }}>
        {erro && <p className="erro">{erro}</p>}

        <form onSubmit={solicitar} className="form-card">
          <div className="field">
            <span className="label">Pedido</span>
            <select value={pedidoId} onChange={(e) => setPedidoId(e.target.value)}>
              <option value="">Selecione um pedido...</option>
              {pedidos.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.numero} — {p.status} — {new Date(p.criado_em).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span className="label">Motivo da devolução</span>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="produto_errado">Produto errado</option>
              <option value="defeito">Produto com defeito</option>
              <option value="nao_gostei">Não gostei</option>
              <option value="tamanho_errado">Tamanho errado</option>
              <option value="atraso">Atraso na entrega</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="field">
            <span className="label">Descrição (opcional)</span>
            <textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)}
              placeholder="Conte mais detalhes sobre o motivo..." />
          </div>

          <button className="btn btn-primary btn-block" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Solicitar devolução'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18 }}>
          <Link href="/devolucoes">← Voltar</Link>
        </p>
      </div>

      <HotbarCliente />
    </>
  );
}
