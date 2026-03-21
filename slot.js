
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
const BET_MULTIPLIERS = [ 1, 2, 5, 10, 25, 50, 100];
const BASE_BET_LINE   = 0.5;
const LINES           = 3;
const ITEM_H          = 96;    // має збігатися з --item-height у CSS
const STRIP_RANDOM    = 40;    // рандомних рядків перед результатом

// Тривалість кручення кожного барабана (секунди)
const SPIN_DURATION = [2.5, 3.1, 3.7];

// ═══════════════════════════════════════════════════════
//  СТАН
// ═══════════════════════════════════════════════════════
let credits  = 1000.00;
let betIdx   = 1;
let spinning = false;
let cols;

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
    for (let line = 0; line < 3; line++) {
        const s0=rows[0][line], s1=rows[1][line], s2=rows[2][line];
        if (s0===s1 && s1===s2) {
            totalWin += betPerLine * PAYOUTS[s0];
            winLines.push(line);
        }
    }
    return { rows, totalWin, winLines };
}

// ═══════════════════════════════════════════════════════
//  ПОБУДОВА СМУГИ
//
//  Структура смуги:
//  [ STRIP_RANDOM рандомних іконок ] [ 3 іконки результату ]
//
//  Початок: translateY(0)       → бачимо перші 3 рандомні
//  Кінець:  translateY(finalY)  → бачимо рівно 3 результати
//  Підміни немає — барабан просто їде до результату
// ═══════════════════════════════════════════════════════
function buildStrip(colEl, resultSymbols) {
    let html = '';
    for (let i = 0; i < STRIP_RANDOM; i++) {
        html += iconHTML(REEL_LAYOUT[0][rng.int(64)]);
    }
    for (const sym of resultSymbols) {
        html += iconHTML(sym);
    }
    colEl.innerHTML = html;
    colEl.style.transition = 'none';
    colEl.style.transform  = 'translateY(0)';
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
});

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

    // Будуємо смуги — результат вже в кінці, підміни не буде
    cols.forEach((col, ri) => buildStrip(col, result.rows[ri]));

    // Кінцева позиція: зсув вгору на всі рандомні рядки
    const finalY = -(STRIP_RANDOM * ITEM_H);

    // Два rAF щоб браузер встиг намалювати початкову позицію
    // перед тим як ми вмикаємо transition
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            cols.forEach((col, ri) => {
                col.style.transition = `transform ${SPIN_DURATION[ri]}s cubic-bezier(0.25, 0.1, 0.25, 1.0)`;
                col.style.transform  = `translateY(${finalY}px)`;
            });
        });
    });

    // Після зупинки останнього барабана
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
//  UI
// ═══════════════════════════════════════════════════════
function updateUI() {
    const totalBet = BASE_BET_LINE * BET_MULTIPLIERS[betIdx] * LINES;
    document.getElementById('creditsDisplay').textContent = credits.toFixed(2);
    document.getElementById('betDisplay').textContent     = totalBet.toFixed(2);
}

function showWin(result) {
    const winEl = document.getElementById('winDisplay');
    winEl.textContent = result.totalWin.toFixed(2);
    winEl.classList.remove('flash');
    void winEl.offsetWidth;
    winEl.classList.add('flash');
    if (result.winLines.includes(1)) {
        document.querySelector('.payline').classList.add('win');
    }
}

function clearWin() {
    document.getElementById('winDisplay').textContent = '—';
    document.querySelector('.payline').classList.remove('win');
}

function iconHTML(sym) {
    return `<div class="icon"><img src="assets/images/${sym}.png" alt="${sym}"></div>`;
}