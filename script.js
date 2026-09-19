/* ==========================================================================
   PASTEL SCRAPBOOK BIRTHDAY WEBSITE INTERACTIVE LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- AUDIO SYNTHESIZER SYSTEM (Web Audio API) ---
  class SoundEffects {
    constructor() {
      this.ctx = null;
      this.isMusicPlaying = false;
      this.musicInterval = null;
    }

    initCtx() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playPop(freq = 440, type = 'sine') {
      try {
        this.initCtx();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.8, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
      } catch (e) {
        // Fallback silently if audio blocked
      }
    }

    playSuccessChime() {
      try {
        this.initCtx();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            this.playPop(freq, 'triangle');
          }, idx * 100);
        });
      } catch (e) {}
    }

    playErrorBuzzer() {
      try {
        this.initCtx();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
      } catch (e) {}
    }

    playBlowoutSound() {
      try {
        this.initCtx();
        // Noise buffer puff + happy chime
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.4);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        whiteNoise.start();

        setTimeout(() => this.playSuccessChime(), 300);
      } catch (e) {}
    }

    toggleSoftMusic(onSuccessState) {
      this.initCtx();
      if (this.isMusicPlaying) {
        this.isMusicPlaying = false;
        clearInterval(this.musicInterval);
        if (onSuccessState) onSuccessState(false);
      } else {
        this.isMusicPlaying = true;
        if (onSuccessState) onSuccessState(true);
        
        // Soft romantic music box melody
        const melody = [392, 440, 523.25, 587.33, 659.25, 587.33, 523.25, 440];
        let step = 0;
        this.musicInterval = setInterval(() => {
          if (!this.isMusicPlaying) return;
          const note = melody[step % melody.length];
          this.playPop(note * 0.75, 'sine');
          step++;
        }, 600);
      }
    }
  }

  const audio = new SoundEffects();

  // Music toggle button
  const musicBtn = document.getElementById('music-toggle');
  const musicLabel = document.getElementById('music-label');
  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      audio.toggleSoftMusic((isPlaying) => {
        musicLabel.textContent = isPlaying ? 'Music: Playing 💖' : 'Music: Off';
      });
    });
  }

  // --- NAVIGATION STATE MACHINE ---
  function showStep(stepId) {
    const screens = document.querySelectorAll('.step-screen');
    screens.forEach(s => {
      s.classList.remove('active-step');
      s.style.display = 'none';
    });

    const targetScreen = document.getElementById(stepId);
    if (targetScreen) {
      targetScreen.style.display = 'flex';
      setTimeout(() => {
        targetScreen.classList.add('active-step');
      }, 20);
      audio.playPop(520, 'sine');
    }
  }

  // --- STEP 1: KEYPAD & PASSCODE LOGIC ---
  let passcode = [];
  const correctPasscodes = ['2009', '20', '2909', '29', '2026'];
  const dots = document.querySelectorAll('#passcode-display .dot');

  function updateDots() {
    dots.forEach((dot, index) => {
      if (index < passcode.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  function validatePasscode() {
    const entered = passcode.join('');
    // Auto-accept 2009 or 2909 or any 4 digit passcode for cute user experience!
    if (correctPasscodes.includes(entered) || passcode.length === 4) {
      audio.playSuccessChime();
      createBurstConfetti();
      setTimeout(() => {
        showStep('step-2');
      }, 500);
    } else {
      audio.playErrorBuzzer();
      dots.forEach(d => d.classList.add('error'));
      setTimeout(() => {
        dots.forEach(d => d.classList.remove('error'));
        passcode = [];
        updateDots();
      }, 500);
    }
  }

  document.querySelectorAll('.key-btn[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (passcode.length < 4) {
        audio.playPop(400 + passcode.length * 80);
        passcode.push(btn.getAttribute('data-key'));
        updateDots();
        if (passcode.length === 4) {
          setTimeout(validatePasscode, 200);
        }
      }
    });
  });

  const clearBtn = document.getElementById('key-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      audio.playPop(300);
      passcode.pop();
      updateDots();
    });
  }

  const submitBtn = document.getElementById('key-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (passcode.length > 0) {
        validatePasscode();
      } else {
        // Auto default if heart pressed directly!
        passcode = ['2','9','0','9'];
        updateDots();
        setTimeout(validatePasscode, 200);
      }
    });
  }

  // Physical keyboard key listener for Step 1 passcode
  document.addEventListener('keydown', (e) => {
    const step1 = document.getElementById('step-1');
    if (step1 && step1.classList.contains('active-step')) {
      if (e.key >= '0' && e.key <= '9') {
        if (passcode.length < 4) {
          audio.playPop(400 + passcode.length * 80);
          passcode.push(e.key);
          updateDots();
          if (passcode.length === 4) {
            setTimeout(validatePasscode, 200);
          }
        }
      } else if (e.key === 'Backspace') {
        audio.playPop(300);
        passcode.pop();
        updateDots();
      } else if (e.key === 'Enter') {
        validatePasscode();
      }
    }
  });

  // --- STEP 2: TEASER & "NO" BUTTON LOGIC ---
  const btnYes = document.getElementById('btn-yes');
  const btnNo = document.getElementById('btn-no');
  const noModal = document.getElementById('no-modal');
  const modalTryAgainBtn = document.getElementById('modal-try-again-btn');

  if (btnYes) {
    btnYes.addEventListener('click', () => {
      audio.playSuccessChime();
      showStep('step-3');
    });
  }

  if (btnNo) {
    // Hover dodge logic or click trigger modal
    btnNo.addEventListener('mouseenter', () => {
      // Random subtle shift
      const randomX = (Math.random() - 0.5) * 120;
      const randomY = (Math.random() - 0.5) * 80;
      btnNo.style.transform = `translate(${randomX}px, ${randomY}px)`;
    });

    btnNo.addEventListener('click', () => {
      audio.playErrorBuzzer();
      if (noModal) {
        noModal.classList.remove('hidden-modal');
      }
    });
  }

  if (modalTryAgainBtn) {
    modalTryAgainBtn.addEventListener('click', () => {
      audio.playPop(600);
      if (noModal) {
        noModal.classList.add('hidden-modal');
      }
      showStep('step-3');
    });
  }

  // --- STEP 3: CELEBRATION TO STEP 4 ---
  const btnToStep4 = document.getElementById('btn-to-step4');
  if (btnToStep4) {
    btnToStep4.addEventListener('click', () => {
      showStep('step-4');
    });
  }

  // --- STEP 4: MAKE A WISH (CAKE BLOWOUT) ---
  const cakeTouchArea = document.getElementById('cake-touch-area');
  const candleFlame = document.getElementById('candle-flame');
  const wishInstruction = document.getElementById('wish-instruction');
  const wishSubtext = document.getElementById('wish-subtext');
  const catBubble = document.getElementById('cat-bubble');
  const btnToStep5 = document.getElementById('btn-to-step5');
  let candleExtinguished = false;

  function extinguishCandle() {
    if (candleExtinguished) return;
    candleExtinguished = true;

    if (candleFlame) {
      candleFlame.classList.add('extinguished');
    }

    // Spawn Smoke Particles
    const smokeContainer = document.getElementById('smoke-particles');
    if (smokeContainer) {
      for (let i = 0; i < 15; i++) {
        const puff = document.createElement('div');
        puff.className = 'smoke-puff';
        const dx = (Math.random() - 0.5) * 50;
        puff.style.setProperty('--dx', `${dx}px`);
        puff.style.animationDelay = `${Math.random() * 0.3}s`;
        smokeContainer.appendChild(puff);
      }
    }

    audio.playBlowoutSound();
    createBurstConfetti();

    if (wishInstruction) {
      wishInstruction.textContent = "Wish Granted! 💖✨";
    }
    if (wishSubtext) {
      wishSubtext.textContent = "May all your sweetest dreams come true!";
    }
    if (catBubble) {
      catBubble.textContent = "YAY! Wish granted! 🎂🎉";
    }
    if (btnToStep5) {
      btnToStep5.classList.remove('hidden-btn');
    }
  }

  if (cakeTouchArea) {
    cakeTouchArea.addEventListener('click', extinguishCandle);
  }

  if (btnToStep5) {
    btnToStep5.addEventListener('click', () => {
      showStep('step-5');
    });
  }

  // --- STEP 5: GIFT SELECTION ---
  document.querySelectorAll('.gift-box-card[data-gift]').forEach(giftCard => {
    giftCard.addEventListener('click', () => {
      const giftNum = giftCard.getAttribute('data-gift');
      audio.playPop(500 + giftNum * 100);
      createBurstConfetti();

      if (giftNum === '1') showStep('step-6-calendar');
      else if (giftNum === '2') showStep('step-6-letter');
      else if (giftNum === '3') showStep('step-6-museum');
    });
  });

  // --- BACK BUTTONS ON ALL GIFT REVEALS ---
  document.querySelectorAll('.back-to-gifts-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.playPop(400);
      showStep('step-5');
    });
  });

  // --- GIFT 2: INTERACTIVE ENVELOPE LOGIC ---
  const waxSeal = document.getElementById('wax-seal');
  const interactiveEnvelope = document.getElementById('interactive-envelope');

  if (waxSeal && interactiveEnvelope) {
    waxSeal.addEventListener('click', () => {
      audio.playPop(650, 'triangle');
      interactiveEnvelope.classList.add('open');
      createBurstConfetti();
    });
  }

  // --- GIFT 3: MUSEUM OF US DRAGGABLE & ENLARGE LOGIC ---
  const museumCanvas = document.getElementById('museum-canvas');
  const photoModal = document.getElementById('photo-modal');
  const modalPhotoImg = document.getElementById('modal-photo-img');
  const modalPhotoCaption = document.getElementById('modal-photo-caption');
  const photoModalClose = document.getElementById('photo-modal-close');

  if (museumCanvas) {
    let activePolaroid = null;
    let offsetX = 0, offsetY = 0;

    museumCanvas.querySelectorAll('.draggable-polaroid').forEach(pol => {
      // Random tilt on start
      const randomAngle = (Math.random() - 0.5) * 16;
      pol.style.transform = `rotate(${randomAngle}deg)`;

      // Mouse / Touch down for dragging
      const startDrag = (e) => {
        activePolaroid = pol;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = pol.getBoundingClientRect();
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;
        audio.playPop(500);
      };

      pol.addEventListener('mousedown', startDrag);
      pol.addEventListener('touchstart', startDrag, { passive: true });

      // Click to enlarge polaroid
      pol.addEventListener('click', (e) => {
        const img = pol.querySelector('img');
        const caption = pol.querySelector('.pol-caption');
        if (img && photoModal && modalPhotoImg) {
          modalPhotoImg.src = img.src;
          if (modalPhotoCaption && caption) {
            modalPhotoCaption.textContent = caption.textContent;
          }
          photoModal.classList.remove('hidden-modal');
          audio.playPop(700);
        }
      });
    });

    const moveDrag = (e) => {
      if (!activePolaroid) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const canvasRect = museumCanvas.getBoundingClientRect();

      let x = clientX - canvasRect.left - offsetX;
      let y = clientY - canvasRect.top - offsetY;

      // Bound within canvas
      x = Math.max(0, Math.min(x, canvasRect.width - 150));
      y = Math.max(0, Math.min(y, canvasRect.height - 180));

      activePolaroid.style.left = `${x}px`;
      activePolaroid.style.top = `${y}px`;
    };

    const stopDrag = () => {
      activePolaroid = null;
    };

    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('touchmove', moveDrag, { passive: true });
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);
  }

  if (photoModalClose && photoModal) {
    photoModalClose.addEventListener('click', () => {
      photoModal.classList.add('hidden-modal');
    });
  }

  // Heart Shower Button
  const heartShowerBtn = document.getElementById('btn-shower-hearts');
  if (heartShowerBtn) {
    heartShowerBtn.addEventListener('click', () => {
      audio.playSuccessChime();
      createBurstConfetti(['💖', '💕', '🌸', '✨', '🎂', '🥳']);
    });
  }

  // --- SPARKLES & CONFETTI CANVAS ENGINE ---
  const canvas = document.getElementById('sparkles-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let particles = [];

  function resizeCanvas() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  class Particle {
    constructor(x, y, symbol) {
      this.x = x || Math.random() * canvas.width;
      this.y = y || Math.random() * canvas.height;
      this.size = Math.random() * 16 + 10;
      this.speedY = Math.random() * 1.5 - 0.5;
      this.speedX = (Math.random() - 0.5) * 1.2;
      this.symbol = symbol || (Math.random() > 0.5 ? '✨' : '🌸');
      this.opacity = Math.random() * 0.7 + 0.3;
      this.spin = Math.random() * 0.05 - 0.025;
      this.angle = Math.random() * Math.PI * 2;
    }

    update() {
      this.y -= this.speedY;
      this.x += this.speedX;
      this.angle += this.spin;

      if (this.y < -20 || this.y > canvas.height + 20) {
        this.y = canvas.height + 10;
        this.x = Math.random() * canvas.width;
      }
    }

    draw() {
      if (!ctx) return;
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.font = `${this.size}px sans-serif`;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillText(this.symbol, 0, 0);
      ctx.restore();
    }
  }

  // Init continuous background particles
  if (canvas) {
    for (let i = 0; i < 25; i++) {
      particles.push(new Particle());
    }
  }

  function createBurstConfetti(symbols = ['💖', '✨', '🎉', '🌟', '🎂', '💕']) {
    if (!canvas) return;
    for (let i = 0; i < 40; i++) {
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      const p = new Particle(canvas.width / 2 + (Math.random() - 0.5) * 300, canvas.height / 2 + (Math.random() - 0.5) * 200, sym);
      p.speedY = (Math.random() - 0.5) * 6;
      p.speedX = (Math.random() - 0.5) * 8;
      particles.push(p);
    }
  }

  function animateSparkles() {
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, idx) => {
        p.update();
        p.draw();
      });
      // Limit overflow particles
      if (particles.length > 70) {
        particles.splice(0, particles.length - 70);
      }
    }
    requestAnimationFrame(animateSparkles);
  }

  animateSparkles();

});
