const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const gameContainer = document.querySelector('.game-container');
const road = document.getElementById('road');
const playerCar = document.getElementById('player-car');
const finalScore = document.getElementById('final-score');
const finalHighScore = document.getElementById('final-high-score');

let keys = { ArrowLeft: false, ArrowRight: false };
let player = { x: 0, y: 0, speed: 5, score: 0 };
let gameActive = false;
let roadSpeed = 5;
let animationFrameId;

// High Score from local storage
let highScore = localStorage.getItem('carRacingHighScore') || 0;
highScoreDisplay.innerText = highScore;

// Input Events
document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        e.preventDefault();
        keys[e.key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        e.preventDefault();
        keys[e.key] = false;
    }
});

// Touch / Mouse dragging for mobile support
let isDragging = false;
gameContainer.addEventListener('mousedown', (e) => { isDragging = true; movePlayerTo(e.clientX); });
gameContainer.addEventListener('mousemove', (e) => { if(isDragging) movePlayerTo(e.clientX); });
window.addEventListener('mouseup', () => { isDragging = false; });

gameContainer.addEventListener('touchstart', (e) => { movePlayerTo(e.touches[0].clientX); }, {passive: true});
gameContainer.addEventListener('touchmove', (e) => { movePlayerTo(e.touches[0].clientX); }, {passive: true});

function movePlayerTo(clientX) {
    if (!gameActive) return;
    const rect = road.getBoundingClientRect();
    let x = clientX - rect.left - 23; // 23 is half of new car width (46)
    
    let maxLeft = road.offsetWidth - 52; // 46 width + 6 border
    if (x < 6) x = 6;
    if (x > maxLeft) x = maxLeft; 
    
    player.x = x;
    playerCar.style.left = player.x + 'px';
}

// Game Logic
function isCollide(a, b) {
    let aRect = a.getBoundingClientRect();
    let bRect = b.getBoundingClientRect();
    
    // Padding for forgiving collision
    let padding = 5;

    return !(
        (aRect.top + padding > bRect.bottom - padding) ||
        (aRect.bottom - padding < bRect.top + padding) ||
        (aRect.right - padding < bRect.left + padding) ||
        (aRect.left + padding > bRect.right - padding)
    );
}

function moveLines() {
    let lines = document.querySelectorAll('.line');
    lines.forEach(line => {
        let y = line.offsetTop;
        if (y >= gameContainer.offsetHeight) {
            y -= gameContainer.offsetHeight + 100;
        }
        line.style.top = (y + roadSpeed) + "px";
    });
}

function createEnemy() {
    let enemy = document.createElement('div');
    enemy.setAttribute('class', 'car enemy');
    
    // Genuine Car HTML
    enemy.innerHTML = `
        <div class="car-body"></div>
        <div class="windshield" style="top:auto; bottom:12px; border-radius: 2px 2px 4px 4px;"></div>
        <div class="headlight-l" style="top:auto; bottom:2px; box-shadow: 0 5px 10px rgba(255,255,255,0.8);"></div>
        <div class="headlight-r" style="top:auto; bottom:2px; box-shadow: 0 5px 10px rgba(255,255,255,0.8);"></div>
        <div class="wheel-tl" style="top:2px;"></div>
        <div class="wheel-tr" style="top:2px;"></div>
    `;
    
    // Random color variant (1 to 4)
    let colorClass = 'enemy-' + (Math.floor(Math.random() * 4) + 1);
    enemy.classList.add(colorClass);
    
    let maxLeft = road.offsetWidth - 52;
    let validPosition = false;
    let attempts = 0;
    
    while (!validPosition && attempts < 10) {
        // Start above screen
        enemy.y = (Math.random() * -300) - 100;
        enemy.style.left = Math.floor(Math.random() * (maxLeft - 6) + 6) + "px";
        
        validPosition = true;
        let existingEnemies = document.querySelectorAll('.enemy');
        existingEnemies.forEach(ex => {
            let dx = parseInt(enemy.style.left) - parseInt(ex.style.left);
            let dy = enemy.y - ex.y;
            // Ensure gap between cars (Car is 46x86)
            if (Math.abs(dx) < 60 && Math.abs(dy) < 180) {
                validPosition = false;
            }
        });
        attempts++;
    }
    
    enemy.style.top = enemy.y + "px";
    road.appendChild(enemy);
}

function moveEnemies() {
    let enemies = document.querySelectorAll('.enemy');
    
    enemies.forEach(enemy => {
        if (isCollide(playerCar, enemy)) {
            endGame();
        }
        
        if (enemy.y >= gameContainer.offsetHeight) {
            enemy.remove();
            player.score += 10;
            scoreDisplay.innerText = player.score;
            
            // Generate a new one to replace it
            createEnemy();
            
            // Gradually increase speed
            if(player.score % 100 === 0 && roadSpeed < 18) {
                roadSpeed += 1;
                player.speed += 0.5;
            }
        } else {
            enemy.y += roadSpeed;
            enemy.style.top = enemy.y + "px";
        }
    });
}

function gameLoop() {
    if (!gameActive) return;
    
    moveLines();
    moveEnemies();
    
    // Move player with keys
    let maxLeft = road.offsetWidth - 52;
    if (keys.ArrowLeft && player.x > 6) {
        player.x -= player.speed;
    }
    if (keys.ArrowRight && player.x < maxLeft) {
        player.x += player.speed;
    }
    playerCar.style.left = player.x + 'px';
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    document.querySelectorAll('.enemy').forEach(e => e.remove());
    
    gameActive = true;
    player.score = 0;
    roadSpeed = 5;
    player.speed = 6;
    scoreDisplay.innerText = player.score;
    
    // Center player car
    player.x = (road.offsetWidth / 2) - 23;
    player.y = gameContainer.offsetHeight - 120;
    playerCar.style.left = player.x + "px";
    playerCar.style.top = player.y + "px";
    
    // Spawn initial enemies
    for(let i=0; i<3; i++) {
        setTimeout(createEnemy, i * 800);
    }
    
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
}

function endGame() {
    gameActive = false;
    finalScore.innerText = player.score;
    
    if (player.score > highScore) {
        highScore = player.score;
        localStorage.setItem('carRacingHighScore', highScore);
        highScoreDisplay.innerText = highScore;
    }
    
    finalHighScore.innerText = highScore;
    gameOverScreen.classList.remove('hidden');
    
    // Crash effect
    playerCar.style.transform = "rotate(15deg) scale(0.9)";
    setTimeout(() => { playerCar.style.transform = "none"; }, 1000);
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
