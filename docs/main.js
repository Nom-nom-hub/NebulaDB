/**
 * NebulaDB v0.6.0 "Cumulus" — Main JavaScript
 * Scroll animations, stat counters, parallax, and interactions
 */
document.addEventListener('DOMContentLoaded', () => {
  // ===== Navigation scroll effect =====
  const nav = document.querySelector('nav');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // Mobile menu toggle
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // ===== Reveal on scroll (Intersection Observer) =====
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  revealElements.forEach((el) => revealObserver.observe(el));

  // ===== Stat Counter Animation =====
  const statNumbers = document.querySelectorAll('.stat-number[data-count]');
  const statsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-count'), 10);
          const suffix = el.getAttribute('data-suffix') || '';
          const duration = 2000;
          const startTime = performance.now();

          function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);

            el.textContent = current.toLocaleString() + suffix;

            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            }
          }

          requestAnimationFrame(updateCounter);
          statsObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  statNumbers.forEach((el) => statsObserver.observe(el));

  // ===== Parallax clouds on scroll =====
  const clouds = document.querySelectorAll('.cloud');
  if (clouds.length > 0) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      clouds.forEach((cloud, i) => {
        const speed = 0.02 + i * 0.015;
        const yOffset = scrollY * speed;
        cloud.style.transform = `translateY(${yOffset}px)`;
      });
    });
  }

  // ===== Smooth scroll for anchor links =====
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = parseInt(getComputedStyle(document.documentElement).scrollPaddingTop, 10) || 72;
        window.scrollTo({
          top: target.offsetTop - offset,
          behavior: 'smooth',
        });
      }
    });
  });

  // ===== Terminal typing effect =====
  const terminalEl = document.getElementById('typed-terminal');
  if (terminalEl) {
    const lines = [
      { text: '$ npm install @nebula-db/core@0.6.0', color: '#22d3ee', prefix: '$ ' },
      { text: '✔ NebulaDB v0.6.0 "Cumulus" installed', color: '#4ade80', prefix: '✔ ' },
      { text: '', color: '', prefix: '' },
      { text: "import { createDb } from '@nebula-db/core';", color: '#c084fc', prefix: '> ' },
      { text: "import { CloudflareD1Adapter } from '@nebula-db/adapter-cloudflare-d1';", color: '#c084fc', prefix: '> ' },
      { text: "import { VercelKvAdapter } from '@nebula-db/adapter-vercel-kv';", color: '#c084fc', prefix: '> ' },
      { text: "import { DenoKvAdapter } from '@nebula-db/adapter-deno-kv';", color: '#c084fc', prefix: '> ' },
      { text: '', color: '', prefix: '' },
      { text: '// ☁️ Cumulus v0.6.0: Cloud & Edge Integration', color: '#94a3b8', prefix: '> ' },
      { text: 'const db = createDb({', color: '#e2e8f0', prefix: '> ' },
      { text: '  adapter: new HybridAdapter({', color: '#e2e8f0', prefix: '> ' },
      { text: '    local: new SQLiteAdapter("app.db"),', color: '#e2e8f0', prefix: '> ' },
      { text: '    remote: new CloudflareD1Adapter({', color: '#e2e8f0', prefix: '> ' },
      { text: '      databaseId: env.D1_DATABASE_ID,', color: '#e2e8f0', prefix: '> ' },
      { text: '      accountId: env.CF_ACCOUNT_ID,', color: '#e2e8f0', prefix: '> ' },
      { text: '      apiToken: env.CF_API_TOKEN', color: '#e2e8f0', prefix: '> ' },
      { text: '    })', color: '#e2e8f0', prefix: '> ' },
      { text: '  })', color: '#e2e8f0', prefix: '> ' },
      { text: '});', color: '#e2e8f0', prefix: '> ' },
      { text: '', color: '', prefix: '' },
      { text: '// Edge-friendly queries — works everywhere', color: '#94a3b8', prefix: '> ' },
      { text: "const users = db.collection('users');", color: '#e2e8f0', prefix: '> ' },
      { text: "await users.insert({ name: 'Alice', role: 'admin' });", color: '#e2e8f0', prefix: '> ' },
      { text: "const admins = await users.find({ role: 'admin' });", color: '#e2e8f0', prefix: '> ' },
      { text: 'console.log(admins); // [{ name: "Alice", ... }]', color: '#e2e8f0', prefix: '> ' },
    ];

    let lineIndex = 0;
    let charIndex = 0;
    let output = [];

    function typeNext() {
      if (lineIndex >= lines.length) return;

      const line = lines[lineIndex];
      const fullText = line.prefix + line.text;

      if (charIndex === 0 && line.text === '') {
        output[lineIndex] = '';
        lineIndex++;
        charIndex = 0;
        setTimeout(typeNext, 200);
        return;
      }

      if (charIndex <= fullText.length) {
        const prefixSpan = line.color
          ? `<span style="color:${line.color}">${line.prefix}</span>`
          : line.prefix;
        const textPart = line.text.slice(0, charIndex - line.prefix.length);
        output[lineIndex] = prefixSpan + textPart;
        terminalEl.innerHTML = output.join('<br>');
        charIndex++;
        terminalEl.scrollTop = terminalEl.scrollHeight;
        setTimeout(typeNext, 15);
      } else {
        lineIndex++;
        charIndex = 0;
        setTimeout(typeNext, 200);
      }
    }

    setTimeout(typeNext, 500);
  }

  // ===== Code highlighter for pre blocks (simple) =====
  document.querySelectorAll('pre code').forEach((block) => {
    // Highlight comments
    block.innerHTML = block.innerHTML.replace(
      /(\/\/.*)/g,
      '<span style="color:#94a3b8;font-style:italic">$1</span>'
    );
    // Highlight strings
    block.innerHTML = block.innerHTML.replace(
      /(&#39;.*?&#39;|&quot;.*?&quot;|'[^']*'|"[^"]*")/g,
      '<span style="color:#4ade80">$1</span>'
    );
    // Highlight keywords
    const keywords = ['import', 'from', 'const', 'let', 'await', 'async', 'new', 'return', 'if', 'else', 'for', 'of'];
    keywords.forEach((kw) => {
      block.innerHTML = block.innerHTML.replace(
        new RegExp(`\\b(${kw})\\b`, 'g'),
        '<span style="color:#c084fc">$1</span>'
      );
    });
  });
});
