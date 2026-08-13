import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, SafeAreaView, Dimensions, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, Keyframe, FadeIn, FadeInUp, FadeOutUp } from 'react-native-reanimated';

const popOutAnimation = new Keyframe({
  0: { transform: [{ scale: 1 }], opacity: 1 },
  30: { transform: [{ scale: 1.2 }], opacity: 1 },
  100: { transform: [{ scale: 0 }], opacity: 0 },
}).duration(350);

const { width } = Dimensions.get('window');
const GAME_WIDTH = Math.min(width, 500);
const GRID_SIZE = 10;
const CELL_PADDING = 1;
const BOARD_PADDING = 4;
const CELL_SIZE = Math.floor((GAME_WIDTH - (BOARD_PADDING * 2)) / GRID_SIZE);
const TRAY_SCALE = 0.6;

// --- GAME LOGIC --- //
const SHAPES = [
  { shape: [[1]], color: '#FF3366', id: '1x1' },
  { shape: [[1,1]], color: '#00D0FF', id: '1x2' },
  { shape: [[1],[1]], color: '#00D0FF', id: '2x1' },
  { shape: [[1,1,1]], color: '#00FF66', id: '1x3' },
  { shape: [[1],[1],[1]], color: '#00FF66', id: '3x1' },
  { shape: [[1,1,1,1]], color: '#FF33FF', id: '1x4' },
  { shape: [[1],[1],[1],[1]], color: '#FF33FF', id: '4x1' },
  { shape: [[1,1,1,1,1]], color: '#33FFCC', id: '1x5' },
  { shape: [[1],[1],[1],[1],[1]], color: '#33FFCC', id: '5x1' },
  { shape: [[1,1],[1,1]], color: '#FFCC00', id: '2x2' },
  { shape: [[1,1,1],[1,1,1],[1,1,1]], color: '#FF9900', id: '3x3' },
  { shape: [[1,0],[1,1]], color: '#9933FF', id: 'L-small-1' },
  { shape: [[0,1],[1,1]], color: '#9933FF', id: 'L-small-2' },
  { shape: [[1,1],[1,0]], color: '#9933FF', id: 'L-small-3' },
  { shape: [[1,1],[0,1]], color: '#9933FF', id: 'L-small-4' },
  { shape: [[1,0,0],[1,0,0],[1,1,1]], color: '#FF5733', id: 'L-large-1' }, 
  { shape: [[1,1,1],[1,0,0],[1,0,0]], color: '#FF5733', id: 'L-large-2' }, 
  { shape: [[1,1,1],[0,0,1],[0,0,1]], color: '#FF5733', id: 'L-large-3' }, 
  { shape: [[0,0,1],[0,0,1],[1,1,1]], color: '#FF5733', id: 'L-large-4' }, 
  { shape: [[1,1,1],[0,1,0]], color: '#3366FF', id: 'T-up' },
  { shape: [[0,1,0],[1,1,1]], color: '#3366FF', id: 'T-down' },
  { shape: [[1,0],[1,1],[1,0]], color: '#3366FF', id: 'T-right' },
  { shape: [[0,1],[1,1],[0,1]], color: '#3366FF', id: 'T-left' },
  { shape: [[0,1,0],[1,1,1],[0,1,0]], color: '#FF3399', id: 'Plus' },
  { shape: [[1,1,0],[0,1,1]], color: '#CCFF33', id: 'Z-shape' },
  { shape: [[0,1,1],[1,1,0]], color: '#CCFF33', id: 'S-shape' },
];

const getRandomShapes = (level = 1) => {
  let availableShapes = [...SHAPES];
  if (level === 1) {
    availableShapes = SHAPES.filter(s => s.shape.flat().filter(Boolean).length <= 4 && s.id !== '1x4' && s.id !== '4x1');
  } else if (level === 2) {
    availableShapes = SHAPES.filter(s => s.id !== '1x5' && s.id !== '5x1' && s.id !== '3x3' && s.id !== 'Plus');
  }
  return [1, 2, 3].map(() => ({ ...availableShapes[Math.floor(Math.random() * availableShapes.length)] }));
};

const createEmptyGrid = () => Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
const getTargetScore = (level) => level * 1500;

// --- DRAGGABLE PIECE COMPONENT --- //
const DraggablePiece = ({ piece, index, onDrop, disabled }) => {
  const isDragging = useSharedValue(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(TRAY_SCALE);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    scale.value = TRAY_SCALE;
  }, [piece]);

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      isDragging.value = true;
      scale.value = withSpring(1.0, { damping: 15, stiffness: 200 });
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      isDragging.value = false;
      const tx = translateX.value;
      const ty = translateY.value;

      translateX.value = withSpring(0, { damping: 12, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 12, stiffness: 150 });
      scale.value = withSpring(TRAY_SCALE, { damping: 12, stiffness: 150 });

      runOnJS(onDrop)(piece, tx, ty, index);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    zIndex: isDragging.value ? 100 : 1,
  }));

  if (!piece) return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }, animatedStyle]}>
        <View style={{ flexDirection: 'column' }}>
          {piece.shape.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {row.map((cell, c) => (
                <View key={c} style={{
                  width: CELL_SIZE - CELL_PADDING * 2,
                  height: CELL_SIZE - CELL_PADDING * 2,
                  margin: CELL_PADDING,
                  backgroundColor: cell ? piece.color : 'transparent',
                  borderRadius: 4
                }} />
              ))}
            </View>
          ))}
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

// --- TRAY SLOT COMPONENT --- //
const TraySlot = ({ piece, index, onDrop, disabled }) => {
  const [slotPos, setSlotPos] = useState(null);
  const ref = useRef(null);

  const handlePieceDrop = (piece, tx, ty, index) => {
    if (!slotPos) return;
    const finalCenterX = slotPos.x + (slotPos.w / 2) + tx;
    const finalCenterY = slotPos.y + (slotPos.h / 2) + ty;
    onDrop(piece, finalCenterX, finalCenterY, index);
  };

  return (
    <View 
      ref={ref}
      onLayout={() => {
        ref.current?.measure((x, y, w, h, pX, pY) => setSlotPos({ x: pX, y: pY, w, h }));
      }}
      className="w-20 h-20 bg-black/20 rounded-xl relative"
    >
      <DraggablePiece piece={piece} index={index} onDrop={handlePieceDrop} disabled={disabled} />
    </View>
  );
};

// --- MAIN APP COMPONENT --- //
export default function App() {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [tray, setTray] = useState(getRandomShapes(1));
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  
  // Power-Ups and Fun State
  const [combo, setCombo] = useState(0);
  const [hammers, setHammers] = useState(2);
  const [rotates, setRotates] = useState(2);
  const [isHammerActive, setIsHammerActive] = useState(false);
  
  const [gridLayout, setGridLayout] = useState(null);
  const boardRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedHighScore = await AsyncStorage.getItem('block_high_score');
        const savedLevel = await AsyncStorage.getItem('block_level');
        const savedScore = await AsyncStorage.getItem('block_score');
        const savedGrid = await AsyncStorage.getItem('block_grid');
        const savedTray = await AsyncStorage.getItem('block_tray');
        const savedCombo = await AsyncStorage.getItem('block_combo');
        const savedHammers = await AsyncStorage.getItem('block_hammers');
        const savedRotates = await AsyncStorage.getItem('block_rotates');

        if (savedHighScore !== null) setHighScore(parseInt(savedHighScore, 10));
        if (savedLevel !== null) setLevel(parseInt(savedLevel, 10));
        if (savedScore !== null) setScore(parseInt(savedScore, 10));
        if (savedGrid !== null) setGrid(JSON.parse(savedGrid));
        
        if (savedTray !== null) {
          setTray(JSON.parse(savedTray));
        } else if (savedLevel !== null) {
          setTray(getRandomShapes(parseInt(savedLevel, 10)));
        }

        if (savedCombo !== null) setCombo(parseInt(savedCombo, 10));
        if (savedHammers !== null) setHammers(parseInt(savedHammers, 10));
        if (savedRotates !== null) setRotates(parseInt(savedRotates, 10));
      } catch (e) {
        console.error('Failed to load data', e);
      }
    };
    loadData();
  }, []);

  const saveGameState = async (newGrid, newTray, newScore, newCombo, newHammers, newRotates) => {
    try {
      await AsyncStorage.setItem('block_grid', JSON.stringify(newGrid));
      await AsyncStorage.setItem('block_tray', JSON.stringify(newTray));
      await AsyncStorage.setItem('block_score', newScore.toString());
      await AsyncStorage.setItem('block_combo', newCombo.toString());
      await AsyncStorage.setItem('block_hammers', newHammers.toString());
      await AsyncStorage.setItem('block_rotates', newRotates.toString());
    } catch (e) {
      console.error('Failed to save state', e);
    }
  };

  const saveLevel = async (newLevel) => {
    setLevel(newLevel);
    try {
      await AsyncStorage.setItem('block_level', newLevel.toString());
    } catch (e) {
      console.error('Failed to save level', e);
    }
  };

  const updateScore = async (newScore) => {
    setScore(newScore);
    if (newScore > highScore) {
      setHighScore(newScore);
      try {
        await AsyncStorage.setItem('block_high_score', newScore.toString());
      } catch (e) {
        console.error('Failed to save high score', e);
      }
    }
  };

  const canPlace = (currentGrid, piece, row, col) => {
    if (row < 0 || col < 0) return false;
    if (row + piece.shape.length > GRID_SIZE) return false;
    if (col + piece.shape[0].length > GRID_SIZE) return false;
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[0].length; c++) {
        if (piece.shape[r][c] && currentGrid[row + r][col + c]) return false;
      }
    }
    return true;
  };

  const checkLines = (currentGrid) => {
    let rowsToClear = [];
    let colsToClear = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      if (currentGrid[r].every(cell => cell !== null)) rowsToClear.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      let colFull = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (!currentGrid[r][c]) {
          colFull = false;
          break;
        }
      }
      if (colFull) colsToClear.push(c);
    }
    let cellsToClear = [];
    rowsToClear.forEach(r => {
      for (let c = 0; c < GRID_SIZE; c++) cellsToClear.push(`${r},${c}`);
    });
    colsToClear.forEach(c => {
      for (let r = 0; r < GRID_SIZE; r++) cellsToClear.push(`${r},${c}`);
    });
    return { 
      cellsToClear: [...new Set(cellsToClear)],
      linesCleared: rowsToClear.length + colsToClear.length 
    };
  };

  const handleDrop = (piece, absoluteCenterX, absoluteCenterY, index) => {
    if (!gridLayout || isHammerActive) return;

    const relativeCenterX = absoluteCenterX - gridLayout.x;
    const relativeCenterY = absoluteCenterY - gridLayout.y;
    const pieceWidth = piece.shape[0].length * CELL_SIZE;
    const pieceHeight = piece.shape.length * CELL_SIZE;
    const startX = relativeCenterX - (pieceWidth / 2);
    const startY = relativeCenterY - (pieceHeight / 2);

    let col = Math.round(startX / CELL_SIZE);
    let row = Math.round(startY / CELL_SIZE);

    const maxCol = GRID_SIZE - piece.shape[0].length;
    const maxRow = GRID_SIZE - piece.shape.length;
    if (col === -1) col = 0;
    if (col === maxCol + 1) col = maxCol;
    if (row === -1) row = 0;
    if (row === maxRow + 1) row = maxRow;

    if (canPlace(grid, piece, row, col)) {
      const newGrid = grid.map(r => [...r]);
      for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[0].length; c++) {
          if (piece.shape[r][c]) newGrid[row + r][col + c] = piece.color;
        }
      }

      const { cellsToClear, linesCleared } = checkLines(newGrid);
      const newTray = [...tray];
      newTray[index] = null;
      const finalTray = newTray.every(p => p === null) ? getRandomShapes(level) : newTray;
      
      const newCombo = linesCleared > 0 ? combo + 1 : 0;
      setCombo(newCombo);
      const comboMultiplier = newCombo > 0 ? newCombo : 1;
      
      let baseScore = score + (piece.shape.flat().filter(Boolean).length * 10);
      setTray(finalTray);

      const checkLevelUp = (finalScore, currentGrid, currentTray) => {
        if (finalScore >= getTargetScore(level)) {
          setShowLevelUp(true);
          saveGameState(currentGrid, currentTray, finalScore, newCombo, hammers, rotates);
          
          setTimeout(() => {
            const emptyGrid = createEmptyGrid();
            const nextLevel = level + 1;
            const freshTray = getRandomShapes(nextLevel);
            // Give 1 hammer and 1 rotate power on level up!
            const nextHammers = hammers + 1;
            const nextRotates = rotates + 1;
            
            setGrid(emptyGrid);
            saveLevel(nextLevel);
            setTray(freshTray);
            setHammers(nextHammers);
            setRotates(nextRotates);
            setShowLevelUp(false);
            
            saveGameState(emptyGrid, freshTray, finalScore, newCombo, nextHammers, nextRotates);
          }, 2500);
          return true;
        }
        return false;
      };

      if (cellsToClear.length > 0) {
        cellsToClear.forEach(pos => {
          const [rr, cc] = pos.split(',').map(Number);
          newGrid[rr][cc] = null;
        });
        setGrid(newGrid);
        
        const finalScore = baseScore + (linesCleared * 100 * comboMultiplier);
        updateScore(finalScore);
        
        setTimeout(() => {
          if (!checkLevelUp(finalScore, newGrid, finalTray)) {
            checkGameOver(newGrid, finalTray);
            saveGameState(newGrid, finalTray, finalScore, newCombo, hammers, rotates);
          }
        }, 50);
      } else {
        setGrid(newGrid);
        updateScore(baseScore);
        if (!checkLevelUp(baseScore, newGrid, finalTray)) {
          checkGameOver(newGrid, finalTray);
          saveGameState(newGrid, finalTray, baseScore, newCombo, hammers, rotates);
        }
      }
    }
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
      // Check if they can save themselves with powers
      if (hammers === 0 && rotates === 0) {
        setGameOver(true);
      }
    }
  };

  const handleHammer = (r, c) => {
    if (!isHammerActive || !grid[r][c]) return;
    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = null;
    
    setGrid(newGrid);
    setHammers(h => h - 1);
    setIsHammerActive(false);
    
    // Save state
    setTimeout(() => {
      checkGameOver(newGrid, tray);
      saveGameState(newGrid, tray, score, combo, hammers - 1, rotates);
    }, 50);
  };

  const handleRotatePower = () => {
    if (rotates <= 0) return;
    
    const newTray = tray.map(piece => {
      if (!piece) return null;
      const shape = piece.shape;
      const rows = shape.length;
      const cols = shape[0].length;
      const newShape = Array(cols).fill().map(() => Array(rows).fill(0));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          newShape[c][rows - 1 - r] = shape[r][c];
        }
      }
      return { ...piece, shape: newShape };
    });
    
    setTray(newTray);
    setRotates(r => r - 1);
    
    setTimeout(() => {
      checkGameOver(grid, newTray);
      saveGameState(grid, newTray, score, combo, hammers, rotates - 1);
    }, 50);
  };

  return (
    <GestureHandlerRootView className="flex-1 bg-[#1A1A2E]">
      <SafeAreaView className="flex-1 items-center py-10">
        <StatusBar style="light" />
        
        {/* Header */}
        <View className="mb-6 w-full px-8">
          <View className="flex-row justify-between items-end mb-4">
            <View>
              <Text className="text-white/60 font-bold text-sm tracking-widest mb-1">LEVEL {level}</Text>
              <Text className="text-[#00D0FF] font-black text-5xl">{score}</Text>
            </View>
            <View className="items-end">
              <Text className="text-white/60 font-bold text-sm tracking-widest mb-1">HIGH SCORE</Text>
              <Text className="text-[#FFCC00] font-bold text-3xl">{highScore}</Text>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View className="w-full h-3 bg-black/40 rounded-full overflow-hidden">
            <View 
              style={{ width: `${Math.min(100, Math.max(0, ((score - (level > 1 ? getTargetScore(level - 1) : 0)) / 1500) * 100))}%` }} 
              className="h-full bg-gradient-to-r bg-[#00FF66] rounded-full"
            />
          </View>
          <Text className="text-white/40 text-xs text-right mt-1 font-mono">TARGET: {getTargetScore(level)}</Text>
        </View>

        {/* Game Board */}
        <View className="relative items-center justify-center">
          {combo > 1 && (
            <Animated.Text 
              key={`combo-${combo}`}
              entering={FadeInUp.duration(400).springify()}
              exiting={FadeOutUp.duration(300)}
              className="absolute z-50 text-5xl font-black text-center"
              style={{ color: '#FF3366', textShadowColor: '#FFCC00', textShadowRadius: 15 }}
            >
              COMBO x{combo}!
            </Animated.Text>
          )}

          <View 
            ref={boardRef}
            onLayout={() => {
              boardRef.current?.measure((x, y, w, h, pX, pY) => setGridLayout({ x: pX, y: pY, w, h }));
            }}
            style={{ width: GAME_WIDTH, height: GAME_WIDTH, padding: BOARD_PADDING }}
            className={`bg-[#2A2A3D] rounded-xl flex-col ${isHammerActive ? 'border-2 border-[#FF3366]' : ''}`}
          >
            {grid.map((row, r) => (
              <View key={r} className="flex-row">
                {row.map((cell, c) => (
                  <TouchableOpacity 
                    key={c} 
                    activeOpacity={isHammerActive && cell ? 0.5 : 1}
                    onPress={() => handleHammer(r, c)}
                    style={{
                      width: CELL_SIZE - CELL_PADDING * 2,
                      height: CELL_SIZE - CELL_PADDING * 2,
                      margin: CELL_PADDING,
                      backgroundColor: '#16213E',
                      borderRadius: 4,
                    }} 
                  >
                    {cell && (
                      <Animated.View
                        exiting={popOutAnimation}
                        style={{ width: '100%', height: '100%', backgroundColor: cell, borderRadius: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Power Ups */}
        <View className="flex-row w-11/12 max-w-md justify-between mt-6 px-4">
          <TouchableOpacity 
            className={`flex-row items-center px-4 py-3 rounded-full ${isHammerActive ? 'bg-[#FF3366]' : 'bg-[#2A2A3D]'} ${hammers === 0 ? 'opacity-50' : ''}`}
            onPress={() => hammers > 0 && setIsHammerActive(!isHammerActive)}
            disabled={hammers === 0}
          >
            <Text className="text-white font-bold text-lg mr-2">🔨 Hammer</Text>
            <View className="bg-black/50 px-2 py-1 rounded-full"><Text className="text-white font-mono">{hammers}</Text></View>
          </TouchableOpacity>

          <TouchableOpacity 
            className={`flex-row items-center px-4 py-3 rounded-full bg-[#2A2A3D] ${rotates === 0 ? 'opacity-50' : ''}`}
            onPress={handleRotatePower}
            disabled={rotates === 0 || isHammerActive}
          >
            <Text className="text-white font-bold text-lg mr-2">🔄 Rotate</Text>
            <View className="bg-black/50 px-2 py-1 rounded-full"><Text className="text-white font-mono">{rotates}</Text></View>
          </TouchableOpacity>
        </View>

        {/* Tray */}
        <View className="flex-row mt-6 bg-[#2A2A3D] p-6 rounded-2xl w-11/12 max-w-md justify-between shadow-2xl">
          {tray.map((piece, i) => (
            <TraySlot key={i} piece={piece} index={i} onDrop={handleDrop} disabled={isHammerActive} />
          ))}
        </View>

        {/* Game Over Modal */}
        <Modal visible={gameOver} transparent animationType="fade">
          <View className="flex-1 bg-black/80 justify-center items-center">
            <View className="bg-[#2A2A3D] p-10 rounded-3xl items-center border-2 border-[#4A4A6D]">
              <Text className="text-[#FF3366] text-5xl font-extrabold mb-4">GAME OVER!</Text>
              <Text className="text-white text-3xl font-mono mb-2">Score: {score}</Text>
              <Text className="text-[#FFCC00] text-xl font-bold mb-8">Best: {highScore}</Text>
              <TouchableOpacity 
                className="bg-[#00D0FF] px-10 py-4 rounded-full shadow-lg"
                onPress={() => {
                  const emptyGrid = createEmptyGrid();
                  const freshTray = getRandomShapes(level);
                  const startingScore = level > 1 ? getTargetScore(level - 1) : 0;
                  
                  setGrid(emptyGrid);
                  setTray(freshTray);
                  setScore(startingScore);
                  setCombo(0);
                  setHammers(2); // Reset powers on death
                  setRotates(2);
                  setGameOver(false);
                  
                  saveGameState(emptyGrid, freshTray, startingScore, 0, 2, 2);
                }}
              >
                <Text className="text-white text-xl font-bold">RETRY LEVEL {level}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Level Up Modal */}
        <Modal visible={showLevelUp} transparent animationType="fade">
          <View className="flex-1 bg-[#1A1A2E]/90 justify-center items-center">
            <Animated.View entering={FadeIn.duration(500)} className="items-center">
              <Text className="text-[#00FF66] text-6xl font-black mb-4">LEVEL UP!</Text>
              <Text className="text-white text-2xl font-mono mb-2">Level {level + 1} Starting...</Text>
              <Text className="text-[#00D0FF] font-bold">+1 Hammer  |  +1 Rotate</Text>
            </Animated.View>
          </View>
        </Modal>
        
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
