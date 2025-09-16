'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
  {
    question: "What is MedevAI and how does it solve regulatory challenges?",
    answer: "MedevAI is an AI-powered regulatory assistant designed to streamline the FDA medical device approval process. It transforms the traditionally manual, time-consuming process of predicate device research from 2-3 days to under 2 hours."
  },
  {
    question: "What is Kiro and why is it revolutionary for development?",
    answer: "Kiro is an advanced AI development framework that uses a spec-driven approach to autonomous software development. Instead of writing code line-by-line, developers create high-level specifications and technical guidelines."
  },
  {
    question: "How does Kiro's spec-driven approach work in practice?",
    answer: "The spec-driven approach starts with comprehensive specifications that define features, technical standards, and implementation patterns. AI agents use these documents as a single source of truth to execute development tasks autonomously."
  }
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="container space-y-6 py-8 md:py-12 lg:py-24">
      <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
        <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="mx-auto max-w-[64rem] space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="border rounded-lg">
            <button
              className="flex w-full items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              onClick={() => toggleFAQ(index)}
            >
              <span className="font-medium">{faq.question}</span>
              {openIndex === index ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            {openIndex === index && (
              <div className="px-6 pb-6">
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}