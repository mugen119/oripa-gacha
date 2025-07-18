import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const symbols = ["🍒", "🍋", "🍊", "🍇", "⭐️", "7", "💎"];
const reelsCount = 3;
const rowsCount = 3;

// 横揃い、縦揃い、斜め揃いのペイライン（col, row）
const payLines = [
  // 横揃い
  [[0, 0], [1, 0], [2, 0]], // 上段横
  [[0, 1], [1, 1], [2, 1]], // 中段横
  [[0, 2], [1, 2], [2, 2]], // 下段横
  // 縦揃いを追加するなら
  [[0, 0], [0, 1], [0, 2]], // 左列縦
  [[1, 0], [1, 1], [1, 2]], // 中央列縦
  [[2, 0], [2, 1], [2, 2]], // 右列縦
  // 斜め揃い
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]],
];


const payoutMultiplier = {
  "🍒": 1.2,
  "🍋": 2,
  "🍊": 3,
  "🍇": 5,
  "⭐️": 30,
  "7": 100,
  "💎": 10,
  "SUPER7": 1000,
};

function randomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

// 全ペイラインをチェックして当たりを判定する関数
function checkWin(grid) {
  for (const line of payLines) {
    const [a, b, c] = line;
    const symA = grid[a[0]][a[1]];
    if (symA === null) continue;
    if (
      symA === grid[b[0]][b[1]] &&
      symA === grid[c[0]][c[1]]
    ) {
      return { win: true, symbol: symA, line };
    }
  }
  return { win: false };
}

function checkSuperJackpot(grid) {
  for (let col = 0; col < reelsCount; col++) {
    for (let row = 0; row < rowsCount; row++) {
      if (grid[col][row] !== "7") return false;
    }
  }
  return true;
}

function LcdMessage({ children, show, isLose }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="lcd"
          initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-8 rounded-lg border-4 border-green-500 shadow-[0_0_20px_#0f0]"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: "900",
            fontSize: isLose ? "1.2rem" : "2rem",
            color: "#aaffaa",
            textShadow:
              "0 0 8px #0f0, 0 0 20px #0f0, 0 0 30px #0f0, 0 0 40px #0f0",
            letterSpacing: "0.15em",
            userSelect: "none",
            padding: isLose ? "0.5rem 1.5rem" : "1.25rem 2.5rem",
            background: "linear-gradient(145deg, #064006, #0a7a0a)",
          }}
        >
          {children}
          <span
            className="ml-3 animate-pulse"
            style={{ color: "#0f0", fontWeight: "bold" }}
          >
            ▒▒▒
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function VvvSlotMachine() {
  const [grid, setGrid] = useState(
    Array(reelsCount)
      .fill(null)
      .map(() => Array(rowsCount).fill(null))
  );
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [highlightLine, setHighlightLine] = useState(null);

  const [isKakuhen, setIsKakuhen] = useState(false);
  const [kakuhenSpinsLeft, setKakuhenSpinsLeft] = useState(0);

  const isJackpot = result?.win && result.symbol === "7";
  const isSuperJackpot = result?.win && result.symbol === "SUPER7";

  const [coins, setCoins] = useState(1000);
  const [displayCoins, setDisplayCoins] = useState(coins);

  const betOptions = [10, 50, 100, 200, 500, 1000, 10000, 100000];
  const [betCoins, setBetCoins] = useState(50);

  const [comboCount, setComboCount] = useState(0);

  const [freeSpins, setFreeSpins] = useState(0);

  const winAudioRef = useRef(null);
  const jackpotAudioRef = useRef(null);
  const superJackpotAudioRef = useRef(null);
  const spinAudioRef = useRef(null);
  const lineAudioRef = useRef(null);

  useEffect(() => {
    if (coins === displayCoins) return;

    let animationFrameId;
    const duration = 1500;
    const startTime = performance.now();
    const startCoins = displayCoins;
    const targetCoins = coins;

    const animate = (time) => {
      const elapsed = time - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const current = Math.round(
          startCoins + (targetCoins - startCoins) * progress
        );
        setDisplayCoins(current);
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayCoins(targetCoins);
      }
    };
    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [coins, displayCoins]);

  const startSpin = (isFreeSpin = false) => {
    if (spinning) return;
    if (coins < betCoins && !isFreeSpin) {
      alert("コインが足りません！");
      return;
    }

    setSpinning(true);
    setResult(null);
    setHighlightLine(null);

    if (spinAudioRef.current) spinAudioRef.current.play();

    if (!isFreeSpin) {
      setCoins((c) => Math.max(0, c - betCoins));
      setDisplayCoins((c) => Math.max(0, c - betCoins));
    }

    let frames = 0;
    const maxFrames = 30;

    const intervalId = setInterval(() => {
      frames++;
      setGrid(
        Array(reelsCount)
          .fill(null)
          .map(() =>
            Array(rowsCount)
              .fill(null)
              .map(() => randomSymbol())
          )
      );

      if (frames >= maxFrames) {
        clearInterval(intervalId);

        const finalGrid = Array(reelsCount)
          .fill(null)
          .map(() =>
            Array(rowsCount)
              .fill(null)
              .map(() => randomSymbol())
          );

        let res = null;

        if (isKakuhen) {
          if (Math.random() < 1 / 20) {
            for (let col = 0; col < reelsCount; col++) {
              for (let row = 0; row < rowsCount; row++) {
                finalGrid[col][row] = "7";
              }
            }
            res = { win: true, symbol: "SUPER7", line: null };
          } else {
            if (Math.random() < 1 / 1.5) {
              const cherryLine = payLines[Math.floor(Math.random() * payLines.length)];
              for (const [col, row] of cherryLine) {
                finalGrid[col][row] = "🍒";
              }
              res = { win: true, symbol: "🍒", line: cherryLine };
            } else {
              res = checkWin(finalGrid);
            }
          }

          setKakuhenSpinsLeft((prev) => {
            if (prev <= 1) {
              setIsKakuhen(false);
              return 0;
            }
            return prev - 1;
          });
        } else {
          res = checkWin(finalGrid);
          if (!res.win && Math.random() < 0.2) {
            const cherryLine = payLines[Math.floor(Math.random() * payLines.length)];
            for (const [col, row] of cherryLine) {
              finalGrid[col][row] = "🍒";
            }
            res = { win: true, symbol: "🍒", line: cherryLine };
          }
        }

        if (!isKakuhen && res.win && res.symbol === "💎") {
          setIsKakuhen(true);
          setKakuhenSpinsLeft(10);
        }

        setGrid(finalGrid);
        setResult(res);

        if (res.win) {
          if (res.symbol === "SUPER7") {
            setHighlightLine(null);
            if (superJackpotAudioRef.current) superJackpotAudioRef.current.play();
            setComboCount(0);
            const baseReward = betCoins * payoutMultiplier["7"] * 50;
            setCoins((c) => c + baseReward);
          } else {
            setHighlightLine(res.line);
            if (lineAudioRef.current) lineAudioRef.current.play();

            setComboCount((prev) => prev + 1);

            const comboMultiplier = Math.min(comboCount + 1, 5);
            const multiplier = payoutMultiplier[res.symbol] ?? 1;
            const baseReward = betCoins * multiplier * comboMultiplier;
            setCoins((c) => c + baseReward);

            if (res.symbol === "🍒") {
              setFreeSpins((prev) => prev + 1);
            }
          }
        } else {
          setComboCount(0);
        }

        setSpinning(false);
      }
    }, 50);
  };

  const startFreeSpin = () => {
    if (freeSpins <= 0) return;
    startSpin(true);
    setFreeSpins((prev) => prev - 1);
  };

  useEffect(() => {
    if (result?.win) {
      if (isSuperJackpot) {
        superJackpotAudioRef.current?.play();
      } else if (isJackpot) {
        jackpotAudioRef.current?.play();
      } else {
        winAudioRef.current?.play();
      }
    }
  }, [result, isJackpot, isSuperJackpot]);

  return (
    <div
      className={`relative min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-8 text-white font-mono select-none overflow-hidden`}
    >
      <h1 className="text-5xl font-extrabold mb-8 tracking-widest text-red-600 drop-shadow-[0_0_10px_red]">
        スロット
      </h1>

      <motion.div
        className="mb-6 px-8 py-3 bg-gradient-to-r from-yellow-400 via-red-600 to-pink-700 rounded-xl text-black text-3xl font-extrabold shadow-[0_0_20px_red]"
        key={displayCoins}
        initial={{ scale: 0.9, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        Coins: {displayCoins.toLocaleString()}
      </motion.div>

      <motion.button
        onClick={() => {
          setBetCoins((prev) => {
            const currentIndex = betOptions.indexOf(prev);
            const nextIndex = (currentIndex + 1) % betOptions.length;
            return betOptions[nextIndex];
          });
        }}
        whileHover={{ scale: isKakuhen ? 1 : 1.05, boxShadow: isKakuhen ? "none" : "0 0 15px 4px #f59e0b" }}
        whileTap={{ scale: isKakuhen ? 1 : 0.9 }}
        className={`mb-6 px-5 py-2 rounded-lg ${
          isKakuhen
            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-yellow-400 via-red-600 to-pink-700 text-black shadow-[0_0_20px_red]"
        } text-lg font-extrabold cursor-pointer select-none`}
        aria-label="ベットコイン数切替ボタン"
        disabled={isKakuhen}
      >
        ベットコイン数: {betCoins.toLocaleString()} 🪙
      </motion.button>

      <div
        className={`relative grid grid-cols-3 gap-6 p-6 rounded-xl shadow-[0_0_30px_red] border-4 ${
          isKakuhen ? "bg-purple-900 border-purple-600" : "bg-black/90 border-red-700"
        }`}
      >
        {Array(reelsCount)
          .fill(null)
          .map((_, col) =>
            Array(rowsCount)
              .fill(null)
              .map((_, row) => {
                // highlightLineがあるか、またはスーパージャックポットなら全セル光る
                const isHighlighted =
                  (highlightLine &&
                    highlightLine.some(([c, r]) => c === col && r === row)) ||
                  isSuperJackpot;

                return (
                  <motion.div
                    key={`${col}-${row}`}
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 100,
                      damping: 10,
                      delay: (col * rowsCount + row) * 0.05,
                    }}
                    className={`w-24 h-24 flex items-center justify-center text-6xl font-extrabold border-2 rounded-md relative overflow-hidden ${
                      isHighlighted
                        ? "bg-yellow-400 text-black shadow-[0_0_20px_5px_yellow] animate-pulse"
                        : isKakuhen
                        ? "bg-purple-700 text-white shadow-[0_0_20px_#9f7aea]"
                        : "bg-gradient-to-br from-gray-800 to-gray-900 text-red-600"
                    }`}
                    style={{
                      filter: isHighlighted
                        ? "drop-shadow(0 0 10px yellow)"
                        : isKakuhen
                        ? "drop-shadow(0 0 6px #a78bfa)"
                        : "drop-shadow(0 0 4px red)",
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-red-700 mix-blend-screen pointer-events-none"
                      style={{ clipPath: "inset(10% 0 85% 0)" }}
                      animate={{
                        x: ["0%", "-3%", "2%", "0%"],
                        y: ["0%", "2%", "-2%", "0%"],
                      }}
                      transition={{ repeat: Infinity, duration: 0.15, ease: "easeInOut" }}
                    />
                    {grid[col]?.[row] ?? "❓"}
                  </motion.div>
                );
              })
          )}
      </div>

      {/* highlightLineがあるときのみライン表示。ただしスーパージャックポット時はライン非表示 */}
      {highlightLine && !isSuperJackpot && (
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 10 }}
        >



          <line
            x1={`${(highlightLine[0][1] + 0.5) * (100 / rowsCount)}%`}
            y1={`${(highlightLine[0][0] + 0.5) * (100 / reelsCount)}%`}
            x2={`${(highlightLine[2][1] + 0.5) * (100 / rowsCount)}%`}
            y2={`${(highlightLine[2][0] + 0.5) * (100 / reelsCount)}%`}
            stroke="yellow"
            strokeWidth="5"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 8px yellow)" }}
          >





            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="1000"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </line>
        </svg>
      )}

      <div className="flex gap-4 mt-12">
        <motion.button
          onClick={() => startSpin(false)}
          disabled={spinning || coins < betCoins || freeSpins > 0 || (isKakuhen && spinning)}
          whileHover={{
            scale:
              spinning || coins < betCoins || freeSpins > 0 || (isKakuhen && spinning)
                ? 1
                : 1.05,
            boxShadow:
              spinning || coins < betCoins || freeSpins > 0 || (isKakuhen && spinning)
                ? "none"
                : "0 0 12px 4px #f59e0b",
          }}
          whileTap={{
            scale:
              spinning || coins < betCoins || freeSpins > 0 || (isKakuhen && spinning)
                ? 1
                : 0.9,
          }}
          className={`px-12 py-4 font-extrabold text-2xl rounded-xl text-black ${
            spinning || coins < betCoins || freeSpins > 0 || (isKakuhen && spinning)
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-gradient-to-r from-yellow-400 via-red-600 to-pink-700 shadow-[0_0_20px_red] hover:brightness-110 transition duration-300"
          }`}
        >
          {spinning
            ? "回転中..."
            : coins < betCoins
            ? "コインが足りません"
            : freeSpins > 0
            ? "通常スピン不可"
            : isKakuhen
            ? `確変中 (${kakuhenSpinsLeft}回転残り)`
            : "START"}
        </motion.button>

        {freeSpins > 0 && (
          <motion.button
            onClick={startFreeSpin}
            disabled={spinning}
            whileHover={{ scale: spinning ? 1 : 1.05, boxShadow: spinning ? "none" : "0 0 20px 6px #fbbf24" }}
            whileTap={{ scale: spinning ? 1 : 0.9 }}
            className={`px-12 py-4 font-extrabold text-2xl rounded-xl text-yellow-900 bg-gradient-to-r from-yellow-400 to-orange-500 shadow-[0_0_30px_#fbbf24] ${
              spinning ? "cursor-not-allowed bg-yellow-300" : "cursor-pointer"
            } animate-pulse`}
          >
            FREE ({freeSpins})
          </motion.button>
        )}
      </div>

      <div className="mt-6 space-y-2 text-center">
        {comboCount > 0 && <div>🔥 コンボ: {comboCount}</div>}
        {freeSpins > 0 && <div>🎰 Freeスピン残り: {freeSpins}</div>}
      </div>

      <LcdMessage show={!!result} isLose={result && !result.win}>
        {result?.win
          ? isSuperJackpot
            ? "SUPER JACKPOT!!"
            : isJackpot
            ? "JACKPOT!!"
            : `WIN! ${result.symbol} が揃いました！`
          : "残念、ハズレです！"}
      </LcdMessage>

      {/* 音声 */}

      <audio
        ref={spinAudioRef}
        src="https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg"
        preload="auto"
      />
      <audio
        ref={winAudioRef}
        src="https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg"
        preload="auto"
      />
      <audio
        ref={jackpotAudioRef}
        src="https://actions.google.com/sounds/v1/cartoon/clang.ogg"
        preload="auto"
      />
      <audio
        ref={superJackpotAudioRef}
        src="https://actions.google.com/sounds/v1/cartoon/cowbell.ogg"
        preload="auto"
      />
      <audio
        ref={lineAudioRef}
        src="https://actions.google.com/sounds/v1/cartoon/boing.ogg"
        preload="auto"
      />

    </div>
  );
}
