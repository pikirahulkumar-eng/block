const GRID_SIZE = 10;
const board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

const SHAPES = [
    // 1x1
    { grid: [[1]], color: 'linear-gradient(135deg, #f6d365, #fda085)' },
    // 2x2
    { grid: [[1, 1], [1, 1]], color: 'linear-gradient(135deg, #fbc2eb, #a6c1ee)' },
    // 3x3 square
    { grid: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: 'linear-gradient(135deg, #a1c4fd, #c2e9fb)' },
    // 1x2 vertical
    { grid: [[1], [1]], color: 'linear-gradient(135deg, #84fab0, #8fd3f4)' },
    // 1x3 vertical
    { grid: [[1], [1], [1]], color: 'linear-gradient(135deg, #fccb90, #d57eeb)' },
    // 1x4 vertical
    { grid: [[1], [1], [1], [1]], color: 'linear-gradient(135deg, #e0c3fc, #8ec5fc)' },
    // 1x5 vertical
    { grid: [[1], [1], [1], [1], [1]], color: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
    // 2x1 horizontal
    { grid: [[1, 1]], color: 'linear-gradient(135deg, #84fab0, #8fd3f4)' },
    // 3x1 horizontal
    { grid: [[1, 1, 1]], color: 'linear-gradient(135deg, #fccb90, #d57eeb)' },
    // 4x1 horizontal
    { grid: [[1, 1, 1, 1]], color: 'linear-gradient(135deg, #e0c3fc, #8ec5fc)' },
    // 5x1 horizontal
    { grid: [[1, 1, 1, 1, 1]], color: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
    // L shape small
    { grid: [[1, 0], [1, 1]], color: 'linear-gradient(135deg, #ff0844, #ffb199)' },
    // L shape large
    { grid: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], color: 'linear-gradient(135deg, #f83600, #f9d423)' },
    // T shape
    { grid: [[1, 1, 1], [0, 1, 0]], color: 'linear-gradient(135deg, #b224ef, #7579ff)' }
];

let score = 0;
let bestScore = localStorage.getItem('blockPuzzleBest') || 0;
let dragState = null;
let slotsFilled = 0;

const boardEl = document.getElementById('game-board');
const scoreEl = document.getElementById('score-display');
const bestScoreEl = document.getElementById('best-score-display');
const cells = [];

bestScoreEl.innerText = bestScore;

// Sound System
let soundEnabled = true;
const soundBtn = document.getElementById('sound-btn');
soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.innerText = soundEnabled ? '🔊' : '🔇';
});

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!soundEnabled) return;
    initAudio();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'grab') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'drop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'clear') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'over') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
}

// Visual Effects
function showFloatingText(text, x, y) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// Initialize Board DOM
function initBoard() {
    boardEl.innerHTML = '';
    cells.length = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            boardEl.appendChild(cell);
            cells.push(cell);
            board[r][c] = 0;
        }
    }
}

function getCellEl(r, c) {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
    return cells[r * GRID_SIZE + c];
}

// Generate new shapes in tray
function fillTray() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`slot-${i}`);
        slot.innerHTML = '';
        
        const shapeDef = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const shapeEl = createShapeEl(shapeDef, i);
        slot.appendChild(shapeEl);
    }
    slotsFilled = 3;
    checkGameOver();
}

function createShapeEl(shapeDef, slotIndex) {
    const el = document.createElement('div');
    el.classList.add('shape-draggable');
    
    const rows = shapeDef.grid.length;
    const cols = shapeDef.grid[0].length;
    
    el.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    const blockSize = boardEl.clientWidth / GRID_SIZE;
    el.style.width = `${cols * blockSize}px`;
    el.style.height = `${rows * blockSize}px`;
    
    el.dataset.slot = slotIndex;
    el.shapeDef = shapeDef;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const block = document.createElement('div');
            if (shapeDef.grid[r][c]) {
                block.classList.add('block');
                block.style.background = shapeDef.color;
            } else {
                block.style.visibility = 'hidden';
            }
            el.appendChild(block);
        }
    }

    el.addEventListener('mousedown', onDragStart);
    el.addEventListener('touchstart', onDragStart, { passive: false });
    
    return el;
}

// Drag & Drop Logic
function onDragStart(e) {
    e.preventDefault();
    if (e.type === 'touchstart' && e.touches.length > 1) return;
    
    initAudio();
    playSound('grab');

    const el = e.currentTarget;
    const shapeDef = el.shapeDef;
    
    const clone = el.cloneNode(true);
    clone.shapeDef = shapeDef; 
    clone.classList.add('dragging');
    document.body.appendChild(clone);
    
    el.style.opacity = '0';
    
    const blockSize = boardEl.clientWidth / GRID_SIZE;
    
    dragState = {
        clone,
        original: el,
        shapeDef,
        blockSize,
        offsetX: e.type === 'touchstart' ? e.touches[0].clientX : e.clientX,
        offsetY: e.type === 'touchstart' ? e.touches[0].clientY : e.clientY,
        validR: -1,
        validC: -1
    };

    updateClonePosition(dragState.offsetX, dragState.offsetY);

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
}

function onDragMove(e) {
    if (!dragState) return;
    e.preventDefault();
    
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    const yOffset = e.type === 'touchmove' ? -80 : 0;
    updateClonePosition(clientX, clientY + yOffset);
    calculateHoverPosition(clientX, clientY + yOffset);
}

function updateClonePosition(x, y) {
    const clone = dragState.clone;
    clone.style.left = `${x - clone.offsetWidth / 2}px`;
    clone.style.top = `${y - clone.offsetHeight / 2}px`;
}

function calculateHoverPosition(x, y) {
    clearHighlights();
    const boardRect = boardEl.getBoundingClientRect();
    const blockSize = dragState.blockSize;
    
    const cloneRect = dragState.clone.getBoundingClientRect();
    const relativeX = cloneRect.left - boardRect.left;
    const relativeY = cloneRect.top - boardRect.top;
    
    const startCol = Math.round(relativeX / blockSize);
    const startRow = Math.round(relativeY / blockSize);
    
    dragState.validR = -1;
    dragState.validC = -1;
    
    if (isValidPlacement(dragState.shapeDef, startRow, startCol)) {
        dragState.validR = startRow;
        dragState.validC = startCol;
        highlightCells(dragState.shapeDef, startRow, startCol);
    }
}

function isValidPlacement(shapeDef, startRow, startCol) {
    const grid = shapeDef.grid;
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            if (grid[r][c]) {
                const br = startRow + r;
                const bc = startCol + c;
                if (br < 0 || br >= GRID_SIZE || bc < 0 || bc >= GRID_SIZE || board[br][bc] === 1) {
                    return false;
                }
            }
        }
    }
    return true;
}

function highlightCells(shapeDef, startRow, startCol) {
    const grid = shapeDef.grid;
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            if (grid[r][c]) {
                const cellEl = getCellEl(startRow + r, startCol + c);
                if (cellEl) cellEl.classList.add('highlight');
            }
        }
    }
}

function clearHighlights() {
    cells.forEach(cell => cell.classList.remove('highlight'));
}

function onDragEnd(e) {
    if (!dragState) return;
    
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
    
    clearHighlights();
    
    if (dragState.validR !== -1 && dragState.validC !== -1) {
        playSound('drop');
        placeShape(dragState.shapeDef, dragState.validR, dragState.validC);
        dragState.original.remove(); 
        slotsFilled--;
        
        let blocksCount = 0;
        dragState.shapeDef.grid.flat().forEach(val => blocksCount += val);
        updateScore(blocksCount);
        
        checkLines(dragState.clone.getBoundingClientRect());
        
        if (slotsFilled === 0) fillTray();
        else checkGameOver();
    } else {
        dragState.original.style.opacity = '1';
    }
    
    dragState.clone.remove();
    dragState = null;
}

function placeShape(shapeDef, startRow, startCol) {
    const grid = shapeDef.grid;
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            if (grid[r][c]) {
                const br = startRow + r;
                const bc = startCol + c;
                board[br][bc] = 1;
                const cellEl = getCellEl(br, bc);
                cellEl.classList.add('filled', 'block');
                cellEl.style.background = shapeDef.color;
            }
        }
    }
}

function checkLines(dropRect) {
    let rowsToClear = [];
    let colsToClear = [];
    
    for (let r = 0; r < GRID_SIZE; r++) {
        if (board[r].every(val => val === 1)) rowsToClear.push(r);
    }
    
    for (let c = 0; c < GRID_SIZE; c++) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (board[r][c] === 0) { full = false; break; }
        }
        if (full) colsToClear.push(c);
    }
    
    const cellsToClear = new Set();
    rowsToClear.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) cellsToClear.add(`${r},${c}`); });
    colsToClear.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) cellsToClear.add(`${r},${c}`); });
    
    if (cellsToClear.size > 0) {
        playSound('clear');
        document.querySelector('.app-container').classList.add('shake');
        setTimeout(() => document.querySelector('.app-container').classList.remove('shake'), 400);

        let linesCleared = rowsToClear.length + colsToClear.length;
        let pointsEarned = cellsToClear.size * 10;
        
        if (linesCleared > 1) {
            pointsEarned += 50 * linesCleared; // Combo Bonus
            showFloatingText(`COMBO x${linesCleared}!`, dropRect.left, dropRect.top - 50);
        } else {
            showFloatingText(`+${pointsEarned}`, dropRect.left, dropRect.top - 50);
        }

        updateScore(pointsEarned);
        
        cellsToClear.forEach(coord => {
            const [r, c] = coord.split(',').map(Number);
            board[r][c] = 0;
            const cellEl = getCellEl(r, c);
            cellEl.classList.add('clearing');
            setTimeout(() => {
                cellEl.classList.remove('filled', 'block', 'clearing');
                cellEl.style.background = '';
            }, 300);
        });
        
        setTimeout(checkGameOver, 350); 
    }
}

function updateScore(points) {
    score += points;
    scoreEl.innerText = score;
    scoreEl.style.transform = 'scale(1.3)';
    
    if (score > bestScore) {
        bestScore = score;
        bestScoreEl.innerText = bestScore;
        localStorage.setItem('blockPuzzleBest', bestScore);
    }

    setTimeout(() => {
        scoreEl.style.transform = 'scale(1)';
    }, 200);
}

function checkGameOver() {
    const trayShapes = [];
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`slot-${i}`);
        if (slot.children.length > 0) {
            trayShapes.push(slot.children[0].shapeDef);
        }
    }
    
    let canPlaceAny = false;
    for (const shapeDef of trayShapes) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (isValidPlacement(shapeDef, r, c)) {
                    canPlaceAny = true;
                    break;
                }
            }
            if (canPlaceAny) break;
        }
        if (canPlaceAny) break;
    }
    
    if (!canPlaceAny && slotsFilled > 0) showGameOver();
}

function showGameOver() {
    playSound('over');
    const modal = document.getElementById('game-over-modal');
    document.getElementById('final-score').innerText = score;
    modal.classList.remove('hidden');
}

function resetGame() {
    score = 0;
    scoreEl.innerText = '0';
    initBoard();
    fillTray();
    document.getElementById('game-over-modal').classList.add('hidden');
}

document.getElementById('start-btn').addEventListener('click', () => {
    initAudio();
    document.getElementById('start-modal').classList.add('hidden');
    resetGame();
});

document.getElementById('restart-btn').addEventListener('click', resetGame);
