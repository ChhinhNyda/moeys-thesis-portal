import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <img
            src="/moeys-seal.png"
            alt="Ministry of Education, Youth and Sport seal"
            className="h-12 w-auto"
          />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Kingdom of Cambodia
            </p>
            <p className="text-xs text-gray-600">
              Ministry of Education, Youth and Sport
            </p>
          </div>
        </div>
      </header>

      <section className="flex flex-1 items-center bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto w-full max-w-4xl px-6 py-20 text-center">
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900">
            National Thesis Archive
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600">
            A central catalogue of Master&apos;s and PhD theses from accredited
            Cambodian higher education institutions.
          </p>

          <form action="/app" method="GET" className="mx-auto mb-8 max-w-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                name="q"
                placeholder="Search by title, author, or keyword…"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <button
                type="submit"
                className="rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white hover:bg-gray-800"
              >
                Search
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/app"
              className="rounded-lg bg-blue-700 px-8 py-3 font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              Browse theses
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg border-2 border-blue-700 bg-white px-8 py-3 font-semibold text-blue-700 hover:bg-blue-50"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-12 text-center md:grid-cols-3">
          <div>
            <p className="text-3xl font-bold text-gray-900">—</p>
            <p className="text-sm text-gray-600">theses archived</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">—</p>
            <p className="text-sm text-gray-600">participating HEIs</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">MoEYS</p>
            <p className="text-sm text-gray-600">quality assured</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-gray-500">
          <p>© 2026 Ministry of Education, Youth and Sport · Pilot programme</p>
        </div>
      </footer>
    </div>
  );
}
