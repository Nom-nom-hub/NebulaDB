export interface ModelMetadata {
  collection: string;
  timestamps: boolean;
  target: any;
}

export interface FieldMetadata {
  type?: any;
  required?: boolean;
  default?: any;
  unique?: boolean;
  validate?: (value: any) => boolean | Promise<boolean>;
  name: string;
}

export interface IndexMetadata {
  name: string;
  type: any;
  fields: string[];
}

export interface RelationMetadata {
  type: any;
  target: () => any;
  foreignKey?: string;
  inverseSide?: string;
  cascade?: boolean;
  name: string;
}

declare global {
  interface Function {
    getModelMetadata(): ModelMetadata | undefined;
    getFieldsMetadata(): Record<string, FieldMetadata>;
    getIndexesMetadata(): IndexMetadata[];
    getRelationsMetadata(): Record<string, RelationMetadata>;
  }
}

export {};