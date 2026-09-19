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

  // --- STEP 5: GIFT SELECTION — Firework Blast Engine ---
  const fwCanvas = document.getElementById('firework-canvas');
  const fwCtx = fwCanvas ? fwCanvas.getContext('2d') : null;
  let fwParticles = [];
  let fwRaf = null;
  let fwActive = false;

  function resizeFireworkCanvas() {
    if (fwCanvas) {
      fwCanvas.width  = window.innerWidth;
      fwCanvas.height = window.innerHeight;
    }
  }
  resizeFireworkCanvas();
  window.addEventListener('resize', resizeFireworkCanvas);

  class FwParticle {
    constructor(x, y, color) {
      this.x  = x; this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 3;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - Math.random() * 5;
      this.alpha  = 1;
      this.decay  = Math.random() * 0.02 + 0.012;
      this.radius = Math.random() * 4 + 2;
      this.color  = color;
      this.gravity = 0.22;
      this.trail  = [];
    }
    update() {
      this.trail.push({ x: this.x, y: this.y, a: this.alpha });
      if (this.trail.length > 6) this.trail.shift();
      this.vy += this.gravity;
      this.x  += this.vx;
      this.y  += this.vy;
      this.vx *= 0.97;
      this.alpha -= this.decay;
    }
    draw(ctx) {
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color},${t.a * 0.4})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color},${this.alpha})`;
      ctx.shadowBlur  = 12;
      ctx.shadowColor = `rgba(${this.color},0.9)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function launchFirework(cx, cy) {
    const colors = [
      '255,80,80','255,180,50','255,230,0',
      '150,255,100','80,200,255','200,100,255',
      '255,130,200','255,255,255'
    ];
    for (let i = 0; i < 130; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      fwParticles.push(new FwParticle(cx, cy, col));
    }
    setTimeout(() => {
      for (let i = 0; i < 60; i++) {
        const col = colors[Math.floor(Math.random() * colors.length)];
        fwParticles.push(new FwParticle(cx, cy - 40, col));
      }
    }, 120);
  }

  function animateFireworks() {
    if (!fwCtx || !fwCanvas) return;
    fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);
    fwParticles = fwParticles.filter(p => p.alpha > 0);
    fwParticles.forEach(p => { p.update(); p.draw(fwCtx); });
    if (fwParticles.length > 0 || fwActive) {
      fwRaf = requestAnimationFrame(animateFireworks);
    } else {
      fwRaf = null;
    }
  }

  document.querySelectorAll('.gift-box-card[data-gift]').forEach(giftCard => {
    giftCard.addEventListener('click', () => {
      if (giftCard.classList.contains('gift-clicked')) return; // prevent double-click
      giftCard.classList.add('gift-clicked');

      const giftNum = giftCard.getAttribute('data-gift');
      const giftImg = giftCard.querySelector('.gift-3d-img');

      // 1) Explode the gift image
      if (giftImg) {
        giftImg.classList.add('exploding');
      }

      // 2) Play success chime
      audio.playSuccessChime();

      // 3) Launch fireworks from gift center
      if (fwCanvas) {
        const rect = giftCard.getBoundingClientRect();
        const cx = rect.left + rect.width  / 2;
        const cy = rect.top  + rect.height / 2;
        fwActive = true;
        launchFirework(cx, cy);
        // Extra random bursts across screen
        setTimeout(() => launchFirework(cx + (Math.random()-0.5)*300, cy - 80), 180);
        setTimeout(() => launchFirework(cx + (Math.random()-0.5)*400, cy - 60), 320);
        if (!fwRaf) animateFireworks();
        setTimeout(() => { fwActive = false; }, 1200);
      }

      // 4) Navigate to the correct page after burst
      setTimeout(() => {
        giftCard.classList.remove('gift-clicked');
        if (giftImg) giftImg.classList.remove('exploding');
        if (giftNum === '1') showStep('step-6-calendar');
        else if (giftNum === '2') showStep('step-6-letter');
        else if (giftNum === '3') showStep('step-6-museum');
      }, 950);
    });
  });


  // --- BACK BUTTONS ON ALL GIFT REVEALS ---
  document.querySelectorAll('.back-to-gifts-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.playPop(400);
      showStep('step-5');
    });
  });

  // --- GIFT 2: FULLSCREEN ENVELOPE & OPENED LETTER WITH TextType COMPONENT ---
  const redWaxSeal = document.getElementById('red-wax-seal');
  const envelopeFullscreenView = document.getElementById('envelope-fullscreen-view');
  const letterOpenedView = document.getElementById('letter-opened-view');
  const btnBackToEnvelope = document.getElementById('btn-back-to-envelope');
  const letterTypingContainer = document.getElementById('letter-typing-container');
  const letterContentWrapper = document.getElementById('letter-content-wrapper');

  const letterHTMLBlocks = [
    `<h2 class="letter-main-title font-cursive">Happy birthday to my favourite person! ❤️</h2>`,
    `<p>Kuthun start karu he mala kharach kalat nahiye… karan kahi lokanna words madhe explain karna khup difficult asta. Ani tu tyatlich ek ahes.</p>`,
    `<p>Saglyat pahila, <strong>thank you.</strong><br>Thank you tu tya diwashi mala birthday wish kelas. Kadachit tujhyasathi te fakt ek simple birthday wish asel, pan majhyasathi nahi. Tya eka wish mule aplyat conversation suru zali, ani honestly, mala tevha bilkul idea navhta ki hi choti si conversation ek divas majhyasathi evdhi special hoil.</p>`,
    `<p>Thank you tu majhyashi conversation chalu thevlis.<br>Thank you tu swatahla majhyashi introduce kelas.<br>Ani thank you… tu majhya life madhe aalis.</p>`,
    `<p>Kadhi kadhi vichar karto ki jar tya diwashi tu mala wish kel nasatis tar? Kadhachit aplyala ekmekanchi olakhach zali nasti. Kadhachit tu aaj majhya life madhli itki important person nasatis. Ani mhanunach mala vatata ki kahi kahi choti choti goshti aplya life madhe motha meaning gheun yetat.</p>`,
    `<p>Tu majhya life madhe exactly kashi aalis he explain karna difficult aahe, pan ek goshta nakki aahe — <strong>tu aalis ani kahi tari change zala.</strong></p>`,
    `<p>Tujhyashi bolताना mala ek veglach comfort feel hoto. Tujha ek message mood change karu shakto, tujhya sobat keleli ek simple conversation suddha divas better banvu shakte. Kadhikadhi aplyat kahi special moment nasato, fakt normal bolna asta… pan tya normal moments madhye suddha mala khup happiness milta.</p>`,
    `<p>I don't know when you became so important to me.<br>Pan ek point nantar mala realize zala ki <strong>tujhyashi bolna hi majhya day chi ek favourite part zali aahe.</strong></p>`,
    `<p>Tujha nature, tujhya chotya chotya goshti, tujhya bolnyachi way, tu ragarag kartes te, tu hasates te… saglach mala somehow special vatata.</p>`,
    `<p>Ani ho, tu majhya <strong>mandbadak</strong> ahes mhanun thodi majja-masti tar honarach 😂❤️<br>Pan jokes apart, tu kharach khup precious ahes.</p>`,
    `<p>Mala mahit nahi future madhe kay lihila aahe. Apan kuthe asu, kiti close asu, life aplyala kuthlya direction la gheun jail… kahi mahit nahi. Pan aajchya divshi mala fakt evdhach sangaycha aahe ki <strong>I am genuinely grateful that I met you.</strong></p>`,
    `<p>Tujhya birthday la mi tujhyasathi ekach wish karto —<br>Tu nehmi happy raha.<br>Tujhya face varchi smile kadhi kami hou naye.<br>Tula life madhe je kahi hava aahe te sagla milu de.<br>Ani difficult days ale tari tyancha samna karaychi strength tula milu de.</p>`,
    `<p>Karan tu happiness deserve kartes.<br><strong>Khup jast.</strong></p>`,
    `<p>Ani kadachit mi pratyek gosht words madhe sangnar nahi, kadachit kahi feelings mi express suddha karu shaknar nahi… pan just know this:</p>`,
    `<p><strong>You are more special to me than you probably realize. ❤️</strong></p>`,
    `<p>Tujhyamule majhya life madhe kahi beautiful memories add zalyat, kahi moments special zhale, ani saglyat important — mala ek asa person milala jyachyashi bollyavar man halka hota.</p>`,
    `<p>Mhanun aaj tujhya birthday la fakt "Happy Birthday" mhannun thambaycha nahiye.</p>`,
    `<p><strong>Thank you for existing.<br>Thank you for being you.<br>And most importantly, thank you for coming into my life. ❤️</strong></p>`,
    `<p>Aplya story chi starting kadachit ek simple birthday wish ne zali hoti…<br>pan mala nahi mahit hota ki tya eka <strong>"Happy Birthday"</strong> madhun majhya life madhli ek itki beautiful person mala bhetel.</p>`,
    `<p>I hope this birthday gives you a thousand reasons to smile.</p>`,
    `<p>Ani ho…</p>`,
    `<p><strong>Happy Birthday majhya mandbadak. ❤️🎂</strong><br>Aajcha divas fakt tuzha aahe, so enjoy every single moment.</p>`,
    `<p>Ani ek promise —<br><strong>tujha birthday mi wish kela mhanun nahi, tar tu majhyasathi special ahes mhanun ha letter lihila aahe.</strong></p>`,
    `<p>Stay happy.<br>Stay crazy.<br>Stay exactly the way you are.</p>`,
    `<p><strong>Once again, Happy Birthday ❤️<br>Majhya mandbadak. 🫶🏻</strong></p>`,
    `<div class="letter-sig font-cursive">With all my heart, always ❤️</div>`
  ];

  // --- GIFT 2: FULLSCREEN ENVELOPE & OPENED LETTER WITH TOP-TO-BOTTOM SENTENCE REVEAL ---
  let sentenceRevealTimer = null;
  let isSentenceRevealActive = false;

  // Ballpit instance (created lazily, disposed on back)
  let ballpitInstance = null;

  function initBallpit() {
    const canvas = document.getElementById('ballpit-canvas');
    if (!canvas || !window.createBallpit) return;
    if (ballpitInstance) return; // already running
    ballpitInstance = window.createBallpit(canvas, {
      count: 120,
      colors: [0xff9de2, 0xc084fc, 0xa78bfa, 0xfbbf24, 0xf472b6, 0x60a5fa, 0x34d399],
      gravity: 0.55,
      friction: 0.9975,
      wallBounce: 0.92,
      minSize: 0.35,
      maxSize: 0.85,
      followCursor: true
    });
  }

  function disposeBallpit() {
    if (ballpitInstance) {
      ballpitInstance.dispose();
      ballpitInstance = null;
    }
  }

  function revealAllSentencesImmediately() {
    if (sentenceRevealTimer) clearTimeout(sentenceRevealTimer);
    isSentenceRevealActive = false;
    if (letterTypingContainer) {
      letterTypingContainer.innerHTML = '';
      letterHTMLBlocks.forEach(html => {
        const div = document.createElement('div');
        div.className = 'letter-sentence-block revealed';
        div.innerHTML = html;
        letterTypingContainer.appendChild(div);
      });
    }
  }

  function startTopToBottomSentenceReveal() {
    if (!letterTypingContainer) return;
    if (sentenceRevealTimer) clearTimeout(sentenceRevealTimer);
    letterTypingContainer.innerHTML = '';
    isSentenceRevealActive = true;

    let index = 0;

    function revealNextSentence() {
      if (!isSentenceRevealActive) return;
      if (index < letterHTMLBlocks.length) {
        const div = document.createElement('div');
        div.className = 'letter-sentence-block';
        div.innerHTML = letterHTMLBlocks[index];
        letterTypingContainer.appendChild(div);

        // Soft audio pop sound per sentence opening
        audio.playPop(420 + (index % 5) * 35, 'sine');

        // Trigger top-to-bottom slide-down animation
        requestAnimationFrame(() => {
          div.classList.add('revealed');
        });

        index++;
        // Speed of top-to-bottom reveal: 260ms per sentence
        const delay = index === 1 ? 300 : 260;
        sentenceRevealTimer = setTimeout(revealNextSentence, delay);
      } else {
        isSentenceRevealActive = false;
      }
    }

    revealNextSentence();
  }

  if (redWaxSeal) {
    redWaxSeal.addEventListener('click', () => {
      audio.playPop(650, 'triangle');
      audio.playSuccessChime();
      createBurstConfetti();

      redWaxSeal.style.transform = 'translate(-50%, -50%) scale(1.25) rotate(10deg)';
      redWaxSeal.style.opacity = '0.8';

      setTimeout(() => {
        redWaxSeal.style.transform = '';
        redWaxSeal.style.opacity = '';
        
        if (envelopeFullscreenView && letterOpenedView) {
          envelopeFullscreenView.classList.add('hidden');
          letterOpenedView.classList.remove('hidden');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          // Start 3D Ballpit background
          initBallpit();
          startTopToBottomSentenceReveal();
        }
      }, 400);
    });
  }

  if (btnBackToEnvelope) {
    btnBackToEnvelope.addEventListener('click', () => {
      audio.playPop(400);
      if (sentenceRevealTimer) clearTimeout(sentenceRevealTimer);
      isSentenceRevealActive = false;

      if (letterOpenedView && envelopeFullscreenView) {
        letterOpenedView.classList.add('hidden');
        envelopeFullscreenView.classList.remove('hidden');
        // Stop & free the Ballpit WebGL context
        disposeBallpit();
      }
    });
  }

  if (letterContentWrapper) {
    letterContentWrapper.addEventListener('click', () => {
      if (isSentenceRevealActive) {
        revealAllSentencesImmediately();
      }
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

  // =========================================================================
  // DRIFT WALL — MUSEUM OF US  (Vanilla JS port of React Bits DriftWall)
  // =========================================================================

  (function initDriftWall() {
    const container = document.getElementById('drift-wall-container');
    const plane     = document.getElementById('drift-wall-plane');
    if (!container || !plane) return;

    /* ---------- config ---------- */
    const items     = JSON.parse(container.dataset.items || '[]');
    const COLUMNS   = 5;
    const TILE_W    = 200;
    const TILE_H    = 140;
    const GAP       = 16;
    const TILT      = 14;
    const TURN      = -12;
    const DEPTH     = 100;
    const SPEED     = 26;        // slower = smoother feel
    const VARIANCE  = 0.28;     // gentle speed variation between columns
    const PARALLAX  = 0.5;
    const LIFT      = 80;       // px (also in CSS --dw-lift)
    const DIM       = 0.52;

    /* ---------- helpers ---------- */
    const columnFactor = (c) => {
      const pseudo = ((c * 0.6180339887 + 0.35) % 1) * 2 - 1;
      return 1 + VARIANCE * pseudo;
    };

    /* ---------- distribute items across columns ---------- */
    const colItems = Array.from({ length: COLUMNS }, () => []);
    items.forEach((item, i) => colItems[i % COLUMNS].push(item));
    colItems.forEach((col, c) => { if (!col.length) colItems[c] = [items[0]]; });

    /* ---------- build base velocities (alternating up/down) ---------- */
    const baseVels = colItems.map((_, c) => {
      const altSign = c % 2 === 0 ? 1 : -1;
      return SPEED * columnFactor(c) * altSign;
    });

    /* ---------- state ---------- */
    let containerH    = container.clientHeight || 600;
    let offsetsArr    = [];
    let velArr        = baseVels.map(() => 0);
    let activeId      = null;
    let hoveredCol    = -1;
    let pointer       = { x: 0, y: 0 };
    let pointerDamped = { x: 0, y: 0 };
    let lastTs        = null;
    let rafId         = null;
    let trackEls      = [];

    /* ---------- build DOM ---------- */
    function buildDOM() {
      plane.innerHTML = '';
      trackEls = [];
      colItems.forEach((col, c) => {
        const unit      = TILE_H + GAP;
        const copyH     = Math.max(unit, col.length * unit);
        const copies    = Math.max(2, Math.ceil((containerH * 1.6) / copyH) + 1);
        offsetsArr[c]   = copyH * ((c * 0.37) % 1);

        const colEl   = document.createElement('div');
        colEl.className = 'drift-wall__col';

        const trackEl = document.createElement('div');
        trackEl.className = 'drift-wall__track';

        for (let cp = 0; cp < copies; cp++) {
          col.forEach((item, itemIdx) => {
            const id = `${c}-${cp}-${itemIdx}`;

            const tileEl  = document.createElement('div');
            tileEl.className  = 'drift-wall__tile';
            tileEl.dataset.tileId = id;
            tileEl.dataset.col    = c;
            tileEl.tabIndex = 0;
            tileEl.role = 'button';
            tileEl.setAttribute('aria-label', item.title || 'photo');

            const innerEl   = document.createElement('span');
            innerEl.className = 'drift-wall__inner';

            const imgEl = document.createElement('img');
            imgEl.src    = item.image;
            imgEl.alt    = item.title || '';
            imgEl.loading  = 'lazy';
            imgEl.decoding = 'async';

            const overlayEl = document.createElement('span');
            overlayEl.className = 'drift-wall__overlay';
            overlayEl.setAttribute('aria-hidden', 'true');

            const captionEl = document.createElement('span');
            captionEl.className = 'drift-wall__caption font-handwritten';
            captionEl.textContent = item.title || '';

            innerEl.appendChild(imgEl);
            innerEl.appendChild(overlayEl);
            tileEl.appendChild(innerEl);
            tileEl.appendChild(captionEl);
            trackEl.appendChild(tileEl);
          });
        }

        colEl.appendChild(trackEl);
        plane.appendChild(colEl);
        trackEls[c] = trackEl;
      });
    }

    buildDOM();

    /* ---------- apply perspective transform to plane ---------- */
    function applyPlane(px, py) {
      plane.style.transform =
        `translate(-50%, -50%) scale(1.18) ` +
        `rotateX(${TILT + py}deg) rotateY(${TURN + px}deg) ` +
        `translateZ(${-DEPTH}px)`;
    }

    /* ---------- RAF loop ---------- */
    function animate(ts) {
      if (lastTs === null) lastTs = ts;
      // Clamp dt: cap at 33ms so tab-switch doesn't cause a huge jump
      const dt = Math.min(0.033, Math.max(0, ts - lastTs) / 1000);
      lastTs = ts;

      /* parallax — long damping time = silky smooth mouse follow */
      const maxTilt = PARALLAX * 7;
      const tx = pointer.x * maxTilt;
      const ty = -pointer.y * maxTilt;
      const damp = 1 - Math.exp(-dt / 0.20);
      pointerDamped.x += (tx - pointerDamped.x) * damp;
      pointerDamped.y += (ty - pointerDamped.y) * damp;
      applyPlane(pointerDamped.x, pointerDamped.y);

      /* scroll columns */
      for (let c = 0; c < trackEls.length; c++) {
        const col      = colItems[c];
        const unit     = TILE_H + GAP;
        const copyH    = Math.max(unit, col.length * unit);
        const paused   = hoveredCol === c;
        const target   = paused ? 0 : baseVels[c];

        // Longer time constants = smoother acceleration / deceleration
        const ease  = 1 - Math.exp(-dt / (target === 0 ? 0.22 : 0.42));
        velArr[c]  += (target - velArr[c]) * ease;

        let next   = (offsetsArr[c] || 0) + velArr[c] * dt;
        next       = ((next % copyH) + copyH) % copyH;
        offsetsArr[c] = next;

        const el = trackEls[c];
        if (el) el.style.transform = `translate3d(0, ${-next}px, 0)`;
      }

      rafId = requestAnimationFrame(animate);
    }

    function startRAF() {
      if (!rafId) {
        lastTs = null;
        rafId  = requestAnimationFrame(animate);
      }
    }

    function stopRAF() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId  = null;
        lastTs = null;
      }
    }

    /* ---------- activate / deactivate tile ---------- */
    function activate(id, col) {
      if (activeId === id) return;
      if (activeId) {
        const prev = plane.querySelector(`[data-tile-id="${activeId}"]`);
        if (prev) prev.classList.remove('is-active');
      }
      activeId    = id;
      hoveredCol  = col;
      const el    = plane.querySelector(`[data-tile-id="${id}"]`);
      if (el) el.classList.add('is-active');
    }

    function release() {
      if (activeId) {
        const el = plane.querySelector(`[data-tile-id="${activeId}"]`);
        if (el) el.classList.remove('is-active');
      }
      activeId   = null;
      hoveredCol = -1;
    }

    /* ---------- pointer events ---------- */
    container.addEventListener('pointermove', (e) => {
      const rect = container.getBoundingClientRect();
      if (!rect) return;
      pointer = {
        x: (e.clientX - rect.left) / rect.width  - 0.5,
        y: (e.clientY - rect.top)  / rect.height - 0.5
      };
      const hit  = document.elementFromPoint(e.clientX, e.clientY);
      const tile = hit && hit.closest ? hit.closest('[data-tile-id]') : null;
      if (!tile) return;
      const id  = tile.dataset.tileId;
      const col = Number(tile.dataset.col);
      activate(id, col);
    });

    container.addEventListener('pointerleave', () => {
      pointer = { x: 0, y: 0 };
      release();
    });

    /* ---------- start / stop when section becomes active ---------- */
    const museumSection = document.getElementById('step-6-museum');

    // Watch for the section getting the 'active-step' class
    const observer = new MutationObserver(() => {
      if (museumSection && museumSection.classList.contains('active-step')) {
        containerH = container.clientHeight || 600;
        startRAF();
      } else {
        stopRAF();
      }
    });

    if (museumSection) {
      observer.observe(museumSection, { attributes: true, attributeFilter: ['class'] });
      // If already active on load
      if (museumSection.classList.contains('active-step')) startRAF();
    }

  })();

});

