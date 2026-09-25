import { CollectionAuthConfig, HeaderItem } from '../types';

/**
 * 计算集合共享鉴权要补充的请求头。
 * - type 为 none 或缺省时不补充任何头
 * - bearer 模式补充 Authorization: Bearer <token>，令牌为空则报错
 * - custom 模式补充 <headerName>: <headerValue>，名称或值为空则报错
 */
export function getCollectionAuthHeader(
  authConfig?: CollectionAuthConfig | null
): HeaderItem | null {
  if (!authConfig || authConfig.type === 'none') {
    return null;
  }

  if (authConfig.type === 'bearer') {
    const token = (authConfig.token || '').trim();
    if (!token) {
      throw new Error('集合已配置 Bearer 鉴权，但未填写令牌，请先在集合鉴权配置中补充令牌');
    }
    return { key: 'Authorization', value: `Bearer ${token}`, enabled: true };
  }

  if (authConfig.type === 'custom') {
    const headerName = (authConfig.headerName || '').trim();
    const headerValue = (authConfig.headerValue || '').trim();
    if (!headerName) {
      throw new Error('集合已配置自定义鉴权头，但未填写请求头名称，请先在集合鉴权配置中补充');
    }
    if (!headerValue) {
      throw new Error(`集合自定义鉴权头「${headerName}」未填写值，请先在集合鉴权配置中补充`);
    }
    return { key: headerName, value: headerValue, enabled: true };
  }

  return null;
}

/**
 * 将集合共享鉴权头合并进接口请求头。
 * 接口自身启用且同名（忽略大小写）的请求头优先，集合鉴权头仅在没有同名头时补充。
 */
export function mergeCollectionAuthHeaders(
  endpointHeaders: HeaderItem[],
  authConfig?: CollectionAuthConfig | null
): HeaderItem[] {
  const merged: HeaderItem[] = (endpointHeaders || []).map((header) => ({ ...header }));
  const authHeader = getCollectionAuthHeader(authConfig);

  if (!authHeader) {
    return merged;
  }

  const hasSameHeader = merged.some(
    (header) =>
      header.enabled &&
      header.key.trim().toLowerCase() === authHeader.key.toLowerCase()
  );

  if (!hasSameHeader) {
    merged.push(authHeader);
  }

  return merged;
}
