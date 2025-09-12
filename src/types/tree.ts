/**
 * カスタムRawNodeDatum型定義
 * react-d3-treeのRawNodeDatumを拡張し、attributesをstringのみに限定
 */
export interface RawNodeDatum {
  name: string;
  attributes?: Record<string, string>;
  children?: RawNodeDatum[];
}
