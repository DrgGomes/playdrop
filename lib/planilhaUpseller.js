import * as XLSX from 'xlsx';

// Cabeçalho CURTO oficial do UpSeller (Produto Único)
const CABECALHO = [
  'SKU',
  'Título',
  'Apelido do Produto',
  'Usar Apelido como Título da NFE',
  'Categoria Principal',
  'Categoria Secundária',
  'Preço de Varejo',
  'Custo de Compra',
  'Quantidade',
  'Número do Estante',
  'Código de Barras',
  'Apelido de SKU',
  'Link da Imagem',
  'Peso (g)',
  'Comprimento (cm)',
  'Largura (cm)',
  'Altura (cm)',
  'NCM',
  'CEST',
  'Unidade',
  'Origem',
  'Link do Fornecedor',
];

const DEFAULTS = {
  usarApelidoNfe: 'não',
  peso: 250,
  comprimento: 30,
  largura: 25,
  altura: 2,
  ncm: '6109.10.00',
  unidade: 'UN',
  origem: '0',
  linkFornecedor: '',
};

function dataHoje() {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function montarPlanilhaUpseller({ linhas }) {
  const dados = [CABECALHO];

  linhas.forEach((l) => {
    dados.push([
      l.sku || '',
      l.titulo || '',
      l.apelido || '',
      DEFAULTS.usarApelidoNfe,
      l.categoria || 'Camisetas',
      l.categoriaSecundaria || '',
      l.precoVarejo || 0,
      l.custoCompra || 0,
      l.quantidade || 0,
      '',
      l.codigoBarras || '',
      l.apelidoSku || '',
      l.imagem || '',
      DEFAULTS.peso,
      DEFAULTS.comprimento,
      DEFAULTS.largura,
      DEFAULTS.altura,
      DEFAULTS.ncm,
      '',
      DEFAULTS.unidade,
      DEFAULTS.origem,
      DEFAULTS.linkFornecedor,
    ]);
  });

  const wsDados = XLSX.utils.aoa_to_sheet(dados);
  wsDados['!cols'] = CABECALHO.map((cab, i) => ({
    wch: [12, 50, 35, 18, 25, 22, 14, 14, 12, 16, 16, 22, 55, 9, 14, 12, 10, 12, 10, 10, 9, 22][i] || 14,
  }));

  const abaControle = XLSX.utils.aoa_to_sheet([['Número de Linhas'], [linhas.length]]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDados, 'Dados');
  XLSX.utils.book_append_sheet(wb, abaControle, 'Número de Linhas');

  XLSX.writeFile(wb, `playdrop-upseller-${dataHoje()}.xlsx`);
}
