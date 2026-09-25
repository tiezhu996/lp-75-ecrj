import { Router, Response } from 'express';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth';
import RequestHistory from '../models/RequestHistory';
import Collection from '../models/Collection';
import { AuthenticatedRequest, ApiResponse, ProxyRequestData, HeaderItem } from '../types';
import { proxyRequest } from '../utils/proxy';
import { mergeCollectionAuthHeaders } from '../utils/collectionAuth';
import { MAX_HISTORY_PER_USER } from './history';

const router = Router();

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未授权访问' });
      return;
    }

    const { method, url, headers, body, collectionId } = req.body as ProxyRequestData;

    if (!method || !url) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数',
      });
      return;
    }

    const endpointHeaders: HeaderItem[] = Array.isArray(headers) ? headers : [];
    let actualHeaders = endpointHeaders;

    // 发送集合内接口或集合下的临时请求时，自动补充集合共享鉴权头
    if (collectionId) {
      if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        res.status(400).json({
          success: false,
          message: '无效的集合 ID',
        });
        return;
      }

      const collection = await Collection.findOne({
        _id: collectionId,
        userId: req.user._id,
      });

      if (!collection) {
        res.status(404).json({
          success: false,
          message: '集合不存在，无法应用共享鉴权配置',
        });
        return;
      }

      // 令牌/头值缺失时在此抛出，停止发送；接口同名请求头优先
      actualHeaders = mergeCollectionAuthHeaders(
        endpointHeaders,
        collection.authConfig
      );
    }

    const response = await proxyRequest({
      method,
      url,
      headers: actualHeaders,
      body,
    });

    // 历史记录保留本次实际发送的请求头（含集合共享鉴权头）
    const history = new RequestHistory({
      userId: req.user._id,
      method,
      url,
      headers: actualHeaders,
      body,
      response,
    });

    await history.save();

    const historyCount = await RequestHistory.countDocuments({ userId: req.user._id });

    if (historyCount > MAX_HISTORY_PER_USER) {
      const oldestRecords = await RequestHistory.find({ userId: req.user._id })
        .sort({ createdAt: 1 })
        .limit(historyCount - MAX_HISTORY_PER_USER);

      const idsToDelete = oldestRecords.map((record) => record._id);
      await RequestHistory.deleteMany({ _id: { $in: idsToDelete } });
    }

    res.json({
      success: true,
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.body,
        duration: response.duration,
        historyId: history._id.toString(),
      },
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : '代理请求失败';
    // 鉴权配置缺失属于请求问题，返回 400，其余按 500 处理
    const statusCode = messageText.includes('鉴权') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: messageText,
    });
  }
});

export default router;
