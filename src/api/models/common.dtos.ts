// DTO를 나타내는 최상위 인터페이스
export default interface DataTransferObject {
}

// 서버 에러 응답 Dto
export interface ErrorResponseDto extends DataTransferObject {
  // 에러 이름(코드)
  readonly name: string;
  // 에러 메시지
  readonly message: string;
}