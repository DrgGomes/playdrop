import './globals.css';

export const metadata = {
  title: 'PlayDrop — Camisetas para revenda',
  description: 'Escolha, baixe a planilha e comece a vender camisetas estampadas sem estoque.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
