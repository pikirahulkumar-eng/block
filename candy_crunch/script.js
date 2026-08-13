const grid = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score-display');
const startBtn = document.getElementById('start-btn');
const startModal = document.getElementById('start-modal');

const width = 8;
const squares = [];
let score = 0;

const candyColors = [
    'c-red',
    'c-yellow',
    'c-orange',
    'c-purple',
    'c-green',
    'c-blue'
];

let candyBeingDragged;
let candyBeingReplaced;
let squareIdBeingDragged;
let squareIdBeingReplaced;

// Create Board
function createBoard() {
    grid.innerHTML = '';
    squares.length = 0;
    
    for (let i = 0; i < width * width; i++) {
        const square = document.createElement('div');
        square.setAttribute('draggable', true);
        square.setAttribute('id', i);
        square.classList.add('candy');
        
        let randomColor = Math.floor(Math.random() * candyColors.length);
        square.classList.add(candyColors[randomColor]);
        
        grid.appendChild(square);
        squares.push(square);
    }
    
    // Quick resolve matches on start
    let initialMatches = true;
    while(initialMatches) {
        initialMatches = false;
        // Check rows
        for (let i = 0; i < 63; i++) {
            let rowOfThree = [i, i+1, i+2];
            let decidedColor = getCandyColor(squares[i]);
            const isBlank = decidedColor === '';
            const notValid = [6, 7, 14, 15, 22, 23, 30, 31, 38, 39, 46, 47, 54, 55, 62, 63];
            if (notValid.includes(i)) continue;

            if (rowOfThree.every(index => getCandyColor(squares[index]) === decidedColor && !isBlank)) {
                squares[i].classList.remove(decidedColor);
                squares[i].classList.add(candyColors[Math.floor(Math.random() * candyColors.length)]);
                initialMatches = true;
            }
        }
        // Check cols
        for (let i = 0; i < 47; i++) {
            let colOfThree = [i, i+width, i+width*2];
            let decidedColor = getCandyColor(squares[i]);
            const isBlank = decidedColor === '';

            if (colOfThree.every(index => getCandyColor(squares[index]) === decidedColor && !isBlank)) {
                squares[i].classList.remove(decidedColor);
                squares[i].classList.add(candyColors[Math.floor(Math.random() * candyColors.length)]);
                initialMatches = true;
            }
        }
    }
    
    setupDragEvents();
}

function getCandyColor(square) {
    if(!square) return '';
    return Array.from(square.classList).find(c => candyColors.includes(c)) || '';
}

// Drag Events
function setupDragEvents() {
    squares.forEach(square => {
        square.addEventListener('dragstart', dragStart);
        square.addEventListener('dragend', dragEnd);
        square.addEventListener('dragover', dragOver);
        square.addEventListener('dragenter', dragEnter);
        square.addEventListener('dragleave', dragLeave);
        square.addEventListener('drop', dragDrop);
        
        // Touch support (simple implementation)
        square.addEventListener('touchstart', touchStart, {passive: false});
        square.addEventListener('touchmove', touchMove, {passive: false});
        square.addEventListener('touchend', touchEnd);
    });
}

function dragStart() {
    candyBeingDragged = this;
    squareIdBeingDragged = parseInt(this.id);
}

function dragOver(e) {
    e.preventDefault();
}

function dragEnter(e) {
    e.preventDefault();
}

function dragLeave() {}

function dragDrop() {
    candyBeingReplaced = this;
    squareIdBeingReplaced = parseInt(this.id);
}

function dragEnd() {
    if (!candyBeingReplaced) return;

    // valid moves
    let validMoves = [
        squareIdBeingDragged - 1,
        squareIdBeingDragged - width,
        squareIdBeingDragged + 1,
        squareIdBeingDragged + width
    ];

    let validMove = validMoves.includes(squareIdBeingReplaced);

    if (squareIdBeingReplaced && validMove) {
        // Swap colors
        let colorDragged = getCandyColor(candyBeingDragged);
        let colorReplaced = getCandyColor(candyBeingReplaced);
        
        candyBeingDragged.classList.remove(colorDragged);
        candyBeingDragged.classList.add(colorReplaced);
        
        candyBeingReplaced.classList.remove(colorReplaced);
        candyBeingReplaced.classList.add(colorDragged);

        let isMatch = checkMatches();

        if (isMatch) {
            squareIdBeingReplaced = null;
        } else {
            // Swap back if no match
            setTimeout(() => {
                candyBeingDragged.classList.remove(colorReplaced);
                candyBeingDragged.classList.add(colorDragged);
                
                candyBeingReplaced.classList.remove(colorDragged);
                candyBeingReplaced.classList.add(colorReplaced);
            }, 300);
        }
    }
}

// Touch Handling (Mapping touch to drag logic)
let touchStartX, touchStartY;

function touchStart(e) {
    e.preventDefault();
    candyBeingDragged = this;
    squareIdBeingDragged = parseInt(this.id);
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function touchMove(e) {
    e.preventDefault();
}

function touchEnd(e) {
    let touchEndX = e.changedTouches[0].clientX;
    let touchEndY = e.changedTouches[0].clientY;
    
    let diffX = touchEndX - touchStartX;
    let diffY = touchEndY - touchStartY;
    
    let targetId = -1;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        // horizontal swipe
        if (diffX > 30) targetId = squareIdBeingDragged + 1;
        else if (diffX < -30) targetId = squareIdBeingDragged - 1;
    } else {
        // vertical swipe
        if (diffY > 30) targetId = squareIdBeingDragged + width;
        else if (diffY < -30) targetId = squareIdBeingDragged - width;
    }
    
    if (targetId >= 0 && targetId < 64) {
        candyBeingReplaced = document.getElementById(targetId);
        squareIdBeingReplaced = targetId;
        dragEnd();
    }
}

// Match Checking Logic
function checkMatches() {
    let matchFound = false;
    
    // Check Rows (Match 3)
    for (let i = 0; i < 62; i++) {
        let rowOfThree = [i, i+1, i+2];
        let decidedColor = getCandyColor(squares[i]);
        const isBlank = decidedColor === '';
        const notValid = [6, 7, 14, 15, 22, 23, 30, 31, 38, 39, 46, 47, 54, 55, 62, 63];
        if (notValid.includes(i)) continue;

        if (rowOfThree.every(index => getCandyColor(squares[index]) === decidedColor && !isBlank)) {
            matchFound = true;
            score += 30;
            rowOfThree.forEach(index => {
                squares[index].classList.add('crushing');
                setTimeout(() => {
                    squares[index].classList.remove(decidedColor, 'crushing');
                }, 300);
            });
        }
    }

    // Check Cols (Match 3)
    for (let i = 0; i < 48; i++) {
        let colOfThree = [i, i+width, i+width*2];
        let decidedColor = getCandyColor(squares[i]);
        const isBlank = decidedColor === '';

        if (colOfThree.every(index => getCandyColor(squares[index]) === decidedColor && !isBlank)) {
            matchFound = true;
            score += 30;
            colOfThree.forEach(index => {
                squares[index].classList.add('crushing');
                setTimeout(() => {
                    squares[index].classList.remove(decidedColor, 'crushing');
                }, 300);
            });
        }
    }
    
    if (matchFound) {
        scoreDisplay.innerText = score;
        setTimeout(moveDown, 300);
    }
    
    return matchFound;
}

// Gravity / Drop candies
function moveDown() {
    for (let i = 0; i < 56; i++) {
        if (getCandyColor(squares[i + width]) === '') {
            let color = getCandyColor(squares[i]);
            if(color !== '') {
                squares[i + width].classList.add(color);
                squares[i].classList.remove(color);
            }
        }
        
        // Generate new candies at top row
        const firstRow = [0, 1, 2, 3, 4, 5, 6, 7];
        const isFirstRow = firstRow.includes(i);
        if (isFirstRow && getCandyColor(squares[i]) === '') {
            let randomColor = Math.floor(Math.random() * candyColors.length);
            squares[i].classList.add(candyColors[randomColor]);
        }
    }
    
    // Recursive check after falling
    setTimeout(() => {
        if (checkMatches()) {
           // Will recursively call moveDown
        } else {
            // Fill completely any top row empties that slipped
            const firstRow = [0, 1, 2, 3, 4, 5, 6, 7];
            firstRow.forEach(idx => {
               if(getCandyColor(squares[idx]) === '') {
                   squares[idx].classList.add(candyColors[Math.floor(Math.random() * candyColors.length)]);
                   checkMatches();
               }
            });
        }
    }, 100);
}

// Start Game
startBtn.addEventListener('click', () => {
    startModal.classList.add('hidden');
    score = 0;
    scoreDisplay.innerText = score;
    createBoard();
    
    // Setup interval to continually check board integrity
    setInterval(moveDown, 500); 
});
