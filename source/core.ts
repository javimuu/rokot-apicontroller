
// type ApiRequestVoid<TBody> = IApiRequest<TBody, void, void, void>
// type ApiRequestVoidParams<TBody, TParams> = IApiRequest<TBody, void, TParams, void>
// type ApiRequestVoidQs<TBody, TQuery> = IApiRequest<TBody, void, void, TQuery>
// type ApiRequestVoidParamsQs<TBody, TParams, TQuery> = IApiRequest<TBody, void, TParams, TQuery>
//
// type ApiRequest<TBody, TResponse> = IApiRequest<TBody, TResponse, void, void>
// type ApiRequestParams<TBody, TResponse, TParams> = IApiRequest<TBody, TResponse, TParams, void>
// type ApiRequestQs<TBody, TResponse, TQuery> = IApiRequest<TBody, TResponse, void, TQuery>
// type ApiRequestParamsQs<TBody, TResponse, TParams, TQuery> = IApiRequest<TBody, TResponse, TParams, TQuery>

export interface IApiRequestHandler<TBody, TResponse, TParams, TQuery>{
  (req: IApiRequest<TBody, TResponse, TParams, TQuery>): void;
}

export type IApiVoidRequest<TResponse, TParams, TQuery> = IApiRequest<void, TResponse, TParams, TQuery>

export interface IApiRequest<TBody, TResponse, TParams, TQuery>{
  send(statusCode: number, response?:TResponse);
  body: TBody;
  params: TParams;
  query: TQuery;
  log: any;
  userAs<T>(): T;
  originalAs<T>(): T;
}

export interface IApi {
  errors: string[]
  controllers: IApiController[];
  /** only available at designtime */
//  referenceTypes?: IApiType[];
}

// export const enum TypeKind{
//   Unknown,
//   Simple,
//   InterfaceRef,
//   EnumRef,
//   Interface,
//   Enum,
//   Union,
//   Intersection,
//   Anonymous,
//   TypeArg,
//   TypeParam,
// }

// export interface IApiType{
//   name?: string;
//   isArray?: boolean;
//   kind: TypeKind;
//   args?: IApiType[];
//   extends?: IApiType[];
//   subTypes?: IApiType[];
//   members?: IApiNamedType[]
//   //code?: string;
// }
//
// export interface IApiNamedType{
//   name: string;
//   value?: number;
//   optional?: boolean;
//   type?: IApiType;
// }

export interface IApiController {
  name: string;
  routes: IApiControllerRoute[];
  /** only available at runtime */
  controllerClass?: INewableApiController;
}

export interface INewable<T>{
  new(...args:any[]): T
}
export interface IMiddewareFunction {
  key:string
  func: Function
}
export interface INewableConstructor<TNew extends INewable<T>, T>{
  (newable: TNew, name: string): T
}

export interface INewableApiController extends INewable<IApiController>{}

export interface INewableApiControllerConstructor extends INewableConstructor<INewableApiController, IApiController>{
}

// export interface IApiControllerRouteTypes {
//   request : IApiType;
//   response : IApiType;
//   params: IApiType;
//   queryString: IApiType;
// }

export interface IApiControllerRoute {
  name: string
  memberName: string
  routeVerbs: IApiControllerRouteVerb[]
  middlewares?: string[]
  func: Function
//  types?: IApiControllerRouteTypes;
}

export interface IApiControllerRouteVerb {
  route: string;
  verb: string
}

export interface IApiControllerCompiler{
  compile(apiControllers: IApiController[], middlewareKeys: string[]): IApi
}

export interface IRouteBuilder {
  build(): IApi
}
