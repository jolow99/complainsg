"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      <header className="border-b border-red-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-red-600 flex items-center">
            <span className="mr-2">🇸🇬</span>
            ComplainSG
          </div>
          <nav className="flex items-center space-x-6">
            <Link 
              href="/chat" 
              className="bg-red-400 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="py-20 px-4 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-20 h-20 bg-red-200/30 rounded-full blur-xl"></div>
            <div className="absolute top-40 right-20 w-32 h-32 bg-orange-200/40 rounded-full blur-xl"></div>
            <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-pink-200/30 rounded-full blur-xl"></div>
          </div>
          
          <div className="container mx-auto text-center max-w-4xl relative">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">
              <span className="text-red-500">Complain Better</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Bridging the gap between citizens and policymakers through AI-powered feedback collection.
            </p>
            <div className="flex flex-col gap-4 justify-center items-center">
              <Link 
                href="/chat" 
                className="inline-flex items-center justify-center bg-red-400 hover:bg-red-500 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Start Complaining Better
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-white">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center">
                <span className="mr-3">🇸🇬</span>
                Meet ComplainSG
                <span className="ml-3">💬</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                ComplainSG helps you complain better through intelligent, guided conversations that ensure your concerns are heard and addressed effectively.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-8 rounded-2xl border border-gray-100 bg-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <div className="text-5xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">AI-Facilitated Conversations</h3>
                <p className="text-gray-600">Our AI helps you refine and structure your complaint to maximize its impact and clarity</p>
              </div>
              <div className="text-center p-8 rounded-2xl border border-gray-100 bg-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <div className="text-5xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Relevant Information</h3>
                <p className="text-gray-600">Get directed to resources, policies, and contacts that can help address your specific issue</p>
              </div>
              <div className="text-center p-8 rounded-2xl border border-gray-100 bg-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <div className="text-5xl mb-4">🤝</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Connect with Others</h3>
                <p className="text-gray-600">Find and connect with others facing similar problems through our PulseSG community platform</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gradient-to-r from-orange-50 to-red-50">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="mr-3">📊</span>
                  Introducing PulseSG
                </h2>
                <p className="text-xl text-gray-600 mb-6">
                  Our analytics platform that aggregates complaints and community insights to create a comprehensive view of Singapore&apos;s concerns.
                </p>
                <div className="space-y-4 text-gray-600">
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p><strong>Complaint Aggregation:</strong> See trending issues across different regions and topics</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p><strong>Interactive Map View:</strong> Visualize problems geographically across Singapore</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p><strong>Community Discussions:</strong> Join conversations and collaborate on solutions</p>
                  </div>
                </div>
                <div className="mt-8">
                  <Link 
                    href="/pulse" 
                    className="inline-flex items-center bg-orange-400 hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
                  >
                    Explore PulseSG
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-xl border border-orange-100">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-4">🗺️</div>
                    <h3 className="text-lg font-semibold text-gray-800">Singapore Pulse Map</h3>
                    <p className="text-gray-600 text-sm">Community insights platform</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                      <div className="text-2xl font-bold text-orange-500">📍</div>
                      <div className="text-xs text-gray-600">Location-based Issues</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                      <div className="text-2xl font-bold text-red-500">💬</div>
                      <div className="text-xs text-gray-600">Discussion Forums</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-white/70">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center justify-center">
                <span className="mr-3">🚫</span>
                The Problem We Solve
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-red-50/80 p-8 rounded-2xl border border-red-100 text-center">
                <div className="text-4xl mb-4">⏰</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Long Queues</h3>
                <p className="text-gray-600">Traditional Meet-the-People sessions have long queues and limited accessibility</p>
              </div>
              <div className="bg-red-50/80 p-8 rounded-2xl border border-red-100 text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Pre-defined Agendas</h3>
                <p className="text-gray-600">REACH consultations are pre-defined, missing organic community concerns</p>
              </div>
              <div className="bg-red-50/80 p-8 rounded-2xl border border-red-100 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Hard to Find Channels</h3>
                <p className="text-gray-600">Citizens struggle to find appropriate channels for their feedback</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 px-4 bg-gray-50">
          <div className="container mx-auto text-center max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Ready to Make Your Voice Heard?
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Join others in Singapore already shaping policy through intelligent feedback collection.
            </p>
            <Link 
              href="/chat" 
              className="inline-flex items-center bg-red-400 hover:bg-red-500 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Start Your Feedback Journey
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-8 px-4 border-t border-red-100 bg-white">
        <div className="container mx-auto text-center">
          <p className="text-gray-600 flex items-center justify-center">
            <span className="mr-2">🇸🇬</span>
            © 2025 ComplainSG. Building bridges between citizens and policymakers in Singapore.
            <span className="ml-2">❤️</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
