import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const symbols = ["🍒", "🍋", "🍊", "🍇", "⭐️", "7", "💎"];
const reelsCount = 3;
const rowsCount = 3;
const payLines = [
  [[0, 0], [1, 0], [2, 0]],
  [[0, 1], [1, 1], [2, 1]],
  [[0, 2], [1, 2], [2, 2]],
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]],
];

const payoutMultiplier = {
  "🍒": 1.2,
  "🍋": 1.5,
  "🍊": 2,
  "🍇": 5,
  "⭐️": 10,
  "7": 100,
  "💎": 30,
};

function randomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function checkWin(grid) {
  for (const line of payLines) {
    const [a, b, c] = line;
    const symA = grid[a[0]][a[1]];
    if (symA === null) continue;
    if (symA === grid[b[0]][b[1]] && symA === grid[c[0]][c[1]]) {
      return { win: true, symbol: symA, line };
    }
  }
  return { win: false };
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
            background:
              "linear-gradient(145deg, #064006, #0a7a0a)",
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
  const isJackpot = result?.win && result.symbol === "7";

  // コイン管理
  const [coins, setCoins] = useState(1000);
  const [displayCoins, setDisplayCoins] = useState(coins);

  // ベットコイン数配列と状態
  const betOptions = [10, 20, 50, 100, 200, 500, 1000];
  const [betCoins, setBetCoins] = useState(50);

  // コンボ・連続勝利
  const [comboCount, setComboCount] = useState(0);

  // Freeスピン残数
  const [freeSpins, setFreeSpins] = useState(0);

  // 音声リファレンス
  const winAudioRef = useRef(null);
  const jackpotAudioRef = useRef(null);
  const spinAudioRef = useRef(null);
  const lineAudioRef = useRef(null);

  // コインアニメーション用
  useEffect(() => {
    if (!result) return;

    let animationFrameId;
    const duration = 1500;
    const startTime = performance.now();
    const startCoins = displayCoins;
    let targetCoins = coins;

    if (result.win) {
      // 当たったシンボルの倍率を取得（なければ1）
      const multiplier = payoutMultiplier[result.symbol] ?? 1;

      // ベットコイン × 倍率を基本報酬に
      let baseReward = betCoins * multiplier;

      // コンボボーナス（最大5倍）
      const comboMultiplier = Math.min(comboCount, 5);
      baseReward *= comboMultiplier;

      targetCoins = coins + baseReward;
      setCoins(targetCoins);
    } else {
      targetCoins = coins;
    }

    const animate = (time) => {
      const elapsed = time - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const current = Math.round(startCoins + (targetCoins - startCoins) * progress);
        setDisplayCoins(current);
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayCoins(targetCoins);
      }
    };
    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [result]);

  // Freeスピン発動時は自動的にスピン
  useEffect(() => {
    if (freeSpins > 0 && !spinning) {
      setFreeSpins(freeSpins - 1);
      startSpin(true);
    }
  }, [freeSpins, spinning]);

  // スピン開始
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
        setGrid(finalGrid);

        const res = checkWin(finalGrid);
        setResult(res);

        if (res.win) {
          setHighlightLine(res.line);
          if (lineAudioRef.current) lineAudioRef.current.play();

          setComboCount((prev) => prev + 1);

          // チェリー揃いならFreeSpinを1追加
          if (res.symbol === "🍒") {
            setFreeSpins((prev) => prev + 1);
          }
        } else {
          setComboCount(0);
        }

        setSpinning(false);
      }
    }, 50);

    if (!isFreeSpin) {
      setCoins((c) => Math.max(0, c - betCoins));
      setDisplayCoins((c) => Math.max(0, c - betCoins));
    }
  };

  // 音声再生
  useEffect(() => {
    if (result?.win) {
      if (isJackpot) {
        jackpotAudioRef.current?.play();
      } else {
        winAudioRef.current?.play();
      }
    }
  }, [result, isJackpot]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-8 text-white font-mono select-none overflow-hidden">
      <h1 className="text-5xl font-extrabold mb-8 tracking-widest text-red-600 drop-shadow-[0_0_10px_red]">
        スロット
      </h1>

      {/* コイン残高表示 */}
      <motion.div
        className="mb-6 px-8 py-3 bg-gradient-to-r from-yellow-400 via-red-600 to-pink-700 rounded-xl text-black text-3xl font-extrabold shadow-[0_0_20px_red]"
        key={displayCoins}
        initial={{ scale: 0.9, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        Coins: {displayCoins.toLocaleString()}
      </motion.div>

      {/* ベットコイン数切替ボタン */}
      <motion.button
        onClick={() => {
          setBetCoins((prev) => {
            const currentIndex = betOptions.indexOf(prev);
            const nextIndex = (currentIndex + 1) % betOptions.length;
            return betOptions[nextIndex];
          });
        }}
        whileHover={{ scale: 1.05, boxShadow: "0 0 15px 4px #f59e0b" }}
        whileTap={{ scale: 0.9 }}
        className="mb-6 px-5 py-2 rounded-lg bg-gradient-to-r from-yellow-400 via-red-600 to-pink-700 text-black text-lg font-extrabold shadow-[0_0_20px_red] cursor-pointer select-none"
        aria-label="ベットコイン数切替ボタン"
      >
        ベットコイン数: {betCoins.toLocaleString()} 🪙
      </motion.button>

      {/* リール表示 */}
      <div className="relative grid grid-cols-3 gap-6 bg-black/90 p-6 rounded-xl shadow-[0_0_30px_red] border-4 border-red-700">
        {Array(reelsCount)
          .fill(null)
          .map((_, col) =>
            Array(rowsCount)
              .fill(null)
              .map((_, row) => {
                const isHighlighted =
                  highlightLine &&
                  highlightLine.some(([c, r]) => c === col && r === row);
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
                        : "bg-gradient-to-br from-gray-800 to-gray-900 text-red-600"
                    }`}
                    style={{
                      filter: isHighlighted
                        ? "drop-shadow(0 0 10px yellow)"
                        : "drop-shadow(0 0 4px red)",
                    }}
                  >
                    {/* グリッチっぽい揺れ */}
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

      {/* ペイライン光るライン */}
      {highlightLine && (
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <line
            x1={`${(highlightLine[0][0] + 0.5) * (100 / reelsCount)}%`}
            y1={`${(highlightLine[0][1] + 0.5) * (100 / rowsCount)}%`}
            x2={`${(highlightLine[2][0] + 0.5) * (100 / reelsCount)}%`}
            y2={`${(highlightLine[2][1] + 0.5) * (100 / rowsCount)}%`}
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

      {/* スピンボタン */}
      <motion.button
        onClick={() => startSpin(false)}
        disabled={spinning || coins < betCoins}
        whileHover={{ scale: 1.05, boxShadow: "0 0 12px 4px #f59e0b" }}
        whileTap={{ scale: 0.9 }}
        className={`mt-12 px-12 py-4 font-extrabold text-2xl rounded-xl text-black ${
          spinning || coins < betCoins
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-gradient-to-r from-yellow-400 via-red-600 to-pink-700 shadow-[0_0_20px_red] hover:brightness-110 transition duration-300"
        }`}
      >
        {spinning
          ? "回転中..."
          : coins < betCoins
          ? "コインが足りません"
          : "START"}
      </motion.button>

      {/* コンボ・フリースピン表示 */}
      <div className="mt-6 space-y-2 text-center">
        {comboCount > 0 && <div>🔥 コンボ: {comboCount}</div>}
        {freeSpins > 0 && <div>🎰 Freeスピン残り: {freeSpins}</div>}
      </div>

      {/* 液晶風メッセージ */}
      <LcdMessage show={!!result} isLose={result && !result.win}>
        {result?.win
          ? isJackpot
            ? "JACKPOT! 7が揃いました！"
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
        ref={lineAudioRef}
        src="https://actions.google.com/sounds/v1/cartoon/boing.ogg"
        preload="auto"
      />
    </div>
  );
}
