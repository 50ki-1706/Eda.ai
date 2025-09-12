/**

 * @interface RawNodeDatum
 * @property {string} name - label
 * @property {Record<string, string>} [attributes] - 親のノードのid
 * @property {RawNodeDatum[]} [children] - 子ノードの配列（再帰構造）
 */
export interface RawNodeDatum {
  readonly name: string;
  readonly attributes?: Record<string, string>;
  readonly children?: RawNodeDatum[];
}
