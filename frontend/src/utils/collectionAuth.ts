import { Collection, CollectionAuthConfig, Header } from '../types';

/**
 * 根据集合 ID 查找集合。
 */
export function findCollection(
  collections: Collection[],
  collectionId: string | null
): Collection | null {
  if (!collectionId) return null;
  return collections.find((item) => item._id === collectionId) || null;
}

/**
 * 计算集合共享鉴权要补充的请求头；未配置鉴权返回 null；
 * 配置了鉴权但缺少令牌/头值时抛出错误，发送前调用以中止请求并提示。
 */
export function getCollectionAuthHeader(
  authConfig?: CollectionAuthConfig | null
): Header | null {
  if (!authConfig || authConfig.type === 'none') {
    return null;
  }

  if (authConfig.type === 'bearer') {
    const token = (authConfig.token || '').trim();
    if (!token) {
      throw new Error('当前集合已启用 Bearer 鉴权，但未填写令牌，请先编辑集合鉴权配置');
    }
    return { key: 'Authorization', value: `Bearer ${token}`, enabled: true };
  }

  const headerName = (authConfig.headerName || '').trim();
  const headerValue = (authConfig.headerValue || '').trim();

  if (!headerName) {
    throw new Error('当前集合已启用自定义鉴权头，但未填写请求头名称，请先编辑集合鉴权配置');
  }
  if (!headerValue) {
    throw new Error(`当前集合自定义鉴权头「${headerName}」未填写值，请先编辑集合鉴权配置`);
  }

  return { key: headerName, value: headerValue, enabled: true };
}

/**
 * 判断接口请求头中是否已存在同名（忽略大小写）且启用的请求头。
 */
export function hasSameHeader(headers: Header[], key: string): boolean {
  const target = key.trim().toLowerCase();
  return headers.some(
    (header) => header.enabled && header.key.trim().toLowerCase() === target
  );
}

/**
 * 预览集合共享鉴权补充后的请求头（仅用于界面展示，实际合并在后端完成）。
 */
export function previewHeadersWithCollectionAuth(
  headers: Header[],
  authConfig?: CollectionAuthConfig | null
): Header[] {
  const authHeader = getCollectionAuthHeader(authConfig);
  if (!authHeader || hasSameHeader(headers, authHeader.key)) {
    return headers;
  }
  return [...headers, authHeader];
}
