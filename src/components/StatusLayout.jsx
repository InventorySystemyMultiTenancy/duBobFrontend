/**
 * Moldura das telas de aviso (404, sem permissão, retorno de pagamento):
 * fundo roxo da Home com um card branco centralizado.
 */
export default function StatusLayout({ children }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary px-5 py-10 text-gray-900">
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-secondary/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-accent-dark/25 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl sm:p-10">
        {children}
      </div>
    </main>
  );
}
