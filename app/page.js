import Link from 'next/link';

export default function Home() {
  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/login">Entrar</Link>
            <Link href="/registre" style={{ color: '#c084fc' }}>Criar conta</Link>
          </nav>
        </div>
      </header>

      <section className="hero">
        <h1>Camisetas estampadas para revenda, sem estoque</h1>
        <p>
          Escolha as camisetas que quiser vender, baixe a planilha pronta com fotos,
          títulos e descrições e comece a vender nos marketplaces. A gente cuida do resto.
        </p>
        <div className="hero-btns">
          <Link href="/registre" className="btn btn-primary">Criar conta grátis</Link>
          <Link href="/catalogo" className="btn btn-outline">Ver catálogo</Link>
        </div>
      </section>

      <footer className="footer">© 2026 PlayDrop · Camisetas para revenda</footer>
    </>
  );
}
