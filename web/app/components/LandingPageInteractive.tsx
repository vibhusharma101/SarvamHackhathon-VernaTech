"use client";

import React, { useState } from "react";
import Link from "next/link";

interface SampleEvidence {
  id: string;
  criterion: string;
  category: string;
  score: number;
  originalText: string;
  englishText: string;
  lang: string;
  reasoning: string;
}

const SAMPLE_DATA: Record<string, SampleEvidence> = {
  system_design: {
    id: "system_design",
    criterion: "Distributed Caching & High Availability",
    category: "System Architecture",
    score: 5,
    originalText: "నేను ప్రైమరీ డేటాబేస్‌పై లోడ్ తగ్గించడానికి Redis డిస్ట్రిబ్యూటెడ్ క్యాచే ఉపయోగిస్తాను.",
    englishText: "I would use a distributed cache like Redis to reduce the read load on the primary database.",
    lang: "te-IN (Telugu)",
    reasoning: "Candidate correctly identified caching strategy to decouple DB reads under high load.",
  },
  concurrency: {
    id: "concurrency",
    criterion: "Race Conditions & Mutex Locking",
    category: "Concurrency Control",
    score: 4,
    originalText: "కన్కరెంట్ రైట్స్ నిరోధించడానికి రొటేషన్ తాళాలు (Mutex) ఉపయోగిస్తాం.",
    englishText: "We use mutex locks on shared memory buffers to prevent race conditions during concurrent writes.",
    lang: "te-IN (Telugu)",
    reasoning: "Understands mutual exclusion locks for shared memory buffer write operations.",
  },
  api_design: {
    id: "api_design",
    criterion: "Idempotency & Retry Strategies",
    category: "API Protocol",
    score: 5,
    originalText: "నెట్‌వర్క్ వైఫల్యాల కోసం Idempotency Key లతో Retry Header చేర్చుతాం.",
    englishText: "For network retries, we include an Idempotency Key header so duplicated requests are safely ignored.",
    lang: "hi-IN (Hindi)",
    reasoning: "Demonstrates production experience with idempotent request handling in payment flows.",
  },
};

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "Voice Capture",
    short: "Audio Stream",
    detail: "16kHz PCM streaming mono capture over WebSocket to Saaras ASR endpoint.",
  },
  {
    step: "02",
    title: "High-Fidelity ASR",
    short: "Vernacular STT",
    detail: "Sarvam saaras:v3 model converts speech in Hindi/Telugu/English into precise transcript turns.",
  },
  {
    step: "03",
    title: "Intent Extraction",
    short: "Semantic Parse",
    detail: "Sarvam-30B extracts key technical entities, actions, and architectural intent.",
  },
  {
    step: "04",
    title: "Rubric Mapping",
    short: "Evidence Match",
    detail: "Maps technical claims directly to job description rubric criteria with original quotes.",
  },
  {
    step: "05",
    title: "Self-Consistency",
    short: "3-Run Verdict",
    detail: "Runs 3 parallel passes at temp=0.1. Takes the median score to eliminate LLM variance.",
  },
];

export function LandingPageInteractive() {
  const [selectedDemo, setSelectedDemo] = useState<string>("system_design");
  const [activePipelineStep, setActivePipelineStep] = useState<number>(2);
  const [activeLang, setActiveLang] = useState<"te" | "hi" | "en">("te");

  const currentSample = SAMPLE_DATA[selectedDemo];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] font-sans selection:bg-[#EAF6F4] selection:text-[#0F5D5A]">
      {/* Navigation Header */}
      <header className="border-b border-[#E8E8E3] bg-[#FAFAF8]/80 backdrop-blur-md sticky top-0 z-50 px-6 sm:px-12 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl font-medium tracking-tight text-[#111111]">Vernatech</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#8A8A8A] border border-[#E8E8E3] px-2 py-0.5 rounded-full">Research v1</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/console" className="text-xs font-mono text-[#5C5C5C] hover:text-[#111111] transition-colors">
              Console
            </Link>
            <Link href="/harness" className="text-xs font-mono text-[#5C5C5C] hover:text-[#111111] transition-colors">
              Fairness Audit
            </Link>
            <Link href="/candidate" className="bg-[#0F5D5A] hover:bg-[#0B4B48] text-white text-xs font-medium px-4 py-2 rounded-full transition-colors">
              Start Session
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-24 pb-20 px-6 sm:px-12 lg:px-24">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 border border-[#E8E8E3] bg-[#FFFFFF] px-3 py-1 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-[#0A7A53] animate-pulse"></span>
              <span className="font-mono text-xs text-[#5C5C5C]">Vernacular Technical Evaluation</span>
            </div>

            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-[#111111] leading-[1.08] tracking-tight">
              Engineering skill deserves engineering evidence.
            </h1>

            <p className="mt-8 text-xl sm:text-2xl text-[#5C5C5C] max-w-2xl leading-relaxed font-light">
              Score technical competence in any language. Every verdict links directly to transcript quotes, verified with 3-run self-consistency.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/candidate" className="inline-flex items-center justify-center bg-[#0F5D5A] hover:bg-[#0B4B48] text-white px-8 py-3.5 rounded-full text-sm font-medium transition-colors shadow-sm">
                Start Candidate Session
              </Link>
              <Link href="/console" className="inline-flex items-center justify-center bg-[#FFFFFF] text-[#111111] border border-[#E8E8E3] hover:border-[#111111] px-8 py-3.5 rounded-full text-sm font-medium transition-colors">
                Open Recruiter Console
              </Link>
              <Link href="/harness" className="inline-flex items-center justify-center bg-transparent text-[#5C5C5C] hover:text-[#111111] px-6 py-3.5 text-sm font-mono transition-colors">
                View Fairness Audit →
              </Link>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-5xl mx-auto px-6 sm:px-12 lg:px-24">
          <hr className="border-[#E8E8E3]" />
        </div>

        {/* Interactive Product Preview */}
        <section className="py-24 px-6 sm:px-12 lg:px-24">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
              <div>
                <span className="font-mono text-xs text-[#8A8A8A] uppercase tracking-wider">Interactive Preview</span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#111111] mt-2">Live Evidence Extraction</h2>
              </div>
              <div className="flex items-center gap-2 border border-[#E8E8E3] bg-[#FFFFFF] p-1 rounded-full">
                <button
                  type="button"
                  onClick={() => setActiveLang("te")}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${activeLang === "te" ? "bg-[#0F5D5A] text-white" : "text-[#5C5C5C]"}`}
                >
                  Telugu
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLang("hi")}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${activeLang === "hi" ? "bg-[#0F5D5A] text-white" : "text-[#5C5C5C]"}`}
                >
                  Hindi
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLang("en")}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${activeLang === "en" ? "bg-[#0F5D5A] text-white" : "text-[#5C5C5C]"}`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Interactive Workbench */}
            <div className="bg-[#FFFFFF] border border-[#E8E8E3] rounded-2xl overflow-hidden shadow-sm">
              {/* Header bar */}
              <div className="border-b border-[#E8E8E3] px-6 py-4 flex items-center justify-between bg-[#FAFAF8]">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0F5D5A]"></span>
                  <span className="font-mono text-xs text-[#111111] font-medium">Candidate Transcript & Traceability Map</span>
                </div>
                <span className="font-mono text-xs text-[#8A8A8A]">Session: 0f1fd598</span>
              </div>

              <div className="grid md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#E8E8E3]">
                {/* Rubric Selector Column */}
                <div className="md:col-span-5 p-6 flex flex-col gap-3">
                  <span className="font-mono text-xs text-[#8A8A8A] uppercase tracking-wider mb-2">Evaluated Criteria</span>
                  {Object.values(SAMPLE_DATA).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedDemo(item.id)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        selectedDemo === item.id
                          ? "border-[#0F5D5A] bg-[#EAF6F4]/30 text-[#111111]"
                          : "border-[#E8E8E3] hover:border-[#111111] text-[#5C5C5C]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] text-[#8A8A8A] uppercase">{item.category}</span>
                        <span className="font-mono text-xs font-semibold text-[#0F5D5A]">{item.score}/5</span>
                      </div>
                      <h4 className="text-sm font-medium text-[#111111]">{item.criterion}</h4>
                    </button>
                  ))}
                </div>

                {/* Evidence Inspection Column */}
                <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between bg-[#FFFFFF]">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="font-mono text-xs text-[#8A8A8A] uppercase">Verifiable Evidence Span</span>
                      <span className="font-mono text-xs text-[#0A7A53] border border-[#0A7A53]/30 px-2 py-0.5 rounded-full">
                        ✓ 3-Run Self-Consistent
                      </span>
                    </div>

                    <div className="mb-6">
                      <span className="font-mono text-[10px] text-[#8A8A8A] uppercase block mb-2">Original Spoken Turn</span>
                      <blockquote className="border-l-2 border-[#0F5D5A] pl-4 py-1 italic text-[#111111] text-base leading-relaxed">
                        &ldquo;{currentSample.originalText}&rdquo;
                      </blockquote>
                    </div>

                    <div className="mb-6">
                      <span className="font-mono text-[10px] text-[#8A8A8A] uppercase block mb-2">English Gloss Translation</span>
                      <p className="text-sm text-[#5C5C5C] leading-relaxed bg-[#FAFAF8] p-4 border border-[#E8E8E3] rounded-lg font-mono">
                        {currentSample.englishText}
                      </p>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] text-[#8A8A8A] uppercase block mb-1">Evaluator Reasoning</span>
                      <p className="text-xs text-[#5C5C5C] leading-relaxed">{currentSample.reasoning}</p>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-[#E8E8E3] flex items-center justify-between text-xs font-mono text-[#8A8A8A]">
                    <span>Language: {currentSample.lang}</span>
                    <span className="text-[#0F5D5A] font-medium">Trace ID: {currentSample.id}_span_01</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-5xl mx-auto px-6 sm:px-12 lg:px-24">
          <hr className="border-[#E8E8E3]" />
        </div>

        {/* Interactive Pipeline Diagram */}
        <section className="py-24 px-6 sm:px-12 lg:px-24">
          <div className="max-w-5xl mx-auto">
            <div className="mb-16">
              <span className="font-mono text-xs text-[#8A8A8A] uppercase tracking-wider">Technical Architecture</span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#111111] mt-2">How it works</h2>
            </div>

            {/* Interactive Pipeline Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8">
              {PIPELINE_STEPS.map((item, idx) => (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => setActivePipelineStep(idx)}
                  className={`text-left p-5 border transition-all ${
                    activePipelineStep === idx
                      ? "border-[#0F5D5A] bg-[#FFFFFF] shadow-sm"
                      : "border-[#E8E8E3] bg-[#FAFAF8] hover:border-[#111111]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs text-[#8A8A8A]">{item.step}</span>
                    {activePipelineStep === idx && <span className="w-1.5 h-1.5 rounded-full bg-[#0F5D5A]"></span>}
                  </div>
                  <h3 className="text-sm font-medium text-[#111111] mb-1">{item.title}</h3>
                  <span className="font-mono text-[10px] text-[#5C5C5C] block">{item.short}</span>
                </button>
              ))}
            </div>

            {/* Step Detail Card */}
            <div className="bg-[#FFFFFF] border border-[#E8E8E3] p-8 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <span className="font-mono text-xs text-[#0F5D5A] uppercase tracking-wider block mb-1">
                  Step {PIPELINE_STEPS[activePipelineStep].step} — {PIPELINE_STEPS[activePipelineStep].title}
                </span>
                <p className="text-base text-[#111111] max-w-2xl leading-relaxed">
                  {PIPELINE_STEPS[activePipelineStep].detail}
                </p>
              </div>

              {/* Animated Waveform / Node Visual */}
              <div className="flex items-center gap-1 bg-[#FAFAF8] border border-[#E8E8E3] p-4 rounded-xl shrink-0">
                <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
                  <path d="M10 20 Q 20 5, 30 20 T 50 20 T 70 5 T 90 35 T 110 20" stroke="#0F5D5A" strokeWidth="2" fill="none" />
                  <circle cx="30" cy="20" r="3" fill="#0F5D5A" />
                  <circle cx="70" cy="5" r="3" fill="#0F5D5A" />
                  <circle cx="90" cy="35" r="3" fill="#0F5D5A" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-5xl mx-auto px-6 sm:px-12 lg:px-24">
          <hr className="border-[#E8E8E3]" />
        </div>

        {/* Language Consistency Audit Section */}
        <section className="py-24 px-6 sm:px-12 lg:px-24">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-12 gap-12 items-center">
              <div className="md:col-span-5">
                <span className="font-mono text-xs text-[#8A8A8A] uppercase tracking-wider block mb-2">Fairness Engine</span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#111111] mb-6">Language Consistency Audit</h2>
                <p className="text-base text-[#5C5C5C] leading-relaxed mb-6">
                  Would this candidate receive the exact same technical score regardless of whether they answered in English or their native language?
                </p>
                <p className="text-sm text-[#5C5C5C] leading-relaxed mb-8">
                  Our fairness harness compares paired sessions across profiles, calculating Mean Absolute Difference (MAD) against run-to-run noise thresholds.
                </p>
                <Link href="/harness" className="inline-flex items-center justify-center border border-[#E8E8E3] hover:border-[#111111] text-[#111111] px-6 py-3 rounded-full text-xs font-mono transition-colors">
                  Run Language Consistency Audit →
                </Link>
              </div>

              <div className="md:col-span-7 bg-[#FFFFFF] border border-[#E8E8E3] p-8 rounded-2xl">
                <div className="flex items-center justify-between border-b border-[#E8E8E3] pb-4 mb-6">
                  <span className="font-mono text-xs text-[#111111] font-medium">Paired Profile Comparison</span>
                  <span className="font-mono text-xs text-[#0A7A53]">MAD: 0.12 (Within Noise Threshold)</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#FAFAF8] border border-[#E8E8E3] rounded-xl text-xs font-mono">
                    <span className="text-[#5C5C5C]">English Session</span>
                    <span className="text-[#111111] font-semibold">Score: 4.6 / 5</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#FAFAF8] border border-[#E8E8E3] rounded-xl text-xs font-mono">
                    <span className="text-[#5C5C5C]">Telugu Session</span>
                    <span className="text-[#111111] font-semibold">Score: 4.7 / 5</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E8E8E3] text-xs text-[#8A8A8A] flex items-center justify-between">
                  <span>Delta: 0.10 points</span>
                  <span>Scorer Noise: 0.15 points</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-28 px-6 sm:px-12 lg:px-24 bg-[#FFFFFF] border-t border-[#E8E8E3]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-4xl sm:text-5xl text-[#111111] mb-6">Ready to evaluate engineering skill with evidence?</h2>
            <p className="text-lg text-[#5C5C5C] max-w-xl mx-auto mb-10">
              Start a candidate session, inspect real-time intent extraction in the recruiter console, or validate fairness across languages.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/candidate" className="bg-[#0F5D5A] hover:bg-[#0B4B48] text-white px-8 py-3.5 rounded-full text-sm font-medium transition-colors">
                Start Candidate Session
              </Link>
              <Link href="/console" className="bg-[#FAFAF8] text-[#111111] border border-[#E8E8E3] hover:border-[#111111] px-8 py-3.5 rounded-full text-sm font-medium transition-colors">
                Recruiter Console
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 sm:px-12 text-center border-t border-[#E8E8E3] bg-[#FAFAF8]">
        <p className="font-mono text-xs text-[#8A8A8A]">Vernatech &copy; {new Date().getFullYear()} — Evaluated by evidence, not fluency.</p>
      </footer>
    </div>
  );
}
