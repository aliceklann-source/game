const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub = document.getElementById('overlay-sub');

// Sintetizador de som 8-bit nativo
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
if (audioCtx.state === 'suspended') audioCtx.resume();
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.connect(gain);
gain.connect(audioCtx.destination);

const now = audioCtx.currentTime;

if (type === 'shoot') {
osc.type = 'square';
osc.frequency.setValueAtTime(600, now);
osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
gain.gain.setValueAtTime(0.1, now);
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
osc.start(now);
osc.stop(now + 0.1);
} else if (type === 'hit') {
osc.type = 'sawtooth';
osc.frequency.setValueAtTime(200, now);
osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
gain.gain.setValueAtTime(0.15, now);
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
osc.start(now);
osc.stop(now + 0.15);
} else if (type === 'playerHit') {
osc.type = 'sawtooth';
osc.frequency.setValueAtTime(120, now);
osc.frequency.linearRampToValueAtTime(30, now + 0.4);
gain.gain.setValueAtTime(0.25, now);
gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
osc.start(now);
osc.stop(now + 0.4);
}
}

// Sprites em Pixel Art usando texto (1 = pixel aceso, 0 = vazio)
const playerSprite = new Array(
"000010000",
"000111000",
"000111000",
"011111110",
"111111111",
"111000111"
);

const alienSprite = new Array(
"001000100",
"000101000",
"001111100",
"011010110",
"111111111",
"101111101",
"101000101",
"000101000"
);

function drawPixelSprite(sprite, x, y, pixelSize, color) {
ctx.fillStyle = color;
for (let row = 0; row < sprite.length; row++) {
const line = sprite[row];
for (let col = 0; col < line.length; col++) {
if (line.charAt(col) === '1') {
ctx.fillRect(x + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
}
}
}
}

// Variáveis do jogo
let gameRunning = false;
let score = 0;
let level = 1;
let lives = 3;

let player = { x: 280, y: 405, width: 36, height: 24, speed: 5 };
let bullets = new Array();
let enemyBullets = new Array();
let enemies = new Array();
let stars = new Array();

let enemyDir = 1;
let enemySpeed = 1;
let lastShotTime = 0;

// Fundo estrelado
for (let i = 0; i < 40; i++) {
stars.push({
x: Math.random() * canvas.width,
y: Math.random() * canvas.height,
speed: 0.3 + Math.random() * 0.7
});
}

// Controles
const keys = {};
window.addEventListener('keydown', (e) => {
keys[e.code] = true;
if (e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

function createEnemies() {
enemies = new Array();
const rows = 4;
const cols = 8;
const colors = new Array('#ff3366', '#ff9900', '#ffff00', '#00ccff');

for (let r = 0; r < rows; r++) {
for (let c = 0; c < cols; c++) {
enemies.push({
x: 60 + c * 60,
y: 40 + r * 42,
width: 36,
height: 32,
color: colors[r % colors.length],
alive: true
});
}
}
enemyDir = 1;
enemySpeed = 0.8 + (level * 0.35);
}

function updateHUD() {
scoreEl.innerText = String(score).padStart(4, '0');
levelEl.innerText = level;
livesEl.innerText = '♥'.repeat(Math.max(0, lives));
}

window.startGame = function() {
score = 0;
level = 1;
lives = 3;
player.x = canvas.width / 2 - player.width / 2;
bullets = new Array();
enemyBullets = new Array();
createEnemies();
updateHUD();
overlay.classList.add('hidden');
gameRunning = true;
};

function endGame(won) {
gameRunning = false;
overlayTitle.innerText = won ? 'VITÓRIA!' : 'GAME OVER';
overlayTitle.style.color = won ? '#00ff66' : '#ff3366';
overlaySub.innerText = `PONTUAÇÃO FINAL: ${score}`;
overlay.classList.remove('hidden');
}

function update() {
stars.forEach(s => {
s.y += s.speed;
if (s.y > canvas.height) {
s.y = 0;
s.x = Math.random() * canvas.width;
}
});

if (!gameRunning) return;

// Movimento do jogador
if (keys['ArrowLeft'] || keys['KeyA']) {
player.x = Math.max(10, player.x - player.speed);
}
if (keys['ArrowRight'] || keys['KeyD']) {
player.x = Math.min(canvas.width - player.width - 10, player.x + player.speed);
}

// Disparo do jogador
if (keys['Space'] && Date.now() - lastShotTime > 320) {
bullets.push({ x: player.x + player.width / 2 - 2, y: player.y - 8, width: 4, height: 12 });
playSound('shoot');
lastShotTime = Date.now();
}

// Atualiza tiros do jogador
for (let i = bullets.length - 1; i >= 0; i--) {
bullets[i].y -= 7;
if (bullets[i].y < 0) bullets.splice(i, 1);
}

// Atualiza movimento dos inimigos
let hitEdge = false;
let aliveEnemies = enemies.filter(e => e.alive);

aliveEnemies.forEach(e => {
e.x += enemySpeed * enemyDir;
if (e.x + e.width >= canvas.width - 15 || e.x <= 15) {
hitEdge = true;
}
});

if (hitEdge) {
enemyDir *= -1;
aliveEnemies.forEach(e => {
e.y += 18;
if (e.y + e.height >= player.y) {
endGame(false);
}
});
}

// Tiro aleatório dos inimigos
if (aliveEnemies.length > 0 && Math.random() < 0.02 + (level * 0.005)) {
const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
enemyBullets.push({
x: shooter.x + shooter.width / 2 - 2,
y: shooter.y + shooter.height,
width: 4,
height: 10
});
}

// Atualiza tiros dos inimigos
for (let i = enemyBullets.length - 1; i >= 0; i--) {
const b = enemyBullets[i];
b.y += 4 + (level * 0.4);

if (b.x < player.x + player.width && b.x + b.width > player.x &&
b.y < player.y + player.height && b.y + b.height > player.y) {
enemyBullets.splice(i, 1);
lives--;
playSound('playerHit');
updateHUD();
if (lives <= 0) {
endGame(false);
return;
}
} else if (b.y > canvas.height) {
enemyBullets.splice(i, 1);
}
}

// Colisão tiros do jogador x inimigos
for (let i = bullets.length - 1; i >= 0; i--) {
const b = bullets[i];
for (let j = 0; j < enemies.length; j++) {
const e = enemies[j];
if (e.alive && b.x < e.x + e.width && b.x + b.width > e.x &&
b.y < e.y + e.height && b.y + b.height > e.y) {
e.alive = false;
bullets.splice(i, 1);
score += 100;
enemySpeed += 0.04;
playSound('hit');
updateHUD();
break;
}
}
}

// Próxima fase
if (enemies.every(e => !e.alive)) {
level++;
bullets = new Array();
enemyBullets = new Array();
createEnemies();
updateHUD();
}
}

function draw() {
ctx.clearRect(0, 0, canvas.width, canvas.height);

// Estrelas
ctx.fillStyle = '#ffffff';
stars.forEach(s => ctx.fillRect(s.x, s.y, 2, 2));

if (!gameRunning) return;

// Jogador
drawPixelSprite(playerSprite, player.x, player.y, 4, '#00ff66');

// Inimigos
enemies.forEach(e => {
if (e.alive) {
drawPixelSprite(alienSprite, e.x, e.y, 4, e.color);
}
});

// Tiros do jogador
ctx.fillStyle = '#00ff66';
bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

// Tiros dos inimigos
ctx.fillStyle = '#ff3366';
enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
}

function gameLoop() {
update();
draw();
requestAnimationFrame(gameLoop);
}

gameLoop();