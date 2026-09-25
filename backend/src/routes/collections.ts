import { Router, Response } from 'express';
import authMiddleware from '../middleware/auth';
import Collection from '../models/Collection';
import ApiEndpoint from '../models/ApiEndpoint';
import { AuthenticatedRequest, ApiResponse } from '../types';
import mongoose from 'mongoose';

const router = Router();

interface CollectionAuthInput {
  type?: 'none' | 'bearer' | 'custom';
  token?: string;
  headerName?: string;
  headerValue?: string;
}

interface CreateCollectionRequest {
  name: string;
  description?: string;
  auth?: CollectionAuthInput;
}

const AUTH_TYPES = ['none', 'bearer', 'custom'] as const;

const normalizeAuth = (auth: CollectionAuthInput) => ({
  type: auth.type ?? 'none',
  token: auth.token?.trim() ?? '',
  headerName: auth.headerName?.trim() ?? '',
  headerValue: auth.headerValue?.trim() ?? '',
});

const isValidAuth = (auth: CollectionAuthInput): boolean =>
  !auth.type || (AUTH_TYPES as readonly string[]).includes(auth.type);

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未授权访问' });
      return;
    }

    const collections = await Collection.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: collections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取集合列表失败',
    });
  }
});

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未授权访问' });
      return;
    }

    const { name, description, auth } = req.body as CreateCollectionRequest;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: '集合名称不能为空',
      });
      return;
    }

    if (auth && !isValidAuth(auth)) {
      res.status(400).json({
        success: false,
        message: '无效的鉴权类型，仅支持 none、bearer、custom',
      });
      return;
    }

    const existingCollection = await Collection.findOne({
      userId: req.user._id,
      name: name.trim(),
    });

    if (existingCollection) {
      res.status(400).json({
        success: false,
        message: '集合名称已存在',
      });
      return;
    }

    const collection = new Collection({
      userId: req.user._id,
      name: name.trim(),
      description: description?.trim(),
      ...(auth ? { auth: normalizeAuth(auth) } : {}),
    });

    await collection.save();

    res.status(201).json({
      success: true,
      data: collection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建集合失败',
    });
  }
});

router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未授权访问' });
      return;
    }

    const { id } = req.params;
    const { name, description, auth } = req.body as CreateCollectionRequest;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: '无效的集合 ID',
      });
      return;
    }

    if (auth && !isValidAuth(auth)) {
      res.status(400).json({
        success: false,
        message: '无效的鉴权类型，仅支持 none、bearer、custom',
      });
      return;
    }

    const collection = await Collection.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!collection) {
      res.status(404).json({
        success: false,
        message: '集合不存在',
      });
      return;
    }

    if (name && name.trim().length > 0) {
      const existingCollection = await Collection.findOne({
        userId: req.user._id,
        name: name.trim(),
        _id: { $ne: id },
      });

      if (existingCollection) {
        res.status(400).json({
          success: false,
          message: '集合名称已存在',
        });
        return;
      }

      collection.name = name.trim();
    }

    if (description !== undefined) {
      collection.description = description?.trim();
    }

    if (auth !== undefined) {
      collection.auth = normalizeAuth(auth);
    }

    await collection.save();

    res.json({
      success: true,
      data: collection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新集合失败',
    });
  }
});

router.delete(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: '未授权访问' });
        return;
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: '无效的集合 ID',
        });
        return;
      }

      const collection = await Collection.findOne({
        _id: id,
        userId: req.user._id,
      });

      if (!collection) {
        res.status(404).json({
          success: false,
          message: '集合不存在',
        });
        return;
      }

      await ApiEndpoint.deleteMany({ collectionId: id, userId: req.user._id });
      await collection.deleteOne();

      res.json({
        success: true,
        message: '集合已删除',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '删除集合失败',
      });
    }
  }
);

export default router;
