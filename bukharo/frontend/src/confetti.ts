import confetti from "canvas-confetti";

/** Single burst – for closing a pile of 7. */
export function firePileBurst() {
  confetti({
    particleCount: 120,
    spread: 80,
    startVelocity: 40,
    origin: { y: 0.55 },
    colors: ["#FFD700", "#FF6B35", "#4CAF50", "#00BCD4", "#E91E63", "#9C27B0"],
    ticks: 200,
  });
}

/** Sustained side-cannons – for the winning team. */
export function fireCelebrationConfetti() {
  const end = Date.now() + 3200;
  const colors = ["#FFD700", "#FF6B35", "#4CAF50", "#00BCD4", "#E91E63"];
  const frame = () => {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
