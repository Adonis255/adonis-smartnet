/* script.js
   Vanilla JS for interactions, canvas nodes, carousel, form validation, accessibility.
*/

// Utilities
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// DOM Ready
document.addEventListener('DOMContentLoaded', ()=>{
  // Year in footer
  $('#year').textContent = new Date().getFullYear();

  // Nav toggle for mobile
  const navToggle = $('#navToggle');
  const siteNav = $('#siteNav');
  navToggle.addEventListener('click', ()=>{
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    siteNav.setAttribute('aria-hidden', String(expanded));
  });

  // Theme toggle persisted
  const themeToggle = $('#themeToggle');
  const saved = localStorage.getItem('theme');
  if(saved === 'light') document.body.classList.add('light');
  themeToggle.addEventListener('click', ()=>{
    const on = document.body.classList.toggle('light');
    themeToggle.setAttribute('aria-pressed', String(on));
    themeToggle.textContent = on ? 'Light' : 'Dark';
    localStorage.setItem('theme', on ? 'light' : 'dark');
  });

  // Cards tilt effect (pointer tracking)
  $$('.card[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      const rotateX = -py * 8;
      const rotateY = px * 8;
      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(4px)`;
    });
    card.addEventListener('pointerleave', ()=> card.style.transform = '');
  });

  // Carousel
  initCarousel('#caseCarousel');

  // Contact form validation & fake submit
  const contactForm = $('#contactForm');
  const successModal = $('#successModal');
  const modalClose = $$('.modal-close')[0];
  contactForm.addEventListener('submit', e =>{
    e.preventDefault();
    // Basic client-side validation
    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    if(!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
      alert('omondiadams400@gmail.com.');
      return;
    }
    // Fake API delay then show success modal (no server)
    showModal(successModal);
  });
  modalClose.addEventListener('click', ()=> hideModal(successModal));
  $('#modalOkay').addEventListener('click', ()=> hideModal(successModal));

  // Setup canvas nodes (3D-like) with graceful fallback
  initNodesCanvas();
});

// Modal helpers
function showModal(mod){ mod.setAttribute('aria-hidden','false'); }
function hideModal(mod){ mod.setAttribute('aria-hidden','true'); }

// Simple carousel implementation
function initCarousel(selector){
  const root = document.querySelector(selector);
  if(!root) return;
  const track = root.querySelector('.carousel-track');
  const items = Array.from(track.children);
  let idx = 0; let playing = true;
  const show = i => {
    const width = items[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap || 0);
    track.style.transform = `translateX(${-(width * i)}px)`;
  };
  root.querySelector('.prev').addEventListener('click', ()=>{ idx = (idx-1+items.length)%items.length; show(idx); });
  root.querySelector('.next').addEventListener('click', ()=>{ idx = (idx+1)%items.length; show(idx); });
  root.addEventListener('mouseenter', ()=> playing=false);
  root.addEventListener('mouseleave', ()=> playing=true);
  // autoplay
  setInterval(()=>{ if(playing){ idx=(idx+1)%items.length; show(idx); } }, 3500);
  // init
  show(0);
}

// Nodes canvas: lightweight particle network with interaction
function initNodesCanvas(){
  const canvas = document.getElementById('nodesCanvas');
  const fallback = document.getElementById('nodesFallback');
  if(!canvas) return;
  const ctx = canvas.getContext && canvas.getContext('2d');
  if(!ctx){ // fallback
    canvas.style.display = 'none'; fallback.hidden = false; return;
  }
  // Resize
  function resize(){
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }
  resize(); window.addEventListener('resize', resize);

  const nodes = [];
  const N = 18;
  const w = () => canvas.clientWidth; const h = () => canvas.clientHeight;
  for(let i=0;i<N;i++){
    nodes.push({
      x: Math.random()*w(), y: Math.random()*h(), vx: (Math.random()-0.5)*0.4, vy:(Math.random()-0.5)*0.4, r: 2+Math.random()*3
    });
  }

  // Interaction
  const mouse = {x:-9999,y:-9999}
  canvas.addEventListener('pointermove', e=>{ const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  canvas.addEventListener('pointerleave', ()=>{ mouse.x = -9999; mouse.y = -9999 });

  let rafId;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function step(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // update
    nodes.forEach(n=>{
      n.x += n.vx; n.y += n.vy;
      if(n.x<0||n.x>w()) n.vx *= -1;
      if(n.y<0||n.y>h()) n.vy *= -1;
    });
    // draw links
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i], b=nodes[j];
        const dx=a.x-b.x, dy=a.y-b.y; const d=Math.sqrt(dx*dx+dy*dy);
        if(d<140){ ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.strokeStyle = `rgba(0,230,255,${1 - d/140})`; ctx.lineWidth = 0.9; ctx.stroke(); }
      }
    }
    // mouse repulsion
    if(mouse.x>-9000){
      nodes.forEach(n=>{
        const dx=n.x-mouse.x, dy=n.y-mouse.y; const d2 = Math.max(12, Math.sqrt(dx*dx+dy*dy));
        const force = Math.min(40, 2000/(d2*d2));
        n.vx += dx/d2*force*0.02; n.vy += dy/d2*force*0.02;
      });
    }
    // draw nodes
    nodes.forEach(n=>{
      ctx.beginPath(); ctx.fillStyle = 'rgba(0,230,255,0.95)'; ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
    });
    if(!reduced) rafId = requestAnimationFrame(step);
  }
  step();
}

