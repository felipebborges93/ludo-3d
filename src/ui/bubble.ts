/** Short-lived speech bubble at screen coords. */
export function showBubble(text: string, x: number, y: number) {
  const el = document.createElement('div');
  el.className = 'bubble';
  el.textContent = text;
  el.style.left = `${Math.min(Math.max(x, 90), innerWidth - 90)}px`;
  el.style.top = `${Math.max(y, 40)}px`;
  document.body.append(el);
  setTimeout(() => el.remove(), 2200);
}
