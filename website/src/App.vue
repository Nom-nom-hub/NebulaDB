<template>
  <div class="min-h-screen flex flex-col">
    <header class="fixed top-0 left-0 right-0 z-50 transition-all duration-300" :class="{'bg-transparent': !scrolled, 'bg-nebula-950 bg-opacity-80 backdrop-blur-lg shadow-lg': scrolled}">
      <nav class="container mx-auto px-6 py-4 flex items-center justify-between">
        <!-- Logo and brand -->
        <div class="flex items-center space-x-2">
          <div class="relative group">
            <div class="absolute inset-0 bg-accent-blue rounded-full filter blur-md opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
            <img src="/logo-altocumulus.svg" alt="NebulaDB Logo" class="w-10 h-10 relative z-10 transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div class="flex items-center">
            <span class="text-xl font-bold text-white">NebulaDB</span>
            <div class="relative ml-2">
              <span class="text-xs font-medium bg-gradient-to-r from-accent-blue to-accent-purple text-white px-2 py-1 rounded-full">
                v0.2.2
              </span>
              <div class="absolute -inset-0.5 bg-gradient-to-r from-accent-blue to-accent-purple rounded-full opacity-50 blur-sm animate-pulse-slow"></div>
            </div>
          </div>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-1">
          <a href="#release" class="px-4 py-2 rounded-lg text-nebula-300 hover:text-white hover:bg-nebula-800 transition-colors">Release</a>
          <a href="#whats-new" class="px-4 py-2 rounded-lg text-nebula-300 hover:text-white hover:bg-nebula-800 transition-colors">What's New</a>
          <a href="#features" class="px-4 py-2 rounded-lg text-nebula-300 hover:text-white hover:bg-nebula-800 transition-colors">Features</a>
          <a href="#examples" class="px-4 py-2 rounded-lg text-nebula-300 hover:text-white hover:bg-nebula-800 transition-colors">Examples</a>
          <a href="#docs" class="px-4 py-2 rounded-lg text-nebula-300 hover:text-white hover:bg-nebula-800 transition-colors">Docs</a>

          <a href="https://github.com/Nom-nom-hub/NebulaDB" target="_blank" class="ml-2 flex items-center px-4 py-2 rounded-lg text-nebula-300 hover:text-white hover:bg-nebula-800 transition-colors">
            <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
            </svg>
            GitHub
          </a>

          <div class="ml-4">
            <a href="#demo" class="btn btn-primary">
              <span>Try Demo</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
              </svg>
            </a>
          </div>
        </div>

        <!-- Mobile menu button -->
        <div class="md:hidden">
          <button @click="mobileMenuOpen = !mobileMenuOpen" class="text-white focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </nav>

      <!-- Mobile Navigation -->
      <div v-if="mobileMenuOpen" class="md:hidden bg-nebula-900 border-t border-nebula-800">
        <div class="px-4 py-2 space-y-1">
          <a href="#release" class="block px-4 py-2 rounded-lg text-nebula-300 hover:text-white hover:bg-nebula-800" @click="mobileMenuOpen = false">Release</a>
          <a href="#whats-new" class="block px-4 py-2 rounded-lg text-nebula-300 hover:text-white hover:bg-nebula-800" @click="mobileMenuOpen = false">What's New</a>
          <a href="#features" class="block px-4 py-2 rounded-lg text-nebula-300 hover:text-white hover:bg-nebula-800" @click="mobileMenuOpen = false">Features</a>
          <a href="#examples" class="block px-4 py-2 rounded-lg text-nebula-300 hover:text-white hover:bg-nebula-800" @click="mobileMenuOpen = false">Examples</a>
          <a href="#docs" class="block px-4 py-2 rounded-lg text-nebula-300 hover:text-white hover:bg-nebula-800" @click="mobileMenuOpen = false">Docs</a>
          <a href="https://github.com/Nom-nom-hub/NebulaDB" target="_blank" class="block px-4 py-2 rounded-lg text-nebula-300 hover:text-white hover:bg-nebula-800" @click="mobileMenuOpen = false">GitHub</a>
          <div class="pt-2 pb-4">
            <a href="#demo" class="block w-full btn btn-primary text-center" @click="mobileMenuOpen = false">Try Demo</a>
          </div>
        </div>
      </div>
    </header>

    <main>
      <!-- Hero Section with Altocumulus Theme - Enhanced -->
      <section class="relative min-h-screen py-24 overflow-hidden flex items-center">
        <!-- Animated background elements -->
        <div class="absolute inset-0 w-full h-full">
          <!-- Base cloud background -->
          <img src="/hero-altocumulus.svg" alt="Altocumulus clouds" class="w-full h-full object-cover" />

          <!-- Animated particles -->
          <div class="absolute inset-0 opacity-60">
            <div class="absolute h-2 w-2 rounded-full bg-white top-1/4 left-1/4 animate-pulse-slow"></div>
            <div class="absolute h-3 w-3 rounded-full bg-accent-blue top-1/3 left-1/2 animate-pulse-slow" style="animation-delay: 0.5s"></div>
            <div class="absolute h-2 w-2 rounded-full bg-accent-purple top-2/3 left-1/3 animate-pulse-slow" style="animation-delay: 1s"></div>
            <div class="absolute h-2 w-2 rounded-full bg-white top-1/2 left-3/4 animate-pulse-slow" style="animation-delay: 1.5s"></div>
            <div class="absolute h-3 w-3 rounded-full bg-accent-green top-3/4 left-1/5 animate-pulse-slow" style="animation-delay: 2s"></div>
          </div>

          <!-- Animated data streams -->
          <div class="absolute inset-0">
            <div class="absolute h-40 w-1 bg-gradient-to-b from-transparent via-accent-blue to-transparent top-0 left-1/4 animate-float" style="animation-duration: 8s"></div>
            <div class="absolute h-60 w-1 bg-gradient-to-b from-transparent via-accent-purple to-transparent top-0 left-1/2 animate-float" style="animation-duration: 12s; animation-delay: 1s"></div>
            <div class="absolute h-40 w-1 bg-gradient-to-b from-transparent via-accent-green to-transparent top-0 left-3/4 animate-float" style="animation-duration: 10s; animation-delay: 2s"></div>
          </div>
        </div>

        <div class="container mx-auto px-4 relative z-10">
          <div class="flex flex-col md:flex-row items-center">
            <div class="md:w-1/2 mb-16 md:mb-0">
              <div class="flex items-center mb-8 animate-fade-in">
                <div class="relative">
                  <img src="/logo-altocumulus.svg" alt="NebulaDB Altocumulus Logo" class="w-20 h-20 mr-4 animate-float" style="animation-duration: 4s" />
                  <div class="absolute inset-0 bg-accent-blue rounded-full filter blur-xl opacity-30 animate-pulse-slow"></div>
                </div>
                <img src="/version-badge.svg" alt="v0.2.2 Altocumulus" class="h-12 animate-fade-in stagger-1" />
              </div>

              <h1 class="text-5xl md:text-6xl font-bold mb-6 animate-fade-in stagger-2">
                <span class="gradient-text">Fast. Flexible.</span><br/>
                <span class="text-white">Serverless.</span>
              </h1>

              <p class="text-2xl text-nebula-200 mb-8 animate-fade-in stagger-3">
                The embedded database for the modern stack.
              </p>

              <p class="text-nebula-300 mb-10 max-w-lg text-lg animate-fade-in stagger-4">
                NebulaDB is a reactive, TypeScript-first, schema-optional, embeddable NoSQL database that runs in the browser, Node.js, and Edge environments.
              </p>

              <div class="flex flex-wrap gap-4 animate-fade-in stagger-5">
                <a href="#getting-started" class="btn btn-primary">
                  <span>Get Started</span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </a>
                <a href="https://github.com/Nom-nom-hub/NebulaDB" target="_blank" class="btn btn-outline">
                  <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                  </svg>
                  <span>GitHub</span>
                </a>
              </div>
            </div>

            <div class="md:w-1/2 animate-fade-in stagger-3">
              <div class="relative">
                <!-- Glow effect behind code block -->
                <div class="absolute -inset-4 bg-gradient-to-r from-accent-blue/20 to-accent-purple/20 rounded-2xl blur-xl"></div>

                <!-- Code block with terminal-like header -->
                <div class="relative glass rounded-xl overflow-hidden shadow-2xl border border-nebula-700">
                  <!-- Terminal header -->
                  <div class="bg-nebula-800 px-4 py-3 flex items-center border-b border-nebula-700">
                    <div class="flex space-x-2">
                      <div class="w-3 h-3 rounded-full bg-red-500"></div>
                      <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div class="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div class="ml-4 text-sm text-nebula-400">nebuladb-example.ts</div>
                  </div>

                  <!-- Code content -->
                  <div class="code-block border-none bg-transparent">
                    <pre><code>import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';

// Create a database with in-memory adapter
const db = createDb({ adapter: new MemoryAdapter() });

// Create a collection
const users = db.collection('users');

// Insert documents
await users.insert({ name: 'Alice', age: 30 });
await users.insert({ name: 'Bob', age: 25 });

// Query documents
const result = await users.find({ age: { $gt: 20 } });
console.log(result);

// Subscribe to changes
users.subscribe({ age: { $gt: 30 } }, (result) => {
  console.log('Users over 30:', result);
});</code></pre>
                  </div>
                </div>

                <!-- Floating elements around code block -->
                <div class="absolute -top-6 -right-6 w-12 h-12 bg-accent-blue rounded-full opacity-20 animate-float"></div>
                <div class="absolute -bottom-8 -left-8 w-16 h-16 bg-accent-purple rounded-full opacity-20 animate-float" style="animation-delay: 1s"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Scroll indicator -->
        <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <a href="#release" class="text-white opacity-70 hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>
      </section>

      <!-- Release Section - Enhanced -->
      <section id="release" class="py-32 relative overflow-hidden">
        <!-- Background elements -->
        <div class="absolute inset-0 bg-gradient-to-b from-nebula-950 via-nebula-900 to-nebula-950"></div>

        <!-- Cloud patterns -->
        <div class="absolute inset-0 opacity-10">
          <img src="/hero-altocumulus.svg" alt="Altocumulus clouds" class="w-full h-full object-cover" />
        </div>

        <!-- Animated particles -->
        <div class="absolute inset-0">
          <div class="absolute h-2 w-2 rounded-full bg-accent-blue top-1/4 right-1/4 animate-pulse-slow"></div>
          <div class="absolute h-3 w-3 rounded-full bg-accent-purple bottom-1/3 right-1/2 animate-pulse-slow" style="animation-delay: 0.7s"></div>
          <div class="absolute h-2 w-2 rounded-full bg-accent-green top-2/3 right-1/3 animate-pulse-slow" style="animation-delay: 1.3s"></div>
        </div>

        <div class="container mx-auto px-4 relative z-10">
          <!-- Section header -->
          <div class="text-center mb-16 max-w-3xl mx-auto">
            <div class="inline-block mb-4">
              <div class="relative inline-block">
                <span class="inline-block px-4 py-1 text-sm font-medium text-white bg-accent-blue bg-opacity-20 rounded-full">
                  Latest Release
                </span>
                <div class="absolute -inset-0.5 bg-accent-blue rounded-full opacity-50 blur-sm animate-pulse-slow"></div>
              </div>
            </div>

            <h2 class="text-4xl md:text-5xl font-bold mb-6 text-white">
              Introducing <span class="gradient-text">v0.2.2 "Altocumulus"</span>
            </h2>

            <p class="text-xl text-nebula-300 max-w-2xl mx-auto">
              Our latest release brings enhanced error handling, improved performance, and a new cloud-themed naming scheme.
            </p>
          </div>

          <!-- Main content -->
          <div class="flex flex-col md:flex-row items-center justify-between max-w-6xl mx-auto mb-20">
            <div class="md:w-1/2 mb-12 md:mb-0 md:pr-12">
              <div class="relative">
                <!-- Decorative elements -->
                <div class="absolute -top-10 -left-10 w-20 h-20 bg-accent-blue rounded-full opacity-10 animate-float"></div>
                <div class="absolute -bottom-10 -right-10 w-24 h-24 bg-accent-purple rounded-full opacity-10 animate-float" style="animation-delay: 1.5s"></div>

                <!-- Content -->
                <div class="relative glass p-8 rounded-2xl">
                  <h3 class="text-2xl font-bold mb-6 gradient-text">Cloud-Themed Releases</h3>

                  <p class="text-nebula-200 mb-6 leading-relaxed">
                    Starting with v0.2.2, all NebulaDB releases are named after types of clouds, reflecting our commitment to building a database that's as flexible and powerful as the sky.
                  </p>

                  <p class="text-nebula-300 mb-8 leading-relaxed">
                    "Altocumulus" represents mid-level cloud formations that appear as white or gray patches, often in layers or waves - just like our layered architecture and wave of new features.
                  </p>

                  <div class="space-y-4">
                    <div class="flex items-center p-3 bg-nebula-800 bg-opacity-50 rounded-lg border border-nebula-700">
                      <div class="w-4 h-4 rounded-full bg-accent-blue mr-3 animate-pulse-slow"></div>
                      <div>
                        <p class="text-white font-medium">Current: v0.2.2 "Altocumulus"</p>
                        <p class="text-nebula-400 text-sm">Released April 2025</p>
                      </div>
                    </div>

                    <div class="flex items-center p-3 bg-nebula-800 bg-opacity-30 rounded-lg border border-nebula-800">
                      <div class="w-4 h-4 rounded-full bg-nebula-600 mr-3"></div>
                      <div>
                        <p class="text-nebula-300 font-medium">Coming soon: v0.3.0 "Billow"</p>
                        <p class="text-nebula-500 text-sm">Planned for June 2025</p>
                      </div>
                    </div>

                    <div class="flex items-center p-3 bg-nebula-800 bg-opacity-30 rounded-lg border border-nebula-800">
                      <div class="w-4 h-4 rounded-full bg-nebula-600 mr-3"></div>
                      <div>
                        <p class="text-nebula-300 font-medium">Future: v0.4.0 "Cirrus"</p>
                        <p class="text-nebula-500 text-sm">Planned for August 2025</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="md:w-1/2">
              <div class="relative">
                <!-- Glow effect -->
                <div class="absolute -inset-4 bg-gradient-to-r from-accent-blue/10 to-accent-purple/10 rounded-2xl blur-xl"></div>

                <!-- Image with animated border -->
                <div class="relative rounded-2xl overflow-hidden border border-nebula-700 shadow-2xl">
                  <div class="absolute inset-0 bg-gradient-to-r from-accent-blue/20 to-accent-purple/20 animate-pulse-slow"></div>
                  <img
                    src="/nebuladb_v0.2.2_altocumulus_no_button.png"
                    alt="NebulaDB v0.2.2 Altocumulus"
                    class="relative z-10 w-full"
                  />
                </div>

                <!-- Floating elements -->
                <div class="absolute -top-6 -right-6 w-12 h-12 bg-accent-blue rounded-full opacity-20 animate-float"></div>
                <div class="absolute -bottom-8 -left-8 w-16 h-16 bg-accent-purple rounded-full opacity-20 animate-float" style="animation-delay: 1s"></div>
              </div>
            </div>
          </div>

          <!-- Feature cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <!-- Enhanced Error Handling -->
            <div class="card group hover:border-accent-blue transition-colors duration-300">
              <div class="relative mb-6">
                <div class="absolute inset-0 bg-accent-blue opacity-20 rounded-full blur-lg group-hover:opacity-30 transition-opacity"></div>
                <div class="relative z-10 text-accent-blue text-5xl">🛡️</div>
              </div>
              <h3 class="text-xl font-bold mb-3 text-white group-hover:text-accent-blue transition-colors">Enhanced Error Handling</h3>
              <p class="text-nebula-300 leading-relaxed">Improved error recovery mechanisms and detailed error reporting for better debugging and application stability.</p>
            </div>

            <!-- Performance Boost -->
            <div class="card group hover:border-accent-purple transition-colors duration-300">
              <div class="relative mb-6">
                <div class="absolute inset-0 bg-accent-purple opacity-20 rounded-full blur-lg group-hover:opacity-30 transition-opacity"></div>
                <div class="relative z-10 text-accent-purple text-5xl">⚡</div>
              </div>
              <h3 class="text-xl font-bold mb-3 text-white group-hover:text-accent-purple transition-colors">Performance Boost</h3>
              <p class="text-nebula-300 leading-relaxed">Optimized query execution and indexing for faster data retrieval and updates, with up to 3x performance improvement.</p>
            </div>

            <!-- Improved Reactivity -->
            <div class="card group hover:border-accent-green transition-colors duration-300">
              <div class="relative mb-6">
                <div class="absolute inset-0 bg-accent-green opacity-20 rounded-full blur-lg group-hover:opacity-30 transition-opacity"></div>
                <div class="relative z-10 text-accent-green text-5xl">🔄</div>
              </div>
              <h3 class="text-xl font-bold mb-3 text-white group-hover:text-accent-green transition-colors">Improved Reactivity</h3>
              <p class="text-nebula-300 leading-relaxed">More efficient change detection and subscription updates for real-time applications with minimal re-renders.</p>
            </div>
          </div>

          <!-- CTA -->
          <div class="mt-16 text-center">
            <a href="#whats-new" class="btn btn-primary group">
              <span>Explore All New Features</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2 transition-transform group-hover:translate-y-1" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L10 14.586l5.293-5.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      <!-- What's New in v0.2.2 Section -->
      <section id="whats-new" class="py-20 bg-gradient-to-b from-nebula-900 to-nebula-800">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center text-white mb-4">What's New in v0.2.2 "Altocumulus"</h2>
          <p class="text-xl text-center text-nebula-300 mb-16 max-w-3xl mx-auto">
            Explore the powerful new features and improvements in our latest release
          </p>

          <!-- Enhanced Error Handling -->
          <div class="max-w-5xl mx-auto mb-24">
            <div class="flex flex-col md:flex-row items-center bg-nebula-800 rounded-xl overflow-hidden shadow-lg">
              <div class="md:w-1/2 p-8">
                <div class="inline-block text-accent-blue text-5xl mb-4 bg-nebula-700 p-4 rounded-lg">🛡️</div>
                <h3 class="text-2xl font-bold text-white mb-4">Enhanced Error Handling</h3>
                <p class="text-nebula-300 mb-6">
                  Our new error handling system provides detailed error messages, automatic recovery mechanisms, and comprehensive logging to help you debug and maintain your applications.
                </p>
                <ul class="space-y-2 text-nebula-300 mb-6">
                  <li class="flex items-start">
                    <svg class="h-6 w-6 text-accent-blue mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Detailed error messages with context</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="h-6 w-6 text-accent-blue mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Automatic recovery from transient errors</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="h-6 w-6 text-accent-blue mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Comprehensive error logging and reporting</span>
                  </li>
                </ul>
              </div>
              <div class="md:w-1/2 p-8 bg-nebula-700">
                <div class="code-block bg-nebula-900 bg-opacity-80 backdrop-blur-sm border border-nebula-700 rounded-lg">
                  <pre><code>import { createDb } from '@nebula-db/core';
import { ErrorHandlingPlugin } from '@nebula-db/plugin-error-handling';

// Create a database with error handling plugin
const db = createDb({
  plugins: [
    new ErrorHandlingPlugin({
      // Configure automatic recovery
      autoRecover: true,
      // Set maximum retry attempts
      maxRetries: 3,
      // Configure detailed logging
      logLevel: 'verbose',
      // Custom error handler
      onError: (error, context) => {
        console.error(`Error in ${context.operation}:`, error);
        // Send to monitoring service
        monitoringService.reportError(error, context);
      }
    })
  ]
});

// Errors now include detailed context
try {
  await db.collection('users').findOne({ id: 'invalid-id' });
} catch (error) {
  // Error includes operation context, collection info,
  // and suggestions for resolution
  console.log(error.details);
}</code></pre>
                </div>
              </div>
            </div>
          </div>

          <!-- Performance Optimizations -->
          <div class="max-w-5xl mx-auto mb-24">
            <div class="flex flex-col md:flex-row items-center bg-nebula-800 rounded-xl overflow-hidden shadow-lg">
              <div class="md:w-1/2 p-8 md:order-2">
                <div class="inline-block text-accent-purple text-5xl mb-4 bg-nebula-700 p-4 rounded-lg">⚡</div>
                <h3 class="text-2xl font-bold text-white mb-4">Performance Optimizations</h3>
                <p class="text-nebula-300 mb-6">
                  v0.2.2 includes significant performance improvements with enhanced indexing, query optimization, and batch operations for faster data access.
                </p>
                <ul class="space-y-2 text-nebula-300 mb-6">
                  <li class="flex items-start">
                    <svg class="h-6 w-6 text-accent-purple mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Up to 3x faster query execution</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="h-6 w-6 text-accent-purple mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Improved indexing with partial and compound indexes</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="h-6 w-6 text-accent-purple mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Efficient batch operations with true parallelism</span>
                  </li>
                </ul>
              </div>
              <div class="md:w-1/2 p-8 bg-nebula-700 md:order-1">
                <div class="code-block bg-nebula-900 bg-opacity-80 backdrop-blur-sm border border-nebula-700 rounded-lg">
                  <pre><code>import { createDb } from '@nebula-db/core';

const db = createDb();
const users = db.collection('users');

// Create optimized indexes
await users.createIndex({
  // Compound index for common queries
  fields: ['lastName', 'firstName'],
  // Partial index for active users only
  partial: { active: true },
  // Unique constraint
  unique: true
});

// Efficient batch operations
const results = await users.bulkInsert([
  { firstName: 'Alice', lastName: 'Smith', active: true },
  { firstName: 'Bob', lastName: 'Johnson', active: true },
  { firstName: 'Charlie', lastName: 'Brown', active: false }
], {
  // Enable parallel processing
  parallel: true,
  // Batch size for optimal performance
  batchSize: 100
});

// Optimized query using indexes
const activeUsers = await users.find({
  lastName: 'Smith',
  active: true
}, {
  // Query hints for optimizer
  useIndex: 'lastName_firstName',
  // Projection for faster results
  projection: { firstName: 1, lastName: 1 }
});</code></pre>
                </div>
              </div>
            </div>
          </div>

          <!-- Improved Reactivity -->
          <div class="max-w-5xl mx-auto">
            <div class="flex flex-col md:flex-row items-center bg-nebula-800 rounded-xl overflow-hidden shadow-lg">
              <div class="md:w-1/2 p-8">
                <div class="inline-block text-accent-green text-5xl mb-4 bg-nebula-700 p-4 rounded-lg">🔄</div>
                <h3 class="text-2xl font-bold text-white mb-4">Improved Reactivity</h3>
                <p class="text-nebula-300 mb-6">
                  Build real-time applications with our enhanced reactive query system that efficiently updates only what has changed.
                </p>
                <ul class="space-y-2 text-nebula-300 mb-6">
                  <li class="flex items-start">
                    <svg class="h-6 w-6 text-accent-green mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Fine-grained updates for minimal re-renders</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="h-6 w-6 text-accent-green mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Optimized change detection algorithm</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="h-6 w-6 text-accent-green mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Debounced updates for high-frequency changes</span>
                  </li>
                </ul>
              </div>
              <div class="md:w-1/2 p-8 bg-nebula-700">
                <div class="code-block bg-nebula-900 bg-opacity-80 backdrop-blur-sm border border-nebula-700 rounded-lg">
                  <pre><code>import { createDb } from '@nebula-db/core';

const db = createDb();
const tasks = db.collection('tasks');

// Subscribe to reactive query with options
const unsubscribe = tasks.subscribe(
  // Query criteria
  { status: 'active', priority: { $gte: 'medium' } },
  // Callback receives only what changed
  (activeTasks, changes) => {
    console.log('Active tasks:', activeTasks);

    // Process only what changed
    if (changes.added.length > 0) {
      renderNewTasks(changes.added);
    }

    if (changes.updated.length > 0) {
      updateTasksInUI(changes.updated);
    }

    if (changes.removed.length > 0) {
      removeTasksFromUI(changes.removed);
    }
  },
  // Subscription options
  {
    // Debounce rapid changes
    debounce: 100,
    // Sort results
    sort: { priority: -1, dueDate: 1 },
    // Include specific fields
    projection: { title: 1, priority: 1, dueDate: 1 }
  }
);

// Later, unsubscribe when done
unsubscribe();</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section id="features" class="py-20">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-12">Features</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="card">
              <div class="text-accent-blue text-4xl mb-4">🚀</div>
              <h3 class="text-xl font-semibold mb-2">Blazing Fast</h3>
              <p class="text-nebula-600">In-memory operations with optional persistence for maximum performance.</p>
            </div>
            <div class="card">
              <div class="text-accent-purple text-4xl mb-4">🔄</div>
              <h3 class="text-xl font-semibold mb-2">Reactive</h3>
              <p class="text-nebula-600">Live queries that update in real-time when your data changes.</p>
            </div>
            <div class="card">
              <div class="text-accent-green text-4xl mb-4">📐</div>
              <h3 class="text-xl font-semibold mb-2">TypeScript-First</h3>
              <p class="text-nebula-600">Full type safety with your data for a better developer experience.</p>
            </div>
            <div class="card">
              <div class="text-accent-red text-4xl mb-4">🧩</div>
              <h3 class="text-xl font-semibold mb-2">Modular</h3>
              <p class="text-nebula-600">Use only what you need with adapters and plugins for maximum flexibility.</p>
            </div>
            <div class="card">
              <div class="text-accent-blue text-4xl mb-4">🌐</div>
              <h3 class="text-xl font-semibold mb-2">Universal</h3>
              <p class="text-nebula-600">Works in browsers, Node.js, and Edge environments without modification.</p>
            </div>
            <div class="card">
              <div class="text-accent-purple text-4xl mb-4">🔌</div>
              <h3 class="text-xl font-semibold mb-2">Extensible</h3>
              <p class="text-nebula-600">Create custom adapters and plugins to extend functionality.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Getting Started Section -->
      <section id="getting-started" class="py-20 bg-nebula-100">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-12">Getting Started</h2>
          <div class="max-w-3xl mx-auto">
            <div class="card mb-8">
              <h3 class="text-xl font-semibold mb-4">Installation</h3>
              <div class="code-block mb-4">
                <pre><code># Install core package
npm install @nebula/core

# Install adapters as needed
npm install @nebula/adapter-memory
npm install @nebula/adapter-localstorage
npm install @nebula/adapter-indexeddb
npm install @nebula/adapter-filesystem

# Install plugins as needed
npm install @nebula/plugin-validation
npm install @nebula/plugin-encryption
npm install @nebula/plugin-versioning</code></pre>
              </div>
            </div>
            <div class="card">
              <h3 class="text-xl font-semibold mb-4">Basic Usage</h3>
              <div class="code-block">
                <pre><code>import { createDb } from '@nebula/core';
import { LocalStorageAdapter } from '@nebula/adapter-localstorage';

// Create a database with localStorage adapter
const db = createDb({
  adapter: new LocalStorageAdapter('my-app')
});

// Create a collection
const todos = db.collection('todos');

// Insert a document
await todos.insert({
  title: 'Learn NebulaDB',
  completed: false,
  createdAt: new Date().toISOString()
});

// Query documents
const incompleteTodos = await todos.find({ completed: false });

// Update a document
await todos.update(
  { title: 'Learn NebulaDB' },
  { $set: { completed: true } }
);

// Subscribe to changes
todos.subscribe({ completed: true }, (completedTodos) => {
  console.log('Completed todos:', completedTodos);
});</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Examples Section -->
      <section id="examples" class="py-20">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-12">Examples</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div class="card">
              <h3 class="text-xl font-semibold mb-4">Todo App</h3>
              <p class="text-nebula-600 mb-4">A simple todo application using NebulaDB with localStorage persistence.</p>
              <div class="code-block mb-4">
                <pre><code>const todos = db.collection('todos');

// Add a new todo
async function addTodo(title) {
  return await todos.insert({
    title,
    completed: false,
    createdAt: new Date().toISOString()
  });
}

// Toggle todo completion
async function toggleTodo(id) {
  const todo = await todos.findOne({ id });
  if (todo) {
    await todos.update(
      { id },
      { $set: { completed: !todo.completed } }
    );
  }
}

// Get active todos
todos.subscribe(
  { completed: false },
  (activeTodos) => {
    renderTodoList(activeTodos);
  }
);</code></pre>
              </div>
              <a href="https://github.com/nebula-db/examples/todo" target="_blank" class="text-accent-blue hover:underline">View full example →</a>
            </div>
            <div class="card">
              <h3 class="text-xl font-semibold mb-4">Blog App</h3>
              <p class="text-nebula-600 mb-4">A blog application using NebulaDB with file system persistence.</p>
              <div class="code-block mb-4">
                <pre><code>const posts = db.collection('posts');
const comments = db.collection('comments');

// Create a new post
async function createPost(title, content, author) {
  return await posts.insert({
    title,
    content,
    author,
    createdAt: new Date().toISOString()
  });
}

// Add a comment to a post
async function addComment(postId, author, content) {
  return await comments.insert({
    postId,
    author,
    content,
    createdAt: new Date().toISOString()
  });
}

// Get post with comments
async function getPostWithComments(postId) {
  const post = await posts.findOne({ id: postId });
  const postComments = await comments.find({ postId });
  return { ...post, comments: postComments };
}</code></pre>
              </div>
              <a href="https://github.com/nebula-db/examples/blog" target="_blank" class="text-accent-blue hover:underline">View full example →</a>
            </div>
          </div>
        </div>
      </section>

      <!-- Demo Section -->
      <section id="demo" class="py-20 bg-nebula-900 text-white">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-12">Interactive Demo</h2>
          <div class="max-w-4xl mx-auto">
            <div class="bg-nebula-800 rounded-xl p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 class="text-xl font-semibold mb-4">Code</h3>
                  <textarea
                    v-model="demoCode"
                    class="w-full h-64 bg-nebula-900 text-nebula-50 p-4 rounded-lg font-mono text-sm"
                    spellcheck="false"
                  ></textarea>
                  <button @click="runDemo" class="btn btn-primary mt-4">Run</button>
                </div>
                <div>
                  <h3 class="text-xl font-semibold mb-4">Result</h3>
                  <div class="w-full h-64 bg-nebula-900 text-nebula-50 p-4 rounded-lg font-mono text-sm overflow-auto">
                    <pre><code>{{ demoResult }}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Documentation Section -->
      <section id="docs" class="py-20">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-12">Documentation</h2>
          <div class="max-w-4xl mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <a href="https://github.com/nebula-db/nebula-db/blob/main/docs/README.md" target="_blank" class="card hover:shadow-lg transition-shadow">
                <h3 class="text-xl font-semibold mb-2">Getting Started</h3>
                <p class="text-nebula-600">Learn the basics of NebulaDB and how to use it in your projects.</p>
              </a>
              <a href="https://github.com/nebula-db/nebula-db/blob/main/docs/api-reference.md" target="_blank" class="card hover:shadow-lg transition-shadow">
                <h3 class="text-xl font-semibold mb-2">API Reference</h3>
                <p class="text-nebula-600">Detailed documentation of the NebulaDB API.</p>
              </a>
              <a href="https://github.com/nebula-db/nebula-db/blob/main/docs/examples.md" target="_blank" class="card hover:shadow-lg transition-shadow">
                <h3 class="text-xl font-semibold mb-2">Examples</h3>
                <p class="text-nebula-600">Example applications and code snippets.</p>
              </a>
              <a href="https://github.com/nebula-db/nebula-db/blob/main/docs/adapters.md" target="_blank" class="card hover:shadow-lg transition-shadow">
                <h3 class="text-xl font-semibold mb-2">Adapters</h3>
                <p class="text-nebula-600">Learn about the available storage adapters and how to create your own.</p>
              </a>
              <a href="https://github.com/nebula-db/nebula-db/blob/main/docs/plugins.md" target="_blank" class="card hover:shadow-lg transition-shadow">
                <h3 class="text-xl font-semibold mb-2">Plugins</h3>
                <p class="text-nebula-600">Extend NebulaDB with plugins for validation, encryption, and more.</p>
              </a>
              <a href="https://github.com/nebula-db/nebula-db/blob/main/docs/advanced-usage.md" target="_blank" class="card hover:shadow-lg transition-shadow">
                <h3 class="text-xl font-semibold mb-2">Advanced Usage</h3>
                <p class="text-nebula-600">Advanced patterns and techniques for using NebulaDB.</p>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="bg-nebula-900 text-white py-12 relative overflow-hidden">
      <!-- Cloud background in footer -->
      <div class="absolute inset-0 opacity-10">
        <img src="/hero-altocumulus.svg" alt="Altocumulus clouds" class="w-full h-full object-cover" />
      </div>

      <div class="container mx-auto px-4 relative z-10">
        <div class="flex flex-col md:flex-row justify-between">
          <div class="mb-8 md:mb-0">
            <div class="flex items-center space-x-2 mb-4">
              <img src="/logo-altocumulus.svg" alt="NebulaDB Logo" class="w-8 h-8" />
              <span class="text-lg font-bold">NebulaDB</span>
              <span class="text-xs font-medium bg-gradient-to-r from-accent-blue to-accent-purple text-white px-2 py-1 rounded-full ml-2">v0.2.2 "Altocumulus"</span>
            </div>
            <p class="text-nebula-400 max-w-md">
              NebulaDB is a reactive, TypeScript-first, schema-optional, embeddable NoSQL database that runs in the browser, Node.js, and Edge environments.
            </p>
            <div class="mt-4">
              <a href="#release" class="text-accent-blue hover:text-accent-purple">Learn about our cloud-themed releases →</a>
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h3 class="text-lg font-semibold mb-4">Resources</h3>
              <ul class="space-y-2">
                <li><a href="#docs" class="text-nebula-400 hover:text-white">Documentation</a></li>
                <li><a href="#examples" class="text-nebula-400 hover:text-white">Examples</a></li>
                <li><a href="https://github.com/Nom-nom-hub/NebulaDB/blob/main/CHANGELOG.md" target="_blank" class="text-nebula-400 hover:text-white">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h3 class="text-lg font-semibold mb-4">Community</h3>
              <ul class="space-y-2">
                <li><a href="https://github.com/Nom-nom-hub/NebulaDB" target="_blank" class="text-nebula-400 hover:text-white">GitHub</a></li>
                <li><a href="https://github.com/Nom-nom-hub/NebulaDB/issues" target="_blank" class="text-nebula-400 hover:text-white">Issues</a></li>
                <li><a href="https://github.com/Nom-nom-hub/NebulaDB/blob/main/CONTRIBUTING.md" target="_blank" class="text-nebula-400 hover:text-white">Contributing</a></li>
              </ul>
            </div>
            <div>
              <h3 class="text-lg font-semibold mb-4">Releases</h3>
              <ul class="space-y-2">
                <li>
                  <div class="flex items-center">
                    <span class="text-accent-blue">v0.2.2 "Altocumulus"</span>
                    <span class="ml-2 px-2 py-0.5 text-xs bg-accent-blue bg-opacity-20 text-accent-blue rounded-full">Latest</span>
                  </div>
                  <div class="mt-1 ml-4 text-sm">
                    <a href="#whats-new" class="text-nebula-400 hover:text-white">See what's new →</a>
                  </div>
                </li>
                <li><span class="text-nebula-400">v0.3.0 "Billow" (Coming soon)</span></li>
                <li><a href="https://github.com/Nom-nom-hub/NebulaDB/blob/main/LICENSE" target="_blank" class="text-nebula-400 hover:text-white">MIT License</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="border-t border-nebula-800 mt-12 pt-8 text-center text-nebula-400">
          <p>© {{ new Date().getFullYear() }} NebulaDB. Released under the MIT License.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

// Reactive state
const scrolled = ref(false);
const mobileMenuOpen = ref(false);

// Scroll handler for transparent header
const handleScroll = () => {
  scrolled.value = window.scrollY > 50;
};

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  handleScroll(); // Check initial scroll position
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

// Mock database functionality
const createDb = () => {
  return {
    collection: (name) => ({
      insert: async (doc) => ({ ...doc, id: Math.random().toString(36).substr(2, 9) }),
      find: async (query) => {
        // Mock data for demo
        const users = [
          { id: '1', name: 'Alice', age: 30 },
          { id: '2', name: 'Bob', age: 25 },
          { id: '3', name: 'Charlie', age: 35 }
        ];

        if (query.age && query.age.$gt) {
          return users.filter(user => user.age > query.age.$gt);
        }

        return users;
      },
      subscribe: (query, callback) => {
        // Mock subscription
        setTimeout(() => {
          const users = [
            { id: '1', name: 'Alice', age: 30 },
            { id: '3', name: 'Charlie', age: 35 }
          ];
          callback(users);
        }, 500);

        return () => {}; // Unsubscribe function
      }
    })
  };
};

const MemoryAdapter = function() {};

const demoCode = ref(`// Create a database with in-memory adapter
const db = createDb({ adapter: new MemoryAdapter() });

// Create a collection
const users = db.collection('users');

// Insert documents
await users.insert({ name: 'Alice', age: 30 });
await users.insert({ name: 'Bob', age: 25 });
await users.insert({ name: 'Charlie', age: 35 });

// Query documents
const result = await users.find({ age: { $gt: 25 } });
console.log(result);`);

const demoResult = ref('// Run the code to see the result');

async function runDemo() {
  try {
    demoResult.value = '// Running...';

    // Create a new Function from the code string
    const asyncFunction = new Function('createDb', 'MemoryAdapter', `
      return (async () => {
        const logs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
          logs.push(args);
          originalConsoleLog(...args);
        };

        try {
          ${demoCode.value}
          return logs;
        } finally {
          console.log = originalConsoleLog;
        }
      })();
    `);

    // Execute the function
    const logs = await asyncFunction(createDb, MemoryAdapter);

    // Format the result
    demoResult.value = logs.map(args => {
      return args.map(arg => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      }).join(' ');
    }).join('\n');

  } catch (error) {
    demoResult.value = `// Error: ${error.message}`;
  }
}
</script>
