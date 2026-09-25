import { Collection, Header } from '../types';

export interface CollectionAuthResult {
  headers: Header[];
  error?: string;
}

/**
 * 根据集合的共享鉴权配置生成需要附加的请求头。
 * 配置不完整时返回 error，调用方应停止发送并向用户说明缺少的内容。
 */
export const buildCollectionAuthHeaders = (
  collection: Collection | null | undefined
): CollectionAuthResult => {
  if (!collection || !collection.auth || collection.auth.type === 'none') {
    return { headers: [] };
  }

  const { auth } = collection;

  if (auth.type === 'bearer') {
    const token = auth.token?.trim();
    if (!token) {
      return {
        headers: [],
        error: `集合「${collection.name}」使用 Bearer 令牌鉴权，但尚未填写令牌，请先在集合设置中补充`,
      };
    }
    return {
      headers: [{ key: 'Authorization', value: `Bearer ${token}`, enabled: true }],
    };
  }

  const headerName = auth.headerName?.trim();
  const headerValue = auth.headerValue?.trim();
  if (!headerName) {
    return {
      headers: [],
      error: `集合「${collection.name}」使用自定义请求头鉴权，但尚未填写请求头名称，请先在集合设置中补充`,
    };
  }
  if (!headerValue) {
    return {
      headers: [],
      error: `集合「${collection.name}」的鉴权请求头「${headerName}」尚未填写值，请先在集合设置中补充`,
    };
  }
  return { headers: [{ key: headerName, value: headerValue, enabled: true }] };
};

/**
 * 将集合鉴权请求头合并进本次发送的请求头：
 * 接口自己写了同名（忽略大小写）且启用的请求头时，以接口的为准。
 */
export const mergeAuthHeaders = (requestHeaders: Header[], authHeaders: Header[]): Header[] => {
  if (authHeaders.length === 0) {
    return requestHeaders;
  }
  const overriddenKeys = new Set(
    requestHeaders
      .filter((header) => header.enabled && header.key.trim())
      .map((header) => header.key.trim().toLowerCase())
  );
  const additions = authHeaders.filter(
    (header) => !overriddenKeys.has(header.key.trim().toLowerCase())
  );
  return [...requestHeaders, ...additions];
};
