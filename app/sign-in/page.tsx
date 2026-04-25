import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-4">
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
          </Link>
        </div>
      </header>

      <section className="flex flex-1 items-center bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <Link
            href="/"
            className="mb-8 inline-block text-sm text-blue-700 hover:underline"
          >
            ← Back to home
          </Link>

          <h1 className="mb-3 text-4xl font-bold tracking-tight text-gray-900">
            Sign in
          </h1>
          <p className="mb-10 text-lg text-gray-600">
            Choose how you would like to sign in to the National Thesis
            Archive.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/app"
              className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-700 hover:shadow-md"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-2xl">
                🎓
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-blue-800">
                Higher Education Institution
              </h2>
              <p className="text-sm text-gray-600">
                For HEI representatives submitting Master&apos;s and PhD theses
                to the national archive.
              </p>
            </Link>

            <Link
              href="/app"
              className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-700 hover:shadow-md"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-2xl">
                🏛️
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-blue-800">
                MoEYS staff
              </h2>
              <p className="text-sm text-gray-600">
                For ministry reviewers, administrators, and the Minister&apos;s
                office.
              </p>
            </Link>
          </div>

          <p className="mt-8 text-sm text-gray-500">
            Don&apos;t have an account? Account provisioning is currently
            handled by MoEYS — contact your institution&apos;s focal point or
            the ministry directly.
          </p>
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
