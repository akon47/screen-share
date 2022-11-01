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

// 커서 페이징 조회 응답을 위한 Dto
export interface SliceDto<T extends DataTransferObject> extends DataTransferObject {
  // 조회된 데이터
  readonly data: Array<T>;
  // 조회된 데이터 수
  readonly size: number;
  // 조회된 데이터가 없는지 여부
  readonly empty: boolean;
  // 첫 페이지 여부
  readonly first: boolean;
  // 마지막 페이지 여부
  readonly last: boolean;
  // 다음 페이지 조회를 위한 커서 Id
  readonly cursorId: string | null;
}
