'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentUser, getProfile } from '../../../../lib/auth';

function limparTexto(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function gerarSku(codigo, cor, tamanho) {
  return `${limparTexto(codigo)}-${limparTexto(cor)}-${limparTexto(tamanho)}`;
}
function arredondarPreco(v) {
  if (!v || v <= 0) return 0;
  return Number((Math.ceil(v) - 0.1).toFixed(2));
}

export default function NovoProdutoPage() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);

  const [titulo, setTitulo] = useState('');
  const [apelido, setApelido] = useState('');
  const [descricao, setDescricao] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');

  const [custosPadrao, setCustosPadrao] = useState([]); // {id, nome, valor, ativo}
  const [custos, setCustos] = useState([]); // valores aplicados no produto
  const [margem, setMargem] = useState('100');

  const [cores, setCores] = useState([]);
  const [novaCor, setNovaCor] = useState('');
  const [tamanhos, setTamanhos] = useState(['P', 'M', 'G', 'GG', 'XG']);
  const [novoTamanho, setNovoTamanho] = useState('');
  const [estoques, setEstoques] = useState({});

  const [arquivos, setArquivos] = useState([]);
  const [precoSugerido, setPrecoSugerido] = useState(0);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function iniciar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }
      const { data: perfil } = await getProfile(user.id);
      if (!perfil || perfil.papel !== 'admin') { router.push('/catalogo'); return; }

      const { data: cats } = await supabase.from('categorias').select('id, nome').order('nome');
      setCategorias(cats || []);
      setCategoria(cats && cats.length ? cats[0].id : 'nova');

      const { data: confs } = await supabase.from('configuracoes').select('chave, valor');
      if (confs) {
        const map = {};
        confs.forEach((c) => (map[c.chave] = c.valor));
        setMargem(map.margem_padrao || '100');
      }

      const { data: cs } = await supabase.from('custos_config').select('*').order('criado_em');
      const ativos = (cs || []).filter((c) => c.ativo);
      setCustosPadrao(ativos);
      setCustos(ativos.map((c) => ({ id: c.id, nome: c.nome, valor: Number(c.valor) })));

      setVerificando(false);
    }
    iniciar();
  }, [router]);

  // Recalcula a sugestão sempre que custos ou margem mudam
  useEffect(() => {
    const total = custos.reduce((soma, c) => soma + (Number(c.valor) || 0), 0);
    const m = parseFloat(String(margem).replace(',', '.')) || 0;
    setPrecoSugerido(arredondarPreco(total * (1 + m / 100)));
  }, [custos, margem]);

  const custoTotal = custos.reduce((soma, c) => soma + (Number(c.valor) || 0), 0);

  function mudarCusto(id, valor) {
    setCustos((prev) => prev.map((c) => (c.id === id ? { ...c, valor: parseFloat(valor) || 0 } : c)));
  }
  function adicionarCor() {
    const v = novaCor.trim();
    if (!v) return;
    setCores((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setNovaCor('');
  }
  function removerCor(cor) {
    setCores((prev) => prev.filter((c) => c !== cor));
  }
  function adicionarTamanho() {
    const v = novoTamanho.trim().toUpperCase();
    if (!v) return;
    setTamanhos((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setNovoTamanho('');
  }
  function removerTamanho(tam) {
    setTamanhos((prev) => prev.filter((t) => t !== tam));
  }
  function mudarEstoque(cor, tam, valor) {
    setEstoques((prev) => ({ ...prev, [`${cor}|${tam}`]: valor }));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!titulo.trim()) { setErro('Informe o título do produto.'); return; }
    if (!codigo.trim()) { setErro('Informe um código curto, ex.: CAM001.'); return; }
    if (cores.length === 0) { setErro('Adicione pelo menos 1 cor.'); return; }
    if (tamanhos.length === 0) { setErro('Adicione pelo menos 1 tamanho.'); return; }
    setSalvando(true);

    try {
      let categoriaId = categoria;
      if (categoria === 'nova') {
        if (!novaCategoria.trim()) throw new Error('Digite o nome da nova categoria.');
        const { data: cat, error: errCat } = await supabase
          .from('categorias').insert({ nome: novaCategoria.trim() }).select().single();
        if (errCat) throw errCat;
        categoriaId = cat.id;
      }

      const { data: prod, error: errProd } = await supabase
        .from('produtos')
        .insert({
          titulo: titulo.trim(),
          apelido: apelido.trim(),
          descricao: descricao.trim(),
          categoria_id: categoriaId || null,
          codigo: codigo.trim().toUpperCase(),
          preco_sugerido: Number(precoSugerido) || 0,
          ativo: true,
        })
        .select().single();
      if (errProd) throw errProd;

      // Fotos
      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const nomeSeguro = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const caminho = `${prod.id}/${Date.now()}-${i}-${nomeSeguro}`;
        const { error: errUp } = await supabase.storage.from('produtos').upload(caminho, arquivo);
        if (errUp) throw errUp;
        const { data: pub } = supabase.storage.from('produtos').getPublicUrl(caminho);
        const { error: errImg } = await supabase
          .from('produto_imagens').insert({ produto_id: prod.id, url: pub.publicUrl, ordem: i });
        if (errImg) throw errImg;
      }

      // Variações (matriz cor x tamanho)
      const linhasVar = [];
      cores.forEach((cor) => {
        tamanhos.forEach((tam) => {
          linhasVar.push({
            produto_id: prod.id,
            cor,
            tamanho: tam,
            estoque: Number(estoques[`${cor}|${tam}`] || 0),
            sku: gerarSku(codigo, cor, tam),
          });
        });
      });
      const { error: errVar } = await supabase.from('variacoes').insert(linhasVar);
      if (errVar) throw errVar;

      // Custos aplicados ao produto
      const linhasCusto = custos
        .filter((c) => c.valor > 0)
        .map((c) => ({ produto_id: prod.id, custo_config_id: c.id, valor: c.valor }));
      if (linhasCusto.length) {
        const { error: errCusto } = await supabase.from('produto_custos').insert(linhasCusto);
        if (errCusto) throw errCusto;
      }

      router.push('/admin/produtos');
    } catch (err2) {
      setErro('Erro ao salvar: ' + (err2.message || 'tente novamente'));
      setSalvando(false);
    }
  }

  if (verificando) return <p className="center muted" style={{ padding: 60 }}>Verificando acesso...</p>;

  return (
    <>
      <style>{`.page-title-bar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;}`}</style>
      <div className="page-header container">
        <div className="page-title-bar">
          <div>
            <h1>Novo produto</h1>
            <p>Cadastre a camiseta com fotos, cores, tamanhos e custos.</p>
          </div>
          <a href="/admin/produtos" className="btn btn-outline">← Voltar</a>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 80 }}>
        {erro && <p className="erro">{erro}</p>}

        <form onSubmit={salvar}>
          <div className="form-card">
            <h2>Dados do produto</h2>
            <div className="form-grid">
              <div className="field">
                <span className="label">Título (aparece na planilha)</span>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Camiseta Estampada Caveira Preta" />
              </div>
              <div className="field">
                <span className="label">Apelido (nome curto)</span>
                <input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Camiseta Caveira Preta" />
              </div>
              <div className="field">
                <span className="label">Código do produto</span>
                <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="CAM001" />
                <span className="hint">Vira o SKU: CAM001-PRETO-M</span>
              </div>
              <div className="field">
                <span className="label">Categoria</span>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  <option value="nova">+ Nova categoria...</option>
                </select>
              </div>
              {categoria === 'nova' && (
                <div className="field">
                  <span className="label">Nome da nova categoria</span>
                  <input value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="Ex.: Camisetas" />
                </div>
              )}
            </div>
            <div className="field" style={{ marginTop: 8 }}>
              <span className="label">Descrição (apresentação do produto)</span>
              <textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)}
                placeholder="Camiseta 100% algodão, estampa DTF de alta durabilidade, modelagem unissex..." />
            </div>
          </div>

          <div className="form-card">
            <h2>Fotos do produto</h2>
            <input type="file" accept="image/*" multiple
              onChange={(e) => setArquivos(Array.from(e.target.files || []))} />
            <div className="foto-preview">
              {arquivos.map((a, i) => (
                <div className="item" key={i}>
                  <img src={URL.createObjectURL(a)} alt="" />
                  <button type="button" onClick={() => setArquivos((prev) => prev.filter((_, x) => x !== i))}>×</button>
                </div>
              ))}
            </div>
            <span className="hint">As fotos ficam públicas e entram na planilha do UpSeller como URL.</span>
          </div>

          <div className="form-card">
            <h2>Cores e tamanhos</h2>
            <div className="form-grid">
              <div className="field">
                <span className="label">Cores</span>
                <div className="row">
                  <input style={{ flex: 1 }} value={novaCor} onChange={(e) => setNovaCor(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarCor(); } }}
                    placeholder="Ex.: Preto" />
                  <button type="button" className="btn btn-primary btn-sm" onClick={adicionarCor}>+</button>
                </div>
                <div className="chips">
                  {cores.map((cor) => (
                    <span className="chip" key={cor}>{cor}<button type="button" onClick={() => removerCor(cor)}>×</button></span>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">Tamanhos</span>
                <div className="row">
                  <input style={{ flex: 1 }} value={novoTamanho} onChange={(e) => setNovoTamanho(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarTamanho(); } }}
                    placeholder="Ex.: XGG" />
                  <button type="button" className="btn btn-primary btn-sm" onClick={adicionarTamanho}>+</button>
                </div>
                <div className="chips">
                  {tamanhos.map((tam) => (
                    <span className="chip" key={tam}>{tam}<button type="button" onClick={() => removerTamanho(tam)}>×</button></span>
                  ))}
                </div>
              </div>
            </div>

            {cores.length > 0 && tamanhos.length > 0 && (
              <div className="field" style={{ marginTop: 16 }}>
                <span className="label">Estoque por variação (SKU gerado automaticamente)</span>
                <table className="matrix">
                  <thead>
                    <tr>
                      <th>Cor \\ Tamanho</th>
                      {tamanhos.map((tam) => <th key={tam}>{tam}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {cores.map((cor) => (
                      <tr key={cor}>
                        <td style={{ fontWeight: 700 }}>{cor}</td>
                        {tamanhos.map((tam) => (
                          <td key={tam}>
                            <span className="sku">{gerarSku(codigo || 'CAM', cor, tam)}</span>
                            <input type="number" min="0" value={estoques[`${cor}|${tam}`] || ''}
                              placeholder="0"
                              onChange={(e) => mudarEstoque(cor, tam, e.target.value)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="form-card">
            <h2>Custos e preço sugerido</h2>
            <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
              Custos padrão carregados das configurações. Ajuste os valores se este produto for diferente.
            </p>
            {custos.length === 0 && <p className="muted">Nenhum custo ativo nas configurações. Cadastre em Configurações → Custos fixos.</p>}
            {custos.map((c) => (
              <div className="custo-row" key={c.id}>
                <span style={{ flex: 1, fontWeight: 600 }}>{c.nome}</span>
                <input className="custo-width" type="number" step="0.01" min="0"
                  value={c.valor} onChange={(e) => mudarCusto(c.id, e.target.value)} />
              </div>
            ))}
            <div className="field" style={{ marginTop: 14 }}>
              <span className="label">Margem de lucro (%)</span>
              <input className="custo-width" type="number" min="0" value={margem}
                onChange={(e) => setMargem(e.target.value)} />
            </div>

            <div className="resumo">
              <div className="linha"><span>Custo total</span><strong>R$ {custoTotal.toFixed(2).replace('.', ',')}</strong></div>
              <div className="linha"><span>Preço sugerido de venda (para o cliente)</span><strong className="preco">R$ {Number(precoSugerido).toFixed(2).replace('.', ',')}</strong></div>
              <div className="linha" style={{ marginTop: 6 }}>
                <span className="hint">Cálculo: custo × (1 + margem) e arredondado para um valor “bonito”. Você pode editar o valor final abaixo.</span>
              </div>
              <div className="linha" style={{ marginTop: 10 }}>
                <span className="label" style={{ margin: 0 }}>Preço final (editável):</span>
                <input className="custo-width" type="number" step="0.01" min="0" value={precoSugerido}
                  onChange={(e) => setPrecoSugerido(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          <button className="btn btn-primary btn-block" style={{ fontSize: 16, padding: '14px' }} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar produto'}
          </button>
        </form>
      </div>
    </>
  );
}
