import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-start justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Vernacular Technical Screening</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Score the engineering, not the English. Start a candidate session below, watch it live in
          the recruiter console, then run the fairness harness once sessions are recorded.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/candidate" className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">
          Start candidate session
        </Link>
        <Link href="/console" className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium dark:border-zinc-700">
          Recruiter console
        </Link>
        <Link href="/harness" className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium dark:border-zinc-700">
          Fairness harness
        </Link>
      </div>
    </main>
  );
}
