// Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

// Роль из URL
const role = new URLSearchParams(window.location.search).get('role') || 'beta';
document.getElementById('role').innerText = role;

// CANVAS
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ========== КАРТА ==========
const map = [
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
[1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,1],
[1,0,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1],
[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
[1,1,1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1],
[1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
[1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
[1,0,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
[1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0,1],
[1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const ROWS = map.length;
const COLS = map[0].length;
const CELL = Math.min(canvas.width / COLS, canvas.height / ROWS);

// ========== СОСТОЯНИЕ ==========
let fox = { x: 1, y: 13, dx: 0, dy: 0 };
let hunters = [
    { x: 9, y: 1, type: 'chaser' },
    { x: 17, y: 7, type: 'ambush' },
    { x: 1, y: 7, type: 'random' }
];

let score = 0;
let running = true;
let huntersKilled = 0;

// ========== СИСТЕМА ПОПЫТОК ==========
let attemptsLeft = 3;
let gameStartTime = null;
let gameActive = true;

// Обновление UI
function updateUI() {
    document.getElementById('score').innerText = score;
    document.getElementById('hunters').innerText = hunters.length;
    document.getElementById('attempts').innerText = attemptsLeft;
}

// Отправка результата в бота
function sendResult(win, timeSpent = null) {
    if (!tg) return;
    const finalTime = timeSpent !== null ? timeSpent : (Date.now() - gameStartTime) / 1000;
    tg.sendData(JSON.stringify({
        reached_den: win,
        time: finalTime,
        hunters_killed: huntersKilled,
        score: score
    }));
}

// ========== ЛОГИКА ДВИЖЕНИЯ ==========
function canMove(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    return map[y][x] === 0;
}

function moveFox(dx, dy) {
    if (!running || !gameActive) return;
    let nx = fox.x + dx;
    let ny = fox.y + dy;
    if (canMove(nx, ny)) {
        fox.x = nx;
        fox.y = ny;
        fox.dx = dx;
        fox.dy = dy;
        score++;
        updateUI();
    }
}

// AI охотников
function moveHunters() {
    hunters.forEach(h => {
        let options = [
            { x: h.x + 1, y: h.y },
            { x: h.x - 1, y: h.y },
            { x: h.x, y: h.y + 1 },
            { x: h.x, y: h.y - 1 }
        ].filter(p => canMove(p.x, p.y));
        if (!options.length) return;

        let target;
        if (h.type === 'chaser') {
            target = { x: fox.x, y: fox.y };
        } else if (h.type === 'ambush') {
            target = {
                x: fox.x + fox.dx * 2,
                y: fox.y + fox.dy * 2
            };
        } else {
            if (Math.random() < 0.5) {
                let r = options[Math.floor(Math.random() * options.length)];
                h.x = r.x;
                h.y = r.y;
                return;
            }
            target = { x: fox.x, y: fox.y };
        }

        options.sort((a, b) =>
            (Math.abs(a.x - target.x) + Math.abs(a.y - target.y)) -
            (Math.abs(b.x - target.x) + Math.abs(b.y - target.y))
        );
        h.x = options[0].x;
        h.y = options[0].y;
    });
}

// ========== ПРОВЕРКИ ==========
function checkCollision() {
    for (let h of hunters) {
        if (h.x === fox.x && h.y === fox.y) {
            endGame(false);
            return true;
        }
    }
    return false;
}

function checkWin() {
    if (fox.x === 17 && fox.y === 1) {
        endGame(true);
        return true;
    }
    return false;
}

// ========== ЗАВЕРШЕНИЕ ИГРЫ ==========
function endGame(win) {
    if (!gameActive) return;
    gameActive = false;
    running = false;
    const timeSpent = (Date.now() - gameStartTime) / 1000;

    if (win) {
        sendResult(true, timeSpent);
        document.getElementById('msg').innerHTML = '🎉 ПОБЕДА! Результат отправлен!';
    } else {
        attemptsLeft--;
        updateUI();

        if (attemptsLeft > 0) {
            sendResult(false, timeSpent);
            document.getElementById('msg').innerHTML = `💀 ПОЙМАН! Осталось попыток: ${attemptsLeft}`;
            setTimeout(() => {
                resetGame();
                gameActive = true;
                running = true;
                gameStartTime = Date.now();
                document.getElementById('msg').innerHTML = '';
            }, 2000);
        } else {
            sendResult(false, timeSpent);
            document.getElementById('msg').innerHTML = '💀 ИГРА ОКОНЧЕНА! Попыток не осталось.';
        }
    }
}

// ========== СБРОС ИГРЫ ==========
function resetGame() {
    if (attemptsLeft <= 0 && !gameActive) {
        document.getElementById('msg').innerHTML = '❌ Попытки закончились!';
        return;
    }

    fox = { x: 1, y: 13, dx: 0, dy: 0 };
    hunters = [
        { x: 9, y: 1, type: 'chaser' },
        { x: 17, y: 7, type: 'ambush' },
        { x: 1, y: 7, type: 'random' }
    ];
    score = 0;
    huntersKilled = 0;
    running = true;
    gameActive = true;
    updateUI();
    document.getElementById('msg').innerHTML = '';
}

// ========== ОТРИСОВКА ==========
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (map[y][x] === 1) {
                ctx.fillStyle = "#022";
                ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            }
        }
    }

    ctx.font = `${CELL * 0.6}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Нора (победа)
    ctx.fillStyle = "#0f0";
    ctx.fillRect(17 * CELL, 1 * CELL, CELL, CELL);
    ctx.fillStyle = "#000";
    ctx.fillText("🕳️", 17 * CELL + CELL / 2, 1 * CELL + CELL / 2);

    // Лис
    ctx.fillStyle = "#0f0";
    ctx.fillText("🦊", fox.x * CELL + CELL / 2, fox.y * CELL + CELL / 2);

    // Охотники
    hunters.forEach(h => {
        ctx.fillStyle = "#f00";
        ctx.fillText("🔴", h.x * CELL + CELL / 2, h.y * CELL + CELL / 2);
    });
}

// ========== ИГРОВОЙ ЦИКЛ ==========
let lastMove = 0;
function gameLoop(timestamp) {
    if (gameActive && running && timestamp - lastMove > 250) {
        moveHunters();
        checkCollision();
        checkWin();
        lastMove = timestamp;
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// ========== УПРАВЛЕНИЕ ==========
document.getElementById('up').onclick = () => moveFox(0, -1);
document.getElementById('down').onclick = () => moveFox(0, 1);
document.getElementById('left').onclick = () => moveFox(-1, 0);
document.getElementById('right').onclick = () => moveFox(1, 0);
document.getElementById('reset').onclick = () => {
    if (attemptsLeft > 0 || gameActive === false) {
        resetGame();
        gameStartTime = Date.now();
    } else {
        document.getElementById('msg').innerHTML = '❌ Попытки кончились!';
    }
};

// ========== СВАЙП ДЛЯ ТЕЛЕФОНА ==========
let touchStart = { x: 0, y: 0 };
canvas.addEventListener('touchstart', (e) => {
    touchStart.x = e.touches[0].clientX;
    touchStart.y = e.touches[0].clientY;
    e.preventDefault();
});
canvas.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
        dx > 0 ? moveFox(1, 0) : moveFox(-1, 0);
    } else {
        dy > 0 ? moveFox(0, 1) : moveFox(0, -1);
    }
    e.preventDefault();
});

// ========== СТАРТ ==========
resetGame();
gameStartTime = Date.now();
updateUI();
requestAnimationFrame(gameLoop);
