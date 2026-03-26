import Calculator from "@/components/Calculator";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-5">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Калькулятор стоимости исследования
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Рассчитайте стоимость вашего исследовательского проекта
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <Calculator />
      </main>
    </div>
  );
}
