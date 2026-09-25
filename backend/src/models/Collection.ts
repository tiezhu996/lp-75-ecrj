import mongoose, { Schema, Document } from 'mongoose';

export type CollectionAuthType = 'none' | 'bearer' | 'custom';

export interface ICollectionAuth {
  type: CollectionAuthType;
  token?: string;
  headerName?: string;
  headerValue?: string;
}

export interface ICollection extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  auth: ICollectionAuth;
  createdAt: Date;
  updatedAt: Date;
}

const CollectionAuthSchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ['none', 'bearer', 'custom'],
      default: 'none',
    },
    token: {
      type: String,
      trim: true,
      default: '',
    },
    headerName: {
      type: String,
      trim: true,
      default: '',
    },
    headerValue: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const CollectionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    auth: {
      type: CollectionAuthSchema,
      default: () => ({ type: 'none' }),
    },
  },
  {
    timestamps: true,
  }
);

CollectionSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model<ICollection>('Collection', CollectionSchema);
