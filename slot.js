
// ═══════════════════════════════════════════════════════
//  КОНФІГУРАЦІЯ
// ═══════════════════════════════════════════════════════

const REEL_LAYOUT = [
    ['apple','apple','apple','big_win','apricot','apricot','banana','banana',
     'big_win','apricot','banana','apricot','apple','apple','apricot','apple',
     'big_win','apple','apricot','apricot','apricot','banana','apple','apple',
     'big_win','banana','apricot','apple','apple','apple','apple','banana',
     'apricot','apple','banana','big_win','apricot','apple','apricot','big_win',
     'banana','apple','apple','banana','apple','apricot','apricot','banana',
     'apricot','apple','apricot','apple','apple','apple','apricot','apple',
     'apricot','apple','apple','apple','apple','apricot','apple','apricot'],
    ['apple','apricot','apple','banana','apple','apricot','apple','apple',
     'apricot','apple','banana','apricot','apricot','banana','banana','apple',
     'banana','banana','apple','apricot','apple','apple','big_win','apricot',
     'apple','apple','apricot','apple','apple','apricot','apple','apricot',
     'apricot','big_win','apricot','apple','apple','apple','apple','big_win',
     'banana','apricot','apricot','apple','apple','apricot','big_win','apple',
     'banana','apple','apricot','banana','banana','apricot','apricot','apricot',
     'apple','apricot','apple','big_win','big_win','apple','apple','apple'],
    ['apple','apple','apple','apple','big_win','apricot','big_win','apple',
     'banana','apricot','big_win','apple','apricot','big_win','apple','banana',
     'apricot','apple','banana','apricot','apricot','banana','apricot','apricot',
     'apple','big_win','apricot','apricot','apricot','apple','apple','apple',
     'apple','apple','apricot','apple','banana','apricot','apple','apple',
     'apple','apricot','apple','apricot','apricot','apple','banana','big_win',
     'banana','apple','apricot','apple','banana','apple','apple','apricot',
     'apple','apple','apple','apple','apricot','apricot','banana','banana']
];

const PAYOUTS         = { apple:2.0, apricot:10.0, banana:60.0, big_win:300.0 };
const BET_MULTIPLIERS = [1, 2, 5, 10, 25, 50, 100];
const BASE_BET_LINE   = 0.5;
const LINES           = 3;
const ITEM_H          = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--item-height').trim()) || 96;
const STRIP_RANDOM    = 40;
const SPIN_DURATION   = [2.5, 3.1, 3.7];

// Конфігурація святкування для кожного символу
const WIN_CONFIG = {
    apple: {
        label:    'APPLE  2×',
        mult:     '× 2',
        duration: 1800,
        shake:    null,
        particles: false,
    },
    apricot: {
        label:    'APRICOT  10×',
        mult:     '× 10',
        duration: 2200,
        shake:    null,
        particles: false,
    },
    banana: {
        label:    'BANANA  60×',
        mult:     '× 60',
        duration: 2800,
        shake:    'light',
        particles: false,
    },
    big_win: {
        label:    'BIG WIN  300×',
        mult:     '× 300',
        duration: 4000,
        shake:    'hard',
        particles: true,
    },
};

// ═══════════════════════════════════════════════════════
//  СТАН
// ═══════════════════════════════════════════════════════
let credits  = 1000.00;
let betIdx   = 0;          // починаємо з мінімальної ставки 1.50
let spinning = false;
let cols;
let celebrateTimer = null;

// ═══════════════════════════════════════════════════════
//  MERSENNE TWISTER
// ═══════════════════════════════════════════════════════
class MT {
    constructor(seed) {
        this.N=624; this.M=397; this.mt=new Array(624); this.mti=625;
        this.mt[0]=seed>>>0;
        for(let i=1;i<624;i++)
            this.mt[i]=(1812433253*((this.mt[i-1]^(this.mt[i-1]>>>30))>>>0)+i)>>>0;
    }
    next() {
        const MA=0x9908b0df,UM=0x80000000,LM=0x7fffffff;
        let y,k;
        if(this.mti>=624){
            for(k=0;k<227;k++){y=(this.mt[k]&UM)|(this.mt[k+1]&LM);this.mt[k]=this.mt[k+397]^(y>>>1)^(y&1?MA:0);}
            for(;k<623;k++){y=(this.mt[k]&UM)|(this.mt[k+1]&LM);this.mt[k]=this.mt[k-227]^(y>>>1)^(y&1?MA:0);}
            y=(this.mt[623]&UM)|(this.mt[0]&LM);this.mt[623]=this.mt[396]^(y>>>1)^(y&1?MA:0);
            this.mti=0;
        }
        y=this.mt[this.mti++];
        y^=y>>>11; y^=(y<<7)&0x9d2c5680; y^=(y<<15)&0xefc60000; y^=y>>>18;
        return y>>>0;
    }
    int(n){ return this.next()%n; }
}

const rng = new MT(Date.now()&0xffffffff);

// ═══════════════════════════════════════════════════════
//  WEB AUDIO — синтезовані звуки без зовнішніх файлів
// ═══════════════════════════════════════════════════════
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playSound(symbol) {
    try {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;

        if (symbol === 'apple') {
            // Короткий дзвіночок — одна нота
            _tone(ctx, 1046, now,       0.4, 'sine',    0.35);
            _tone(ctx, 1318, now + 0.1, 0.3, 'sine',    0.25);
        }
        else if (symbol === 'apricot') {
            // Мелодійний акорд — три ноти
            _tone(ctx, 523,  now,       0.6, 'sine',    0.3);
            _tone(ctx, 659,  now + 0.1, 0.6, 'sine',    0.25);
            _tone(ctx, 784,  now + 0.2, 0.8, 'sine',    0.3);
            _tone(ctx, 1046, now + 0.4, 0.6, 'sine',    0.2);
        }
        else if (symbol === 'banana') {
            // Урочистий фанфарний звук
            _tone(ctx, 392,  now,       0.15,'sawtooth', 0.2);
            _tone(ctx, 523,  now + 0.15,0.15,'sawtooth', 0.2);
            _tone(ctx, 659,  now + 0.3, 0.15,'sawtooth', 0.2);
            _tone(ctx, 784,  now + 0.45,0.4, 'sawtooth', 0.25);
            _tone(ctx, 1046, now + 0.5, 0.8, 'sine',     0.3);
            _tone(ctx, 784,  now + 0.7, 0.5, 'sine',     0.2);
            // низький бас
            _tone(ctx, 196,  now,       1.2, 'sine',     0.15);
        }
        else if (symbol === 'big_win') {
            // Переможна мелодія з наростанням
            const notes = [523,659,784,1046,1318,1046,784,1046,1318,1568];
            const times = [0, 0.12, 0.24, 0.36, 0.5, 0.7, 0.85, 1.0, 1.15, 1.3];
            notes.forEach((freq, i) => {
                _tone(ctx, freq, now + times[i], 0.25, 'sine', 0.3 + i * 0.02);
            });
            // Акордовий фінал
            _tone(ctx, 523,  now + 1.6, 1.2, 'sine',    0.3);
            _tone(ctx, 659,  now + 1.6, 1.2, 'sine',    0.25);
            _tone(ctx, 784,  now + 1.6, 1.2, 'sine',    0.25);
            _tone(ctx, 1046, now + 1.6, 1.2, 'sine',    0.3);
            // Бас
            _tone(ctx, 130,  now,       3.0, 'sine',    0.2);
            _tone(ctx, 196,  now + 1.5, 1.5, 'sine',    0.2);
        }
    } catch(e) {
        // Web Audio недоступний — ігноруємо
    }
}

function _tone(ctx, freq, start, dur, type, vol) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start);
    osc.stop(start + dur + 0.05);
}

// ═══════════════════════════════════════════════════════
//  ЗАГЛУШКА БЕКЕНДУ
// ═══════════════════════════════════════════════════════
function mockSpin() {
    const pos = [rng.int(64), rng.int(64), rng.int(64)];
    const rows = pos.map((p, ri) => [
        REEL_LAYOUT[ri][ p      % 64],
        REEL_LAYOUT[ri][(p + 1) % 64],
        REEL_LAYOUT[ri][(p + 2) % 64],
    ]);
    const betPerLine = BASE_BET_LINE * BET_MULTIPLIERS[betIdx];
    let totalWin = 0;
    const winLines = [];
    const winSymbols = [];

    for (let line = 0; line < 3; line++) {
        const s0=rows[0][line], s1=rows[1][line], s2=rows[2][line];
        if (s0===s1 && s1===s2) {
            totalWin += betPerLine * PAYOUTS[s0];
            winLines.push(line);
            winSymbols.push(s0);
        }
    }

    // Визначаємо найцінніший символ виграшу
    const symbolRank = { apple:1, apricot:2, banana:3, big_win:4 };
    const topSymbol = winSymbols.sort((a,b) => symbolRank[b] - symbolRank[a])[0] || null;

    return { rows, totalWin, winLines, topSymbol };
}

// ═══════════════════════════════════════════════════════
//  ПОБУДОВА СМУГИ
// ═══════════════════════════════════════════════════════
function buildStrip(colEl, resultSymbols) {
    let html = '';
    for (const sym of resultSymbols) {
        html += iconHTML(sym);
    }
    for (let i = 0; i < STRIP_RANDOM; i++) {
        html += iconHTML(REEL_LAYOUT[0][rng.int(64)]);
    }
    colEl.innerHTML = html;
    colEl.style.transition = 'none';
    colEl.style.transform  = `translateY(-${STRIP_RANDOM * ITEM_H()}px)`;
}

// ═══════════════════════════════════════════════════════
//  ІНІЦІАЛІЗАЦІЯ
// ═══════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
    cols = document.querySelectorAll('.col');
    cols.forEach(col => buildStrip(col, [
        REEL_LAYOUT[0][rng.int(64)],
        REEL_LAYOUT[0][rng.int(64)],
        REEL_LAYOUT[0][rng.int(64)],
    ]));
    updateUI();

    document.getElementById('betDown').addEventListener('click', () => {
        if (betIdx > 0) { betIdx--; updateUI(); }
    });
    document.getElementById('betUp').addEventListener('click', () => {
        if (betIdx < BET_MULTIPLIERS.length - 1) { betIdx++; updateUI(); }
    });

    document.addEventListener('keydown', e => {
        if (e.code === 'Space') {
            e.preventDefault();
            const btn = document.querySelector('.start-button');
            if (!btn.disabled) spin(btn);
        }
    });

    // Розмір canvas під вікно барабанів
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
});

function resizeCanvas() {
    const win = document.querySelector('.window');
    const canvas = document.getElementById('particleCanvas');
    if (!win || !canvas) return;
    canvas.width  = win.offsetWidth;
    canvas.height = win.offsetHeight;
}

// ═══════════════════════════════════════════════════════
//  SPIN
// ═══════════════════════════════════════════════════════
function spin(btn) {
    if (spinning) return;

    const totalBet = BASE_BET_LINE * BET_MULTIPLIERS[betIdx] * LINES;
    if (credits < totalBet) {
        const el = document.getElementById('creditsDisplay');
        el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
        return;
    }

    spinning = true;
    btn.setAttribute('disabled', true);
    credits -= totalBet;
    clearWin();
    updateUI();

    const result = mockSpin();

    cols.forEach((col, ri) => buildStrip(col, result.rows[ri]));

    const finalY = 0;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            cols.forEach((col, ri) => {
                col.style.transition = `transform ${SPIN_DURATION[ri]}s cubic-bezier(0.25, 0.1, 0.25, 1.0)`;
                col.style.transform  = `translateY(${finalY}px)`;
            });
        });
    });

    const lastMs = SPIN_DURATION[SPIN_DURATION.length - 1] * 1000;
    setTimeout(() => {
        spinning = false;
        btn.removeAttribute('disabled');

        if (result.totalWin > 0) {
            credits += result.totalWin;
            updateUI();
            showWin(result);
        }
    }, lastMs + 100);
}

// ═══════════════════════════════════════════════════════
//  ПОКАЗ ВИГРАШУ
// ═══════════════════════════════════════════════════════
function showWin(result) {
    // Зупиняємо попереднє святкування якщо є
    if (celebrateTimer) { clearTimeout(celebrateTimer); celebrateTimer = null; }

    const cfg = WIN_CONFIG[result.topSymbol];
    if (!cfg) return;

    // Підсвічуємо виграшні лінії
    result.winLines.forEach(line => {
        const pl = document.getElementById(`payline-${line}`);
        if (pl) {
            pl.classList.add('active', `win-${result.topSymbol}`);
        }
    });

    // Маленький дисплей win
    const winEl = document.getElementById('winDisplay');
    winEl.textContent = result.totalWin.toFixed(2);
    winEl.classList.remove('flash');
    void winEl.offsetWidth;
    winEl.classList.add('flash');

    // Оверлей з великою сумою
    showWinOverlay(result.topSymbol, result.totalWin, cfg);

    // Shake
    if (cfg.shake) {
        const container = document.getElementById('container');
        container.classList.remove('shake-light', 'shake-hard');
        void container.offsetWidth;
        container.classList.add(`shake-${cfg.shake}`);
        setTimeout(() => container.classList.remove('shake-light', 'shake-hard'), 600);
    }

    // Частинки для big_win
    if (cfg.particles) startParticles(cfg.duration);

    // Звук
    playSound(result.topSymbol);

    // Очищуємо після закінчення
    celebrateTimer = setTimeout(() => clearWin(), cfg.duration);
}

// ─── Оверлей з анімацією лічильника ─────────────────
function showWinOverlay(symbol, amount, cfg) {
    const overlay = document.getElementById('winOverlay');
    const symEl   = document.getElementById('winOverlaySymbol');
    const amtEl   = document.getElementById('winOverlayAmount');
    const mulEl   = document.getElementById('winOverlayMult');

    // Прибираємо старі класи символу
    overlay.className = 'win-overlay';
    overlay.classList.add(`win-${symbol}`);

    symEl.textContent = cfg.label;
    mulEl.textContent = cfg.mult;
    amtEl.textContent = '0.00';

    overlay.classList.add('visible');

    // Лічильник від 0 до суми (для banana і big_win)
    const useCounter = (symbol === 'banana' || symbol === 'big_win');
    if (useCounter) {
        const counterDur = Math.min(cfg.duration * 0.5, 1500);
        animateCounter(amtEl, 0, amount, counterDur);
    } else {
        amtEl.textContent = amount.toFixed(2);
    }
}

function animateCounter(el, from, to, duration) {
    const start = performance.now();
    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        // easeOut
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = (from + (to - from) * eased).toFixed(2);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ═══════════════════════════════════════════════════════
//  ЧАСТИНКИ (Canvas) для big_win
// ═══════════════════════════════════════════════════════
let particleAnim = null;

function startParticles(duration) {
    const canvas = document.getElementById('particleCanvas');
    const ctx    = canvas.getContext('2d');
    canvas.classList.add('active');

    const W = canvas.width;
    const H = canvas.height;
    const colors = ['#f5c842','#ff6b6b','#4caf50','#2196f3','#ff9800','#fff'];

    // Генеруємо частинки
    const particles = Array.from({length: 80}, () => ({
        x:  Math.random() * W,
        y:  Math.random() * H * 0.3 - H * 0.1,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2 + 1,
        size: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.15,
        life: 1,
        decay: Math.random() * 0.008 + 0.004,
    }));

    const startTime = performance.now();

    function draw(now) {
        const elapsed = now - startTime;
        ctx.clearRect(0, 0, W, H);

        particles.forEach(p => {
            p.x   += p.vx;
            p.y   += p.vy;
            p.vy  += 0.05; // гравітація
            p.rot += p.rotV;
            p.life -= p.decay;
            if (p.life <= 0) return;

            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            ctx.restore();
        });

        if (elapsed < duration - 300) {
            particleAnim = requestAnimationFrame(draw);
        } else {
            ctx.clearRect(0, 0, W, H);
            canvas.classList.remove('active');
        }
    }

    if (particleAnim) cancelAnimationFrame(particleAnim);
    particleAnim = requestAnimationFrame(draw);
}

// ═══════════════════════════════════════════════════════
//  ОЧИЩЕННЯ
// ═══════════════════════════════════════════════════════
function clearWin() {
    // Paylines
    for (let i = 0; i < 3; i++) {
        const pl = document.getElementById(`payline-${i}`);
        if (pl) pl.className = 'payline ' + ['payline-top','payline-center','payline-bottom'][i];
    }

    // Win display
    document.getElementById('winDisplay').textContent = '—';

    // Оверлей
    const overlay = document.getElementById('winOverlay');
    overlay.classList.remove('visible');

    // Частинки
    if (particleAnim) { cancelAnimationFrame(particleAnim); particleAnim = null; }
    const canvas = document.getElementById('particleCanvas');
    if (canvas) {
        canvas.classList.remove('active');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// ═══════════════════════════════════════════════════════
//  UI
// ═══════════════════════════════════════════════════════
function updateUI() {
    const totalBet = BASE_BET_LINE * BET_MULTIPLIERS[betIdx] * LINES;
    document.getElementById('creditsDisplay').textContent = credits.toFixed(2);
    document.getElementById('betDisplay').textContent     = totalBet.toFixed(2);
}

// ─── Helpers ─────────────────────────────────────────
function iconHTML(sym) {
    return `<div class="icon"><img src="assets/images/${sym}.png" alt="${sym}"></div>`;
}