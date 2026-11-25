// WebGL 컨텍스트 소실 감지. 소실되면 콜백을 한 번 부른다(Stage가 2D로 전환)
export function watchContextLost(canvas: HTMLCanvasElement, onLost: () => void) {
  canvas.addEventListener('webglcontextlost', () => onLost(), { once: true })
}
