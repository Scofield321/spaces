// Smooth scroll for navbar links
document.querySelectorAll("nav a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = link.getAttribute("href").substring(1);
    const section = document.getElementById(targetId);
    if (section) {
      window.scrollTo({
        top: section.offsetTop - 60,
        behavior: "smooth",
      });
    }
  });
});

// Smooth scroll for hero buttons
document.getElementById("story-btn").addEventListener("click", () => {
  document.getElementById("story").scrollIntoView({ behavior: "smooth" });
});
document.getElementById("join-now-btn").addEventListener("click", () => {
  document.getElementById("join").scrollIntoView({ behavior: "smooth" });
});

// Fade-in on scroll
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll("section").forEach((sec) => observer.observe(sec));

// ===== Floating Particle Background =====
const canvas = document.getElementById("hero-bg");
const ctx = canvas.getContext("2d");

let particles = [];
let width, height;

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = document.querySelector(".hero").offsetHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

class Particle {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = Math.random() * 2 + 1;
    this.speedX = (Math.random() - 0.5) * 0.5;
    this.speedY = (Math.random() - 0.5) * 0.5;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x < 0 || this.x > width) this.speedX *= -1;
    if (this.y < 0 || this.y > height) this.speedY *= -1;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(99, 102, 241, 0.7)";
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  const numParticles = Math.floor(width / 10); // density based on screen width
  for (let i = 0; i < numParticles; i++) {
    particles.push(new Particle());
  }
}

function connectParticles() {
  for (let a = 0; a < particles.length; a++) {
    for (let b = a; b < particles.length; b++) {
      const dx = particles[a].x - particles[b].x;
      const dy = particles[a].y - particles[b].y;
      const distance = dx * dx + dy * dy;
      if (distance < 2000) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(99, 102, 241, 0.15)";
        ctx.lineWidth = 0.5;
        ctx.moveTo(particles[a].x, particles[a].y);
        ctx.lineTo(particles[b].x, particles[b].y);
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, width, height);
  particles.forEach((p) => {
    p.update();
    p.draw();
  });
  connectParticles();
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

// Hero section
let hero = document.querySelector(".hero");
let isPaused = false;

window.addEventListener("scroll", () => {
  const scrollTop = window.scrollY;
  if (scrollTop > 100 && !isPaused) {
    hero.style.animationPlayState = "paused";
    isPaused = true;
  } else if (scrollTop < 100 && isPaused) {
    hero.style.animationPlayState = "running";
    isPaused = false;
  }
});

// ===== Bottom Nav Active State =====
const navLinks = document.querySelectorAll(".mobile-nav .nav-link");

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
  });
});

// Mobile nav links
const mobileNavLinks = document.querySelectorAll(".mobile-nav .nav-link");

mobileNavLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    mobileNavLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    const targetId = link.getAttribute("href").substring(1);
    const section = document.getElementById(targetId);
    if (section) {
      window.scrollTo({
        top: section.offsetTop - 60,
        behavior: "smooth",
      });
    } else {
      // fallback: could redirect to login page
      console.log(`Go to ${link.getAttribute("href")}`);
    }
  });
});
