import React, { useEffect, useRef, useState } from "react";
import {
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ArrowLeft,
  Flame,
  Shield,
  Zap,
} from "lucide-react";

interface GameShellProps {
  onBackToChat: () => void;
  isLightMode: boolean;
}

type GameState = "TITLE_MENU" | "PLAYING" | "PAUSED" | "GAME_OVER";

interface Player {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  speed: number;
  hp: number;
  maxHp: number;
  energy: number;
  score: number;
}

interface Orb {
  x: number;
  y: number;
  radius: number;
  type: "energy" | "shield" | "boost";
  pulse: number;
}

interface ShadowAnomaly {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  speed: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export const DiaaGame: React.FC<GameShellProps> = ({
  onBackToChat,
  isLightMode,
}) => {
  const [gameState, setGameState] = useState<GameState>("TITLE_MENU");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(
        localStorage.getItem("diaa_game_highscore") ||
          localStorage.getItem("noor_game_highscore") ||
          "0",
        10
      );
    } catch {
      return 0;
    }
  });
  const [hp, setHp] = useState(100);
  const [muted, setMuted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Simulation Game State Refs
  const playerRef = useRef<Player>({
    x: 400,
    y: 300,
    radius: 14,
    vx: 0,
    vy: 0,
    speed: 5.5,
    hp: 100,
    maxHp: 100,
    energy: 50,
    score: 0,
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const orbsRef = useRef<Orb[]>([]);
  const enemiesRef = useRef<ShadowAnomaly[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const cameraShakeRef = useRef<number>(0);

  // Web Audio Synth FX
  const playSound = (
    type: "collect" | "hit" | "pulse" | "gameover" | "start"
  ) => {
    if (muted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === "collect") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === "hit") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.23);
      } else if (type === "pulse") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.21);
      } else if (type === "start") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.32);
      } else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.46);
      }
    } catch {
      // Audio fallback
    }
  };

  const spawnParticles = (
    x: number,
    y: number,
    color: string,
    count: number = 8
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 1.5,
        alpha: 1,
        color,
      });
    }
  };

  const resetGame = () => {
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 800;
    const h = canvas ? canvas.height : 600;

    playerRef.current = {
      x: w / 2,
      y: h / 2,
      radius: 14,
      vx: 0,
      vy: 0,
      speed: 5.5,
      hp: 100,
      maxHp: 100,
      energy: 50,
      score: 0,
    };

    orbsRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    cameraShakeRef.current = 0;

    // Initial Orbs
    for (let i = 0; i < 7; i++) {
      orbsRef.current.push({
        x: Math.random() * (w - 60) + 30,
        y: Math.random() * (h - 60) + 30,
        radius: 8,
        type: Math.random() > 0.8 ? "shield" : "energy",
        pulse: Math.random() * Math.PI,
      });
    }

    setScore(0);
    setHp(100);
    setGameState("PLAYING");
    playSound("start");
  };

  // Input Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.code === "Space") {
        if (gameState === "TITLE_MENU" || gameState === "GAME_OVER") {
          resetGame();
        } else if (gameState === "PLAYING") {
          triggerBlast();
        }
      }
      if (e.key === "Escape") {
        if (gameState === "PLAYING") setGameState("PAUSED");
        else if (gameState === "PAUSED") setGameState("PLAYING");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    const handleBlur = () => {
      keysRef.current = {};
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [gameState]);

  const triggerBlast = () => {
    const player = playerRef.current;
    if (player.energy < 25) return;
    player.energy -= 25;
    playSound("pulse");
    cameraShakeRef.current = 8;
    spawnParticles(player.x, player.y, "#10B981", 20);

    // Blast pushes or destroys close anomalies
    enemiesRef.current = enemiesRef.current.filter((en) => {
      const dist = Math.hypot(en.x - player.x, en.y - player.y);
      if (dist < 140) {
        spawnParticles(en.x, en.y, "#F43F5E", 14);
        player.score += 50;
        return false;
      }
      return true;
    });
  };

  // Main 60FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTimeRef.current = timestamp;

      const w = canvas.width;
      const h = canvas.height;

      // Update Simulation if PLAYING
      if (gameState === "PLAYING") {
        const player = playerRef.current;
        const keys = keysRef.current;

        // Player Movement
        let dx = 0;
        let dy = 0;
        if (keys["w"] || keys["arrowup"]) dy -= 1;
        if (keys["s"] || keys["arrowdown"]) dy += 1;
        if (keys["a"] || keys["arrowleft"]) dx -= 1;
        if (keys["d"] || keys["arrowright"]) dx += 1;

        if (dx !== 0 && dy !== 0) {
          dx *= 0.7071;
          dy *= 0.7071;
        }

        player.vx = dx * player.speed;
        player.vy = dy * player.speed;
        player.x += player.vx;
        player.y += player.vy;

        // Boundaries
        player.x = Math.max(player.radius, Math.min(w - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(h - player.radius, player.y));

        // Recharging energy slowly
        if (player.energy < 100) player.energy = Math.min(100, player.energy + dt * 10);

        // Spawn Anomaly Timer
        spawnTimerRef.current += dt;
        const spawnInterval = Math.max(0.7, 2.2 - player.score * 0.001);
        if (spawnTimerRef.current > spawnInterval) {
          spawnTimerRef.current = 0;
          const edge = Math.floor(Math.random() * 4);
          let ex = 0;
          let ey = 0;
          if (edge === 0) {
            ex = Math.random() * w;
            ey = -20;
          } else if (edge === 1) {
            ex = w + 20;
            ey = Math.random() * h;
          } else if (edge === 2) {
            ex = Math.random() * w;
            ey = h + 20;
          } else {
            ex = -20;
            ey = Math.random() * h;
          }

          enemiesRef.current.push({
            x: ex,
            y: ey,
            radius: Math.random() * 6 + 10,
            vx: 0,
            vy: 0,
            speed: Math.random() * 1.5 + 2.0,
            color: Math.random() > 0.5 ? "#F43F5E" : "#FB7185",
          });
        }

        // Anomaly Movement towards player
        for (const en of enemiesRef.current) {
          const angle = Math.atan2(player.y - en.y, player.x - en.x);
          en.vx = Math.cos(angle) * en.speed;
          en.vy = Math.sin(angle) * en.speed;
          en.x += en.vx;
          en.y += en.vy;

          // Collision with Player
          const dist = Math.hypot(player.x - en.x, player.y - en.y);
          if (dist < player.radius + en.radius) {
            player.hp -= 20;
            cameraShakeRef.current = 10;
            playSound("hit");
            spawnParticles(player.x, player.y, "#F43F5E", 12);

            // push enemy back
            en.x -= Math.cos(angle) * 50;
            en.y -= Math.sin(angle) * 50;

            if (player.hp <= 0) {
              setGameState("GAME_OVER");
              playSound("gameover");
              if (player.score > highScore) {
                setHighScore(player.score);
                try {
                  localStorage.setItem(
                    "diaa_game_highscore",
                    player.score.toString()
                  );
                } catch {}
              }
            }
          }
        }

        // Orbs Collection
        orbsRef.current = orbsRef.current.filter((orb) => {
          const dist = Math.hypot(player.x - orb.x, player.y - orb.y);
          if (dist < player.radius + orb.radius + 6) {
            playSound("collect");
            spawnParticles(orb.x, orb.y, "#10B981", 10);
            player.score += 25;
            player.energy = Math.min(100, player.energy + 20);
            if (orb.type === "shield") {
              player.hp = Math.min(player.maxHp, player.hp + 15);
            }
            return false;
          }
          return true;
        });

        // Maintain Orb count
        if (orbsRef.current.length < 6) {
          orbsRef.current.push({
            x: Math.random() * (w - 60) + 30,
            y: Math.random() * (h - 60) + 30,
            radius: 8,
            type: Math.random() > 0.8 ? "shield" : "energy",
            pulse: Math.random() * Math.PI,
          });
        }

        // Update Particles
        particlesRef.current = particlesRef.current.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= dt * 1.8;
          return p.alpha > 0;
        });

        setScore(player.score);
        setHp(Math.max(0, player.hp));
      }

      // Camera Shake decay
      let shakeX = 0;
      let shakeY = 0;
      if (cameraShakeRef.current > 0) {
        shakeX = (Math.random() - 0.5) * cameraShakeRef.current;
        shakeY = (Math.random() - 0.5) * cameraShakeRef.current;
        cameraShakeRef.current = Math.max(0, cameraShakeRef.current - dt * 25);
      }

      // RENDER CANVAS
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Background Field
      ctx.fillStyle = isLightMode ? "#0F172A" : "#070B12";
      ctx.fillRect(0, 0, w, h);

      // Grid Lines
      ctx.strokeStyle = "rgba(16, 185, 129, 0.05)";
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Render Orbs
      for (const orb of orbsRef.current) {
        orb.pulse += 0.05;
        const r = orb.radius + Math.sin(orb.pulse) * 2;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
        ctx.fillStyle = orb.type === "shield" ? "#38BDF8" : "#10B981";
        ctx.shadowColor = orb.type === "shield" ? "#38BDF8" : "#10B981";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Render Particles
      for (const p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      }

      // Render Enemies
      for (const en of enemiesRef.current) {
        ctx.beginPath();
        ctx.arc(en.x, en.y, en.radius, 0, Math.PI * 2);
        ctx.fillStyle = en.color;
        ctx.shadowColor = en.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Render Player Orb
      const p = playerRef.current;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#34D399";
      ctx.shadowColor = "#10B981";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, isLightMode]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#070B12] text-white select-none overflow-hidden">
      {/* Top Status HUD (Unobtrusive & World Matched) */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-4 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={onBackToChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>العودة للمحادثة</span>
          </button>
        </div>

        {/* Meters Cluster */}
        <div className="flex items-center gap-5 bg-slate-900/70 border border-slate-800 px-4 py-2 rounded-2xl pointer-events-auto text-xs">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">النقاط:</span>
            <span className="font-bold tabular-nums text-emerald-300">
              {score}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">الرقم القياسي:</span>
            <span className="font-bold tabular-nums text-amber-300">
              {highScore}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">الصحة:</span>
            <span
              className={`font-bold tabular-nums ${
                hp > 30 ? "text-cyan-300" : "text-rose-400"
              }`}
            >
              {hp}%
            </span>
          </div>
        </div>

        {/* Audio Mute & Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
            title={muted ? "تشغيل الصوت" : "كتم الصوت"}
          >
            {muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
          {gameState === "PLAYING" && (
            <button
              type="button"
              onClick={() => setGameState("PAUSED")}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
              title="إيقاف مؤقت"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 60FPS Game Canvas */}
      <div className="flex-1 w-full h-full relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Control Hint Line at Bottom */}
      <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center pointer-events-none">
        <div className="text-[11px] text-slate-400 bg-slate-900/70 border border-slate-800 px-4 py-1.5 rounded-full">
          WASD أو الأسهم للحركة · مسافة للموجة الطاردة · Esc للإيقاف المؤقت
        </div>
      </div>

      {/* Title Screen Overlay */}
      {gameState === "TITLE_MENU" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xs p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-6 shadow-lg shadow-emerald-500/10">
            <Zap className="w-8 h-8" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            حارس ضياء: موجة الطاقة (Diaa Guardian)
          </h1>
          <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
            اجمع بلورات الطاقة المضيئة واحمِ النواة من الظلال المتسللة باستخدام
            موجات النبض المغناطيسي السريعة.
          </p>

          <button
            type="button"
            onClick={resetGame}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md hover:scale-105 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>ابدأ اللعب الآن (Space)</span>
          </button>
        </div>
      )}

      {/* Pause Modal Overlay */}
      {gameState === "PAUSED" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">اللعبة متوقفة مؤقتاً</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setGameState("PLAYING")}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>متابعة اللعب</span>
            </button>
            <button
              type="button"
              onClick={resetGame}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة التشغيل</span>
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState === "GAME_OVER" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xs p-6 text-center animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
            <Flame className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-bold mb-2">انتهت الجولة!</h2>
          <p className="text-xs text-slate-400 mb-6">
            لقد صمدت بشجاعة ودافعت عن النواة المضيئة.
          </p>

          <div className="flex items-center gap-8 mb-8 bg-slate-900/80 border border-slate-800 px-6 py-3 rounded-2xl">
            <div>
              <div className="text-[11px] text-slate-400 mb-0.5">
                النقاط المحققة
              </div>
              <div className="text-2xl font-bold tabular-nums text-emerald-400">
                {score}
              </div>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <div className="text-[11px] text-slate-400 mb-0.5">
                أعلى رقم قياسي
              </div>
              <div className="text-2xl font-bold tabular-nums text-amber-400">
                {highScore}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={resetGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>العب مرة أخرى (Space)</span>
          </button>
        </div>
      )}
    </div>
  );
};
