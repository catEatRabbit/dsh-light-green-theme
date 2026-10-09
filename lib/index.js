/**
 * dsh-my-theme — 宿主半侧。
 *
 * 这个主题只在浏览器里生效，所以宿主半侧是一个合法的空插件：
 * Loader 需要一个可导入的宿主 entry，而浏览器半侧由 dsh-client-modules
 * 依据 package.json 的 dsh.client.platform === 'web' 挂在同一行上。
 */

export const name = 'dsh-my-theme'

export function apply() {
  // 有意为空：没有宿主侧行为。
}
