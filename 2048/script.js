const boardEl = document.getElementById('game-board');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const newGameBtn = document.getElementById('new-game-btn');
const restartBtn = document.getElementById('restart-btn');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');
const gameStatusEl = document.getElementById('game-status');

let board = [];
let score = 0;
let bestScore = localStorage.getItem('2048-best') || 0;
let hasWon = false;

bestScoreEl.innerText = bestScore;

function initGame() {
    board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
    score = 0;
    hasWon = false;
    updateScore();
    gameOverModal.classList.add('hidden');
    
    // Draw empty grid
    boardEl.innerHTML = '';
    for(let i=0; i<16; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        boardEl.appendChild(cell);
    }
    
    addRandomTile();
    addRandomTile();
    renderBoard();
}

function addRandomTile() {
    let emptyCells = [];
    for(let r=0; r<4; r++) {
        for(let c=0; c<4; c++) {
            if(board[r][c] === 0) emptyCells.push({r, c});
        }
    }
    
    if (emptyCells.length > 0) {
        let randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
        
        // Render specifically for the "new" animation
        renderBoard(randomCell); 
    }
}

function renderBoard(newCell = null, mergedCells = []) {
    // Remove existing tiles
    document.querySelectorAll('.tile').forEach(t => t.remove());
    
    for(let r=0; r<4; r++) {
        for(let c=0; c<4; c++) {
            if(board[r][c] !== 0) {
                const val = board[r][c];
                const tile = document.createElement('div');
                
                let tileClass = val <= 2048 ? `tile-${val}` : 'tile-super';
                tile.className = `tile ${tileClass}`;
                tile.innerText = val;
                
                // Position using CSS calc to overlay exactly on the grid cells
                // gap is 10px, padding is 10px. 
                // cell width is (100% - 3*10px) / 4. 
                tile.style.top = `calc(10px + ${r} * ((100% - 30px) / 4 + 10px))`;
                tile.style.left = `calc(10px + ${c} * ((100% - 30px) / 4 + 10px))`;
                
                if (newCell && newCell.r === r && newCell.c === c) {
                    tile.classList.add('tile-new');
                }
                
                if (mergedCells.some(mc => mc.r === r && mc.c === c)) {
                    tile.classList.add('tile-merged');
                }
                
                boardEl.appendChild(tile);
            }
        }
    }
}

function updateScore() {
    scoreEl.innerText = score;
    if (score > bestScore) {
        bestScore = score;
        bestScoreEl.innerText = bestScore;
        localStorage.setItem('2048-best', bestScore);
    }
}

// Core Logic (Sliding and Merging)
function slide(row) {
    let arr = row.filter(val => val !== 0); // remove zeros
    let merged = [];
    
    for(let i=0; i<arr.length-1; i++) {
        if(arr[i] === arr[i+1]) {
            arr[i] *= 2;
            score += arr[i];
            arr[i+1] = 0;
            merged.push(i); // Note: index in the compressed array
            
            if(arr[i] === 2048 && !hasWon) {
                hasWon = true; // Win condition met, but let them keep playing
            }
        }
    }
    
    arr = arr.filter(val => val !== 0); // remove newly created zeros
    
    // pad with zeros
    while(arr.length < 4) {
        arr.push(0);
    }
    
    return { newRow: arr, hasChanged: row.join(',') !== arr.join(',') };
}

function moveLeft() {
    let changed = false;
    let mergedCells = [];
    for(let r=0; r<4; r++) {
        let { newRow, hasChanged } = slide(board[r]);
        if(hasChanged) {
            board[r] = newRow;
            changed = true;
        }
    }
    return changed;
}

function moveRight() {
    let changed = false;
    for(let r=0; r<4; r++) {
        let row = board[r].slice().reverse();
        let { newRow, hasChanged } = slide(row);
        if(hasChanged) {
            board[r] = newRow.reverse();
            changed = true;
        }
    }
    return changed;
}

function moveUp() {
    let changed = false;
    for(let c=0; c<4; c++) {
        let col = [board[0][c], board[1][c], board[2][c], board[3][c]];
        let { newRow, hasChanged } = slide(col);
        if(hasChanged) {
            for(let r=0; r<4; r++) board[r][c] = newRow[r];
            changed = true;
        }
    }
    return changed;
}

function moveDown() {
    let changed = false;
    for(let c=0; c<4; c++) {
        let col = [board[3][c], board[2][c], board[1][c], board[0][c]];
        let { newRow, hasChanged } = slide(col);
        if(hasChanged) {
            newRow.reverse();
            for(let r=0; r<4; r++) board[r][c] = newRow[r];
            changed = true;
        }
    }
    return changed;
}

function checkGameOver() {
    for(let r=0; r<4; r++) {
        for(let c=0; c<4; c++) {
            if(board[r][c] === 0) return false; // empty spot exists
            if(c !== 3 && board[r][c] === board[r][c+1]) return false; // horizontal match possible
            if(r !== 3 && board[r][c] === board[r+1][c]) return false; // vertical match possible
        }
    }
    return true; // No moves left
}

function handleInput(direction) {
    let changed = false;
    if (direction === 'LEFT') changed = moveLeft();
    if (direction === 'RIGHT') changed = moveRight();
    if (direction === 'UP') changed = moveUp();
    if (direction === 'DOWN') changed = moveDown();
    
    if (changed) {
        addRandomTile(); // Adds tile and renders
        updateScore();
        
        if (checkGameOver()) {
            setTimeout(() => {
                gameStatusEl.innerText = 'Game Over!';
                finalScoreEl.innerText = score;
                gameOverModal.classList.remove('hidden');
            }, 500);
        } else if (hasWon && !document.getElementById('won-already')) {
            setTimeout(() => {
                gameStatusEl.innerText = 'You Win!';
                finalScoreEl.innerText = score;
                restartBtn.innerText = 'Keep Playing';
                gameOverModal.classList.remove('hidden');
                
                // Mark as won so modal doesn't pop up again
                const wonFlag = document.createElement('div');
                wonFlag.id = 'won-already';
                document.body.appendChild(wonFlag);
            }, 500);
        }
    }
}

// Keyboard Events
document.addEventListener('keydown', (e) => {
    if(!gameOverModal.classList.contains('hidden')) return;
    
    if(e.key === 'ArrowLeft') { e.preventDefault(); handleInput('LEFT'); }
    if(e.key === 'ArrowRight') { e.preventDefault(); handleInput('RIGHT'); }
    if(e.key === 'ArrowUp') { e.preventDefault(); handleInput('UP'); }
    if(e.key === 'ArrowDown') { e.preventDefault(); handleInput('DOWN'); }
});

// Touch/Swipe Events
let touchStartX = 0;
let touchStartY = 0;
let isDragging = false; // For mouse support

// Handle Start (Touch & Mouse)
function handleStart(x, y) {
    touchStartX = x;
    touchStartY = y;
    isDragging = true;
}

// Handle End (Touch & Mouse)
function handleEnd(x, y) {
    if (!isDragging) return;
    isDragging = false;
    
    if(!gameOverModal.classList.contains('hidden')) return;
    
    let dx = x - touchStartX;
    let dy = y - touchStartY;
    
    if(Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        if(Math.abs(dx) > 30) {
            if(dx > 0) handleInput('RIGHT');
            else handleInput('LEFT');
        }
    } else {
        // Vertical
        if(Math.abs(dy) > 30) {
            if(dy > 0) handleInput('DOWN');
            else handleInput('UP');
        }
    }
}

// Touch Listeners
boardEl.addEventListener('touchstart', e => {
    handleStart(e.changedTouches[0].screenX, e.changedTouches[0].screenY);
}, {passive: false});

boardEl.addEventListener('touchmove', e => {
    e.preventDefault(); // Prevent scrolling while playing
}, {passive: false});

boardEl.addEventListener('touchend', e => {
    handleEnd(e.changedTouches[0].screenX, e.changedTouches[0].screenY);
});

// Mouse Listeners
boardEl.addEventListener('mousedown', e => {
    e.preventDefault(); // Prevent text selection
    handleStart(e.clientX, e.clientY);
});

boardEl.addEventListener('mouseup', e => {
    handleEnd(e.clientX, e.clientY);
});

boardEl.addEventListener('mouseleave', e => {
    if (isDragging) {
        handleEnd(e.clientX, e.clientY);
    }
});

// Buttons
newGameBtn.addEventListener('click', () => {
    const w = document.getElementById('won-already');
    if(w) w.remove();
    initGame();
});
restartBtn.addEventListener('click', () => {
    if(restartBtn.innerText === 'Keep Playing') {
        gameOverModal.classList.add('hidden');
    } else {
        const w = document.getElementById('won-already');
        if(w) w.remove();
        initGame();
    }
});

// Start
initGame();
