import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] font-sans selection:bg-[#EAF6F4] selection:text-[#0F5D5A]">
      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 px-6 sm:px-12 lg:px-24">
          <div className="max-w-5xl mx-auto">
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-[#111111] leading-tight tracking-tight">
              Engineering skill deserves engineering evidence.
            </h1>
            <p className="mt-8 text-xl sm:text-2xl text-[#5C5C5C] max-w-2xl leading-relaxed">
              Assess technical competence without language bias. Vernacular technical screening powered by real-time intent extraction and evidence-based scoring.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <Link href="/candidate" className="inline-flex items-center justify-center bg-[#0F5D5A] hover:bg-[#0B4B48] text-white px-6 py-3 rounded-full text-sm font-medium transition-colors">
                Start Screening
              </Link>
              <Link href="/console" className="inline-flex items-center justify-center bg-transparent text-[#111111] border border-[#E8E8E3] hover:border-[#111111] px-6 py-3 rounded-full text-sm font-medium transition-colors">
                View Console
              </Link>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-5xl mx-auto px-6 sm:px-12 lg:px-24">
          <hr className="border-[#E8E8E3]" />
        </div>

        {/* Problem Section */}
        <section className="py-24 px-6 sm:px-12 lg:px-24">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#111111] mb-12">Language shouldn't mask logic.</h2>
            <div className="grid md:grid-cols-2 gap-12 lg:gap-24">
              <div>
                <p className="text-lg text-[#5C5C5C] leading-relaxed">
                  Traditional technical interviews often conflate communication skills with engineering competence. A brilliant system design can be lost in translation when a candidate is forced to explain it in a non-native language.
                </p>
              </div>
              <div>
                <p className="text-lg text-[#5C5C5C] leading-relaxed">
                  Vernatech separates language proficiency from technical competence. By supporting English, Hindi, and Telugu, candidates can speak in the language where their logic flows best.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-5xl mx-auto px-6 sm:px-12 lg:px-24">
          <hr className="border-[#E8E8E3]" />
        </div>

        {/* Pipeline Section */}
        <section className="py-24 px-6 sm:px-12 lg:px-24">
          <div className="max-w-5xl mx-auto">
            <div className="mb-16 max-w-2xl">
              <div className="font-mono text-xs tracking-wider text-[#8A8A8A] uppercase mb-4">The Pipeline</div>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#111111]">How it works</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-0 border-y border-[#E8E8E3] md:divide-x divide-[#E8E8E3] bg-[#FFFFFF]">
              {[
                { title: "Speech", desc: "Native language audio capture" },
                { title: "Transcript", desc: "High-fidelity text conversion" },
                { title: "Intent", desc: "Real-time semantic extraction" },
                { title: "Evidence", desc: "Mapping statements to rubrics" },
                { title: "Verdict", desc: "Self-consistent 3-run scoring" }
              ].map((step, i) => (
                <div key={i} className="p-6 md:p-8 relative border-b border-[#E8E8E3] md:border-b-0 last:border-b-0">
                  <div className="font-mono text-xs text-[#8A8A8A] mb-8">0{i + 1}</div>
                  <h3 className="text-base font-medium text-[#111111] mb-3">{step.title}</h3>
                  <p className="text-sm text-[#5C5C5C] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-5xl mx-auto px-6 sm:px-12 lg:px-24">
          <hr className="border-[#E8E8E3]" />
        </div>

        {/* Evidence Section */}
        <section className="py-24 px-6 sm:px-12 lg:px-24">
          <div className="max-w-5xl mx-auto">
            <div className="font-mono text-xs tracking-wider text-[#8A8A8A] uppercase mb-4">Traceability</div>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#111111] mb-16">Evidence over scores.</h2>
            
            <div className="grid md:grid-cols-2 gap-12 lg:gap-24">
              <div>
                <p className="text-lg text-[#5C5C5C] leading-relaxed mb-8">
                  Every score given by Vernatech traces directly back to a specific quote in the transcript. We believe a score is only as good as the evidence backing it. 
                </p>
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-xs text-[#8A8A8A] uppercase">Reliability</span>
                    <span className="text-sm text-[#111111]">3-run self-consistency scoring ensures high-confidence verdicts.</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-xs text-[#8A8A8A] uppercase">Separation of Concerns</span>
                    <span className="text-sm text-[#111111]">Language proficiency is recorded entirely separately from engineering competence.</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#FFFFFF] border border-[#E8E8E3] p-8 md:p-10 flex flex-col justify-center">
                <div className="font-mono text-xs text-[#8A8A8A] mb-4">Extracted Evidence</div>
                <blockquote className="border-l-2 border-[#0F5D5A] pl-5 py-1 italic text-[#111111] text-lg leading-relaxed">
                  "I would use a distributed cache like Redis to reduce the load on the primary database, ensuring we can handle the high read throughput without lagging."
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#0A7A53]"></div>
                  <span className="text-xs font-mono text-[#5C5C5C] uppercase tracking-wider">System Design — Met</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-5xl mx-auto px-6 sm:px-12 lg:px-24">
          <hr className="border-[#E8E8E3]" />
        </div>

        {/* Fairness Section */}
        <section className="py-24 px-6 sm:px-12 lg:px-24">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#111111] mb-6">Built for fairness.</h2>
            <p className="text-lg text-[#5C5C5C] leading-relaxed max-w-2xl mx-auto mb-12">
              Our fairness harness allows you to run paired comparisons between English and vernacular evaluations, ensuring our system remains unbiased across languages.
            </p>
            <Link href="/harness" className="inline-flex items-center justify-center bg-transparent text-[#111111] border border-[#E8E8E3] hover:border-[#111111] px-6 py-3 rounded-full text-sm font-medium transition-colors">
              Explore Fairness Harness
            </Link>
          </div>
        </section>

      </main>

      <footer className="py-12 px-6 sm:px-12 text-center border-t border-[#E8E8E3] bg-[#FAFAF8]">
        <p className="font-mono text-xs text-[#8A8A8A]">Vernatech &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
