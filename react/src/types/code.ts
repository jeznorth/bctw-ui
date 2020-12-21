/// represents a code and code header coming from backend
interface ICode {
  id: number;
  code: string;
  description: string;
}

// interface ICodeHeader extends ICode {
//   title: string;
// }

export type {
  ICode,
  // ICodeHeader,
};