import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <section className="relative flex min-h-screen flex-col px-6 md:px-10">
        <div className="pt-8 text-xs uppercase tracking-[0.24em] text-[#C8A97E]">MANTHAN OS</div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="max-w-4xl space-y-6">
            <h1 className="text-4xl font-extralight leading-tight text-white sm:text-6xl lg:text-7xl">
              Your AI writing room.
              <br />
              Built for Indian stories.
            </h1>
            <p className="mx-auto max-w-2xl text-base font-light leading-[1.8] text-[#888888] sm:text-lg">
              You&apos;re already using AI to develop your ideas. Manthan brings it all into one place — from raw concept to
              pitch-ready package.
            </p>
            <div className="pt-4">
              <Link
                href="/signup"
                className="inline-flex rounded-[4px] bg-[#C8A97E] px-6 py-3 text-sm font-medium text-[#0A0A0A] transition hover:brightness-110"
              >
                Start your story &rarr;
              </Link>
              <div className="pt-4">
                <Link href="/login" className="text-sm text-[#666666] transition hover:text-[#9a9a9a]">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center pb-8 text-[#666666]">
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </section>

      <hr className="border-[#1A1A1A]" />

      <section className="px-6 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center text-xs uppercase tracking-[0.24em] text-[#C8A97E]">HOW IT WORKS</div>
          <div className="grid gap-10 md:grid-cols-3">
            <div className="space-y-4">
              <div className="text-4xl font-extralight text-[#C8A97E]">01</div>
              <h3 className="text-xl font-light text-white">Tell Manthan your story</h3>
              <p className="text-sm font-light leading-[1.8] text-[#888888]">
                Type anything — a feeling, a character, a situation. Or upload what you already have: a script, a one-pager,
                reference images.
              </p>
            </div>
            <div className="space-y-4">
              <div className="text-4xl font-extralight text-[#C8A97E]">02</div>
              <h3 className="text-xl font-light text-white">Answer a few questions</h3>
              <p className="text-sm font-light leading-[1.8] text-[#888888]">
                Manthan asks what a thoughtful script editor would ask. About your audience, your themes, your protagonist&apos;s
                wound.
              </p>
            </div>
            <div className="space-y-4">
              <div className="text-4xl font-extralight text-[#C8A97E]">03</div>
              <h3 className="text-xl font-light text-white">Receive your story package</h3>
              <p className="text-sm font-light leading-[1.8] text-[#888888]">
                A logline. A synopsis. Character breakdowns. A one-pager ready to send. Everything you need to pitch your
                story.
              </p>
            </div>
          </div>
        </div>
      </section>

      <hr className="border-[#1A1A1A]" />

      <section className="px-6 py-20 md:px-10">
        <div className="mx-auto max-w-[600px] rounded-[8px] border border-[#1E1E1E] bg-[#111111] p-8 text-center">
          <h2 className="text-3xl font-extralight text-white">Not built for Hollywood.</h2>
          <p className="mt-3 text-sm font-light uppercase tracking-[0.18em] text-[#C8A97E]">
            Built for Mumbai, Delhi, Bangalore, Chennai.
          </p>
          <p className="mt-6 text-sm font-light leading-[1.8] text-[#888888]">
            Indian stories have their own grammar — the weight of family, the complexity of faith, the particular texture of
            class and language. Manthan understands this. It was built by people who have made stories in India, for India.
          </p>
        </div>
      </section>

      <hr className="border-[#1A1A1A]" />

      <footer className="px-6 py-8 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-sm">
          <div className="text-xs uppercase tracking-[0.24em] text-[#C8A97E]">MANTHAN OS</div>
          <div className="text-[#666666]">&copy; 2026</div>
          <Link href="/login" className="text-[#666666] transition hover:text-[#9a9a9a]">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  )
}
