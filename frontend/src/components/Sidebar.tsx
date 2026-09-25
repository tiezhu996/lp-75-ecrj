import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Modal, Form, Input, message, Popconfirm, Space, Radio } from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, FolderOpenOutlined, HistoryOutlined,
  SafetyCertificateOutlined, SettingOutlined,
} from '@ant-design/icons';
import { Collection, CollectionAuthType } from '../types';
import { createCollection, deleteCollection, updateCollection } from '../api/collections';

const { Sider } = Layout;

interface SidebarProps {
  collections: Collection[];
  selectedCollectionId: string | null;
  onSelectCollection: (id: string) => void;
  onOpenHistory: () => void;
  onOpenEnvironments: () => void;
  onRefreshCollections: () => void;
}

interface CollectionFormValues {
  name: string;
  description?: string;
  authType: CollectionAuthType;
  bearerToken?: string;
  customHeaderName?: string;
  customHeaderValue?: string;
}

const Sidebar = ({
  collections,
  selectedCollectionId,
  onSelectCollection,
  onOpenHistory,
  onOpenEnvironments,
  onRefreshCollections,
}: SidebarProps) => {
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [collectionForm] = Form.useForm<CollectionFormValues>();
  const [collectionModalLoading, setCollectionModalLoading] = useState(false);
  const authType = Form.useWatch('authType', collectionForm);

  useEffect(() => {
    if (!collectionModalVisible) {
      setEditingCollection(null);
      collectionForm.resetFields();
    }
  }, [collectionModalVisible, collectionForm]);

  const handleOpenCollectionModal = (collection?: Collection) => {
    setEditingCollection(collection || null);
    if (collection) {
      const auth = collection.authConfig || { type: 'none' as const };
      collectionForm.setFieldsValue({
        name: collection.name,
        description: collection.description || '',
        authType: auth.type,
        bearerToken: auth.type === 'bearer' ? auth.token || '' : '',
        customHeaderName: auth.type === 'custom' ? auth.headerName || '' : '',
        customHeaderValue: auth.type === 'custom' ? auth.headerValue || '' : '',
      });
    } else {
      collectionForm.setFieldsValue({
        authType: 'none',
        bearerToken: '',
        customHeaderName: '',
        customHeaderValue: '',
      });
    }
    setCollectionModalVisible(true);
  };

  const buildAuthConfig = (values: CollectionFormValues) => {
    if (values.authType === 'bearer') {
      return {
        type: 'bearer' as const,
        token: values.bearerToken || '',
      };
    }
    if (values.authType === 'custom') {
      return {
        type: 'custom' as const,
        headerName: (values.customHeaderName || '').trim(),
        headerValue: values.customHeaderValue || '',
      };
    }
    return { type: 'none' as const };
  };

  const handleSaveCollection = async (values: CollectionFormValues) => {
    if (values.authType === 'bearer' && !(values.bearerToken || '').trim()) {
      message.error('请填写 Bearer 令牌');
      return;
    }
    if (values.authType === 'custom') {
      if (!(values.customHeaderName || '').trim()) {
        message.error('请填写自定义请求头名称');
        return;
      }
      if (!(values.customHeaderValue || '').trim()) {
        message.error('请填写自定义请求头的值');
        return;
      }
    }

    const payload = {
      name: values.name.trim(),
      description: values.description?.trim(),
      authConfig: buildAuthConfig(values),
    };

    try {
      setCollectionModalLoading(true);
      if (editingCollection) {
        await updateCollection(editingCollection._id, payload);
        message.success('更新成功');
      } else {
        await createCollection(payload);
        message.success('创建成功');
      }
      setCollectionModalVisible(false);
      collectionForm.resetFields();
      onRefreshCollections();
    } catch {
    } finally {
      setCollectionModalLoading(false);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await deleteCollection(id);
      message.success('删除成功');
      onRefreshCollections();
    } catch {
    }
  };

  return (
    <Sider width={280} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 500, fontSize: 16 }}>集合</span>
        <Button
          type="text"
          icon={<PlusOutlined />}
          onClick={() => handleOpenCollectionModal()}
        />
      </div>

      <div style={{ padding: '8px', overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
        {collections.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
            暂无集合，点击右上角 + 新建
          </div>
        ) : (
          <Menu mode="inline" selectedKeys={selectedCollectionId ? [selectedCollectionId] : []}>
            {collections.map((collection) => (
              <Menu.Item
                key={collection._id}
                icon={<FolderOpenOutlined />}
                onClick={() => onSelectCollection(collection._id)}
                style={{ display: 'flex', alignItems: 'center' }}
                extra={
                  <Space>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCollectionModal(collection);
                      }}
                    />
                    <Popconfirm
                      title="确认删除此集合？"
                      onConfirm={() => handleDeleteCollection(collection._id)}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </Space>
                }
              >
                <Space size={4}>
                  {collection.name}
                  {collection.authConfig && collection.authConfig.type !== 'none' && (
                    <SafetyCertificateOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                  )}
                </Space>
              </Menu.Item>
            ))}
          </Menu>
        )}
      </div>

      <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px' }}>
        <Menu mode="inline">
          <Menu.Item
            icon={<HistoryOutlined />}
            onClick={onOpenHistory}
          >
            请求历史
          </Menu.Item>
          <Menu.Item
            icon={<SettingOutlined />}
            onClick={onOpenEnvironments}
          >
            环境变量
          </Menu.Item>
        </Menu>
      </div>

      <Modal
        title={editingCollection ? '编辑集合' : '新建集合'}
        open={collectionModalVisible}
        onCancel={() => setCollectionModalVisible(false)}
        footer={null}
      >
        <Form
          form={collectionForm}
          layout="vertical"
          onFinish={handleSaveCollection}
          initialValues={{ authType: 'none' }}
        >
          <Form.Item
            name="name"
            label="集合名称"
            rules={[{ required: true, message: '请输入集合名称' }]}
          >
            <Input placeholder="请输入集合名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={2} />
          </Form.Item>

          <Form.Item
            name="authType"
            label="共享鉴权"
            extra="发送集合内接口或集合下临时请求时自动补充，接口同名请求头优先"
          >
            <Radio.Group>
              <Radio value="none">不使用</Radio>
              <Radio value="bearer">Bearer 令牌</Radio>
              <Radio value="custom">自定义请求头</Radio>
            </Radio.Group>
          </Form.Item>

          {authType === 'bearer' && (
            <Form.Item
              name="bearerToken"
              label="Bearer 令牌"
              extra="将以 Authorization: Bearer &lt;令牌&gt; 发送，仅保存于本集合"
            >
              <Input.Password placeholder="请输入访问令牌" autoComplete="off" />
            </Form.Item>
          )}

          {authType === 'custom' && (
            <>
              <Form.Item name="customHeaderName" label="请求头名称">
                <Input placeholder="例如 X-API-Key" autoComplete="off" />
              </Form.Item>
              <Form.Item name="customHeaderValue" label="请求头的值">
                <Input.Password placeholder="请输入请求头的值" autoComplete="off" />
              </Form.Item>
            </>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCollectionModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={collectionModalLoading}>
                {editingCollection ? '保存' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Sider>
  );
};

export default Sidebar;
