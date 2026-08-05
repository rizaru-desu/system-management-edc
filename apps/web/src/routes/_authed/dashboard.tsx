import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/dashboard')({
  head: () => ({
    meta: [{ title: 'Dashboard · EDC Management' }],
  }),
  component: Dashboard,
})

function Dashboard() {
  const { session } = Route.useRouteContext()

  return (
    <div className="animate-fade-up">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3F6FA8]">
        Overview
      </p>
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-[#0E2748] md:text-4xl">
        Welcome back, {session.user.name}.
      </h1>
      <p className="max-w-xl text-sm text-[#0E2748]/60">
        Signed in as {session.user.email}. Pick a module from the sidebar to
        get started.
      </p>

      <section className="mt-8 max-w-2xl rounded-2xl border border-[#DDE0EC] bg-white p-8 text-sm text-[#0E2748]/70">
        EDC management modules will live here.
      </section>
    </div>
  )
}
