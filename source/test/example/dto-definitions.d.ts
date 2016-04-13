declare const enum Services{
  Self = 4,
  Car,
  Motorway
}

declare const enum Moods{
  Happy,
  Sad = 4,
  Frowning
}

interface ISimpleResponse{
  name: string;
  alias?: string;
  rep: number;
  dateJoined: string;
  emails: string[];
  mobiles?: string[];
  mood?:Moods;

  /** invalid for DTO!!! */
  exclude(): void;
}

interface ILocation {
  x: number;
  y: number;
}

interface ICurrentAndHistory<T> {
  current?: T;
  history: T[];
}

interface IComplexResponse extends ICurrentAndHistory<ILocation> {
  simple: ISimpleResponse;
}

interface IGenericAnonResponse<TKey, TData> {
  name: string;
  data: {key: TKey, data: TData };
}

interface IThingUnionIntersectionResponse {
  id: number | string;
  response: ISimpleResponse & IComplexResponse;
}

interface IThingResponse {
  name: string;
  service: Services;
  subs: IAnonTypes[];
}

interface IAnonTypes {
  /** invalid for DTO!!! */
  exclude: () => {another: IExtra};

  anonInclude1: {another: IExtra | IAnotherExtra};
  anonInclude2: {another: boolean, others: {another: IAnotherExtra[]}};
}
