import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, PanResponder, Animated, Dimensions, Alert } from 'react-native';

const { width } = Dimensions.get('window');
const CELL_SIZE = Math.floor((width - 40) / 10);
const GRID_SIZE = 10;

// Block Shapes Catalog
const SHAPES = [
  { shape: [[1]], color: '#FF3366' }, // 1x1
  { shape: [[1,1],[1,1]], color: '#33CCFF' }, // 2x2
  { shape: [[1,1,1],[1,1,1],[1,1,1]], color: '#FFCC00' }, // 3x3
  { shape: [[1,1]], color: '#33FF66' }, // 1x2
  { shape: [[1,1,1]], color: '#33FF66' }, // 1x3
  { shape: [[1,1,1,1]], color: '#33FF66' }, // 1x4
  { shape: [[1,1,1,1,1]], color: '#33FF66' }, // 1x5
  { shape: [[1],[1]], color: '#9933FF' }, // 2x1
  { shape: [[1],[1],[1]], color: '#9933FF' }, // 3x1
  { shape: [[1],[1],[1],[1]], color: '#9933FF' }, // 4x1
  { shape: [[1],[1],[1],[1],[1]], color: '#9933FF' }, // 5x1
  { shape: [[1,0],[1,1]], color: '#FF9933' }, // Small L 1
  { shape: [[1,1],[1,0]], color: '#FF9933' }, // Small L 2
  { shape: [[1,1],[0,1]], color: '#FF9933' }, // Small L 3
  { shape: [[0,1],[1,1]], color: '#FF9933' }, // Small L 4
  { shape: [[1,0,0],[1,0,0],[1,1,1]], color: '#FF00CC' }, // Big L 1
  { shape: [[1,1,1],[1,0,0],[1,0,0]], color: '#FF00CC' }, // Big L 2
];

function createEmptyGrid() {
  return Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(null));
}

function getRandomShapes() {
  return [0,1,2].map(() => SHAPES[Math.floor(Math.random() * SHAPES.length)]);
}

// Draggable Piece Component
const DraggablePiece = ({ piece, onDrop, index }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(0.6)).current; // scaled down in tray
  const opacity = useRef(new Animated.Value(1)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
        Animated.spring(scale, { toValue: 1, useNativeDriver: false }).start(); // pop up
        opacity.setValue(0.8);
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gesture) => {
        pan.flattenOffset();
        opacity.setValue(1);
        
        onDrop(piece, gesture, index, () => {
          // Success: hide it
          pan.setValue({ x: 10000, y: 10000 }); 
        }, () => {
          // Fail: spring back to tray
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          Animated.spring(scale, { toValue: 0.6, useNativeDriver: false }).start();
        });
      },
    })
  ).current;

  if (!piece) return <View style={styles.emptyTraySlot} />;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        pan.getLayout(),
        { transform: [{ scale }], opacity },
        styles.pieceWrapper
      ]}
    >
      {piece.shape.map((row, r) => (
        <View key={r} style={styles.pieceRow}>
          {row.map((cell, c) => (
            <View key={c} style={[
              styles.cell, 
              cell ? { backgroundColor: piece.color, borderColor: 'rgba(0,0,0,0.3)' } : { backgroundColor: 'transparent', borderWidth: 0 }
            ]} />
          ))}
        </View>
      ))}
    </Animated.View>
  );
};

export default function App() {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [tray, setTray] = useState(getRandomShapes());
  const [score, setScore] = useState(0);
  const [gridLayout, setGridLayout] = useState(null);

  const onDrop = (piece, gesture, index, onSuccess, onFail) => {
    if (!gridLayout) return onFail();

    // Absolute touch coordinates
    const dropX = gesture.moveX;
    const dropY = gesture.moveY;

    // Relative to the grid
    const relativeX = dropX - gridLayout.x;
    const relativeY = dropY - gridLayout.y;

    const pieceWidth = piece.shape[0].length * CELL_SIZE;
    const pieceHeight = piece.shape.length * CELL_SIZE;
    
    // Finger is roughly at the center of the piece, but slightly below due to offset
    const startX = relativeX - (pieceWidth / 2);
    const startY = relativeY - (pieceHeight / 2) - 40; // Offset so user sees the block

    const col = Math.round(startX / CELL_SIZE);
    const row = Math.round(startY / CELL_SIZE);

    if (canPlace(grid, piece, row, col)) {
      placePiece(piece, row, col, index);
      onSuccess();
    } else {
      onFail();
    }
  };

  const canPlace = (currentGrid, piece, row, col) => {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const targetRow = row + r;
          const targetCol = col + c;
          
          if (
            targetRow < 0 || targetRow >= GRID_SIZE ||
            targetCol < 0 || targetCol >= GRID_SIZE ||
            currentGrid[targetRow][targetCol] !== null
          ) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const placePiece = (piece, row, col, index) => {
    let gridCopy = JSON.parse(JSON.stringify(grid));
    let blocksPlaced = 0;
    
    // Place block
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          gridCopy[row + r][col + c] = piece.color;
          blocksPlaced++;
        }
      }
    }

    // Check for full lines (Rows & Cols)
    let fullRows = [];
    let fullCols = [];
    
    for (let r = 0; r < GRID_SIZE; r++) {
      if (gridCopy[r].every(cell => cell !== null)) fullRows.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      let full = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (gridCopy[r][c] === null) { full = false; break; }
      }
      if (full) fullCols.push(c);
    }
    
    // Clear lines
    fullRows.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) gridCopy[r][c] = null; });
    fullCols.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) gridCopy[r][c] = null; });
    
    let linesCleared = fullRows.length + fullCols.length;
    let comboScore = linesCleared > 0 ? (linesCleared * 10 * linesCleared) : 0;
    
    setGrid(gridCopy);
    setScore(prev => prev + blocksPlaced + comboScore);
    
    // Update tray
    let newTray = [...tray];
    newTray[index] = null;
    
    // Refill tray if empty
    if (newTray.every(p => p === null)) {
      newTray = getRandomShapes();
      setTray(newTray);
    } else {
      setTray(newTray);
    }
    
    // Check Game Over condition
    setTimeout(() => checkGameOver(gridCopy, newTray), 200);
  };

  const checkGameOver = (currentGrid, currentTray) => {
    let canPlaceAny = false;
    
    for (let p of currentTray) {
      if (!p) continue;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (canPlace(currentGrid, p, r, c)) {
            canPlaceAny = true;
            break;
          }
        }
        if (canPlaceAny) break;
      }
      if (canPlaceAny) break;
    }
    
    if (!canPlaceAny) {
      Alert.alert("GAME OVER!", `Outstanding effort! Final Score: ${score}`, [
        { text: "PLAY AGAIN", onPress: () => {
          setGrid(createEmptyGrid());
          setTray(getRandomShapes());
          setScore(0);
        }}
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BLOCK PUZZLE</Text>
        <Text style={styles.score}>{score}</Text>
      </View>
      
      <View 
        style={styles.grid}
        onLayout={(e) => {
          // Get absolute position of grid for hit-detection
          e.target.measure((x, y, width, height, pageX, pageY) => {
            setGridLayout({ x: pageX, y: pageY, width, height });
          });
        }}
      >
        {grid.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((cell, c) => (
              <View key={c} style={[
                styles.cell, 
                cell ? { backgroundColor: cell, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 2 } : null
              ]} />
            ))}
          </View>
        ))}
      </View>
      
      <View style={styles.tray}>
        {tray.map((piece, i) => (
          <View key={i} style={styles.traySlot}>
             <DraggablePiece piece={piece} index={i} onDrop={onDrop} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2C', // Deep premium dark background
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 50,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00f2fe',
    textShadowColor: 'rgba(0, 242, 254, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginTop: 10,
  },
  grid: {
    backgroundColor: '#2A2A3D',
    padding: 3,
    borderRadius: 8,
    elevation: 10, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#3E3E5C',
    borderWidth: 1,
    borderColor: '#2A2A3D',
    borderRadius: 6,
    margin: 1,
  },
  tray: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    height: 140,
    alignItems: 'center',
  },
  traySlot: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTraySlot: {
    width: 60,
    height: 60,
  },
  pieceWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  pieceRow: {
    flexDirection: 'row',
  }
});
